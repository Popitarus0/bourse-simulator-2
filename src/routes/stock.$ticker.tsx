import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Star } from "lucide-react";
import { AppShell, Delta } from "@/components/AppShell";
import { AreaChart } from "@/components/charts";
import { useMarket } from "@/lib/store";
import { COMPANIES, change, fmt } from "@/lib/market";

export const Route = createFileRoute("/stock/$ticker")({
  loader: ({ params }) => {
    const c = COMPANIES.find((x) => x.ticker === params.ticker);
    if (!c) throw notFound();
    return { name: c.name, ticker: c.ticker, description: c.description };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.ticker} · ${loaderData.name} — NEXUS MARKETS` },
          { name: "description", content: loaderData.description },
          { property: "og:title", content: `${loaderData.ticker} — ${loaderData.name}` },
          { property: "og:description", content: loaderData.description },
        ]
      : [{ title: "Action introuvable" }, { name: "robots", content: "noindex" }],
  }),
  notFoundComponent: () => <AppShell><p className="text-muted-foreground">Action introuvable.</p></AppShell>,
  errorComponent: () => <AppShell><p className="text-muted-foreground">Erreur de chargement.</p></AppShell>,
  component: StockPage,
});

const RANGES = [{ l: "1H", n: 40 }, { l: "4H", n: 100 }, { l: "MAX", n: 160 }];

function StockPage() {
  const { ticker } = Route.useParams();
  const { byTicker, account, toggleWatch, news, cancelOrder } = useMarket();
  const s = byTicker(ticker)!;
  const [range, setRange] = useState(1);
  const data = s.history.slice(-RANGES[range].n);
  const hi = Math.max(...s.history), lo = Math.min(...s.history);
  const h = account.holdings[ticker];
  const related = news.filter((n) => n.ticker === ticker).slice(0, 5);
  const sma20 = useMemo(() => average(data.slice(-20)), [data]);
  const sma50 = useMemo(() => average(data.slice(-50)), [data]);
  const rsi = useMemo(() => calculateRsi(data), [data]);

  return (
    <AppShell>
      <div className="nexus-page nexus-stock relative">
        <div className="financial-grid-ambient" aria-hidden="true" />
        <div className="relative z-10 grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <div className="panel p-5">
            <div className="flex flex-wrap items-start gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="rounded border px-1.5 py-0.5">{s.sector}</span> NXSE</div>
                <h1 className="mt-1 text-2xl font-semibold">{s.name} <span className="text-muted-foreground">{s.ticker}</span></h1>
                <div className="mt-2 flex items-baseline gap-3">
                  <span key={s.price} className={`num rounded px-1 text-4xl ${s.dir === 1 ? "flash-up" : s.dir === -1 ? "flash-down" : ""}`}>{fmt(s.price)}</span>
                  <span className="text-sm text-muted-foreground">NX$</span>
                  <Delta v={change(s)} className="text-lg" />
                </div>
              </div>
              <button onClick={() => toggleWatch(ticker)} className="ml-auto flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-accent">
                <Star className={`h-4 w-4 ${account.watchlist.includes(ticker) ? "fill-gold text-gold" : ""}`} /> Watchlist
              </button>
            </div>
            <div className="mt-4 flex gap-1">
              {RANGES.map((r, i) => (
                <button key={r.l} onClick={() => setRange(i)} className={`rounded px-2.5 py-1 text-xs ${range === i ? "bg-accent text-foreground" : "text-muted-foreground"}`}>{r.l}</button>
              ))}
            </div>
            <div className="mt-2"><AreaChart data={data} /></div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Indicator label="SMA 20" value={fmt(sma20)} />
              <Indicator label="SMA 50" value={fmt(sma50)} />
              <Indicator label="RSI 14" value={rsi.toFixed(1)} tone={rsi >= 70 ? "down" : rsi <= 30 ? "up" : undefined} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ["Ouverture", fmt(s.open)], ["Plus haut", fmt(hi)], ["Plus bas", fmt(lo)], ["Volume", `${(s.volume / 1e6).toFixed(2)}M`],
              ["Capitalisation", `${fmt((s.price * s.shares) / 1000, 1)} Md`], ["Actions", `${s.shares} M`], ["Volatilité", `${(s.vol * 100).toFixed(1)} %`], ["PER", (12 + s.vol * 600).toFixed(1)],
            ].map(([k, v]) => (
              <div key={k} className="panel p-3"><div className="text-xs text-muted-foreground">{k}</div><div className="num mt-1">{v}</div></div>
            ))}
          </div>
          <div className="panel p-5">
            <h2 className="text-sm font-semibold">À propos</h2>
            <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>
            <h2 className="mt-5 text-sm font-semibold">Actualités liées</h2>
            {related.length === 0 && <p className="mt-2 text-sm text-muted-foreground">Aucune actualité récente.</p>}
            {related.map((n) => (
              <div key={n.id} className="mt-2 flex items-center justify-between gap-3 text-sm"><span>{n.title}</span><Delta v={n.impact} /></div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <OrderTicket ticker={ticker} />
          {account.pendingOrders.filter((o) => o.ticker === ticker).length > 0 && (
            <div className="panel p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Ordres en attente</div>
              <div className="mt-3 space-y-2">
                {account.pendingOrders.filter((o) => o.ticker === ticker).map((o) => (
                  <div key={o.id} className="flex items-center gap-2 rounded-lg border bg-background/30 p-2 text-xs">
                    <span className={o.side === "buy" ? "text-up" : "text-down"}>{o.side === "buy" ? "ACHAT" : "VENTE"}</span>
                    <span className="flex-1">{o.type === "limit" ? "Limite" : "Stop"} · {o.qty} · {fmt(o.trigger)} NX$</span>
                    <button onClick={() => cancelOrder(o.id)} className="text-muted-foreground hover:text-foreground">Annuler</button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="panel p-4 text-sm">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Votre position</div>
            {h ? (
              <div className="mt-3 space-y-1.5">
                <Row k="Quantité" v={String(h.qty)} />
                <Row k="Prix moyen" v={fmt(h.avg)} />
                <Row k="Valeur" v={fmt(h.qty * s.price)} />
                <div className="flex justify-between"><span className="text-muted-foreground">P&L</span><span className={`num ${s.price >= h.avg ? "text-up" : "text-down"}`}>{fmt((s.price - h.avg) * h.qty)}</span></div>
              </div>
            ) : <p className="mt-3 text-muted-foreground">Aucune position. <Link to="/portfolio" className="text-primary">Portefeuille →</Link></p>}
          </div>
        </div>
        </div>
      </div>
    </AppShell>
  );
}

const Row = ({ k, v }: { k: string; v: string }) => <div className="flex justify-between"><span className="text-muted-foreground">{k}</span><span className="num">{v}</span></div>;

function OrderTicket({ ticker }: { ticker: string }) {
  const { byTicker, trade, account, placeOrder } = useMarket();
  const s = byTicker(ticker)!;
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [mode, setMode] = useState<"market" | "limit" | "stop">("market");
  const [trigger, setTrigger] = useState(s.price);
  const [qty, setQty] = useState(10);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const total = qty * (mode === "market" ? s.price : trigger);
  const max = side === "buy" ? Math.floor(account.cash / s.price) : account.holdings[ticker]?.qty ?? 0;

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      if (mode !== "market") {
        const err = placeOrder({ ticker, side, type: mode, qty, trigger });
        setMsg(err ? { ok: false, t: err } : { ok: true, t: `${mode === "limit" ? "Ordre limite" : "Stop"} placé à ${fmt(trigger)} NX$.` });
        return;
      }
      const err = await trade(ticker, side, qty);
      setMsg(err
        ? { ok: false, t: err }
        : { ok: true, t: `Ordre exécuté : ${side === "buy" ? "achat" : "vente"} de ${qty} ${ticker}. Le prix d'exécution est validé par le serveur.` });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel p-4">
      <div className="grid grid-cols-2 rounded-md bg-muted p-1 text-sm">
        <button onClick={() => setSide("buy")} className={`rounded py-1.5 font-medium ${side === "buy" ? "bg-up text-background" : "text-muted-foreground"}`}>Acheter</button>
        <button onClick={() => setSide("sell")} className={`rounded py-1.5 font-medium ${side === "sell" ? "bg-down text-background" : "text-muted-foreground"}`}>Vendre</button>
      </div>
      <div className="mt-4 grid grid-cols-3 rounded-md bg-muted p-1 text-xs">
        {(["market", "limit", "stop"] as const).map((m) => <button key={m} onClick={() => setMode(m)} className={`rounded py-1.5 ${mode === m ? "bg-background font-medium" : "text-muted-foreground"}`}>{m === "market" ? "Marché" : m === "limit" ? "Limite" : "Stop"}</button>)}
      </div>
      {mode !== "market" && (
        <label className="mt-4 block text-xs text-muted-foreground">
          Prix de déclenchement
          <div className="mt-1 flex gap-2">
            <input type="number" min={0.01} step={0.01} value={trigger} onChange={(e) => setTrigger(Math.max(0.01, +e.target.value))} className="num w-full rounded-md border bg-background px-3 py-2 outline-none focus:border-primary" />
            <button onClick={() => setTrigger(s.price)} className="rounded-md border px-3 text-xs hover:bg-accent">Cours</button>
          </div>
        </label>
      )}
      <label className="mt-4 block text-xs text-muted-foreground">Quantité</label>
      <div className="mt-1 flex gap-2">
        <input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(0, Math.floor(+e.target.value)))} className="num w-full rounded-md border bg-background px-3 py-2 outline-none focus:border-primary" />
        <button onClick={() => setQty(max)} className="rounded-md border px-3 text-xs hover:bg-accent">Max</button>
      </div>
      <div className="mt-4 space-y-1.5 text-sm">
        <Row k="Prix" v={fmt(s.price)} />
        <Row k="Total estimé" v={`${fmt(total)} NX$`} />
        <Row k="Disponible" v={side === "buy" ? fmt(account.cash) : `${max} titres`} />
      </div>
      <button onClick={submit} disabled={qty <= 0 || busy} className={`mt-4 w-full rounded-md py-2.5 text-sm font-semibold text-background transition hover:opacity-90 disabled:opacity-40 ${side === "buy" ? "bg-up" : "bg-down"}`}>
        {busy ? "Exécution…" : `${side === "buy" ? "Acheter" : "Vendre"} ${qty} ${ticker}`}
      </button>
      {msg && <p className={`mt-3 text-xs ${msg.ok ? "text-up" : "text-down"}`}>{msg.t}</p>}
    </div>
  );
}

function average(values: number[]) { return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0; }
function calculateRsi(values: number[]) {
  if (values.length < 2) return 50;
  const slice = values.slice(-15);
  let gains = 0, losses = 0;
  for (let i = 1; i < slice.length; i++) { const d = slice[i] - slice[i - 1]; if (d >= 0) gains += d; else losses -= d; }
  if (losses === 0) return 100;
  return 100 - 100 / (1 + gains / losses);
}
function Indicator({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  return <div className="rounded-lg border bg-background/30 p-2"><div className="text-[9px] uppercase text-muted-foreground">{label}</div><div className={`num mt-1 text-xs ${tone === "up" ? "text-up" : tone === "down" ? "text-down" : ""}`}>{value}</div></div>;
}

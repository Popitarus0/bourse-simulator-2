import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Star, TrendingDown, TrendingUp } from "lucide-react";
import { AppShell, Delta } from "@/components/AppShell";
import { Sparkline } from "@/components/charts";
import { useMarket } from "@/lib/store";
import { change, fmt } from "@/lib/market";

export const Route = createFileRoute("/market")({
  head: () => ({
    meta: [
      { title: "Marché — NEXUS MARKETS" },
      { name: "description", content: "Toutes les actions fictives cotées en temps réel." },
      { property: "og:title", content: "Marché — NEXUS MARKETS" },
      { property: "og:description", content: "Cotations en direct des sociétés fictives." },
    ],
  }),
  component: Market,
});

function Market() {
  const { stocks, account, toggleWatch } = useMarket();
  const [sector, setSector] = useState("Tous");
  const [q, setQ] = useState("");
  const sectors = ["Tous", ...Array.from(new Set(stocks.map((s) => s.sector)))];
  const list = stocks.filter((s) => (sector === "Tous" || s.sector === sector) && (s.ticker + s.name).toLowerCase().includes(q.toLowerCase()));
  const sorted = [...stocks].sort((a, b) => change(b) - change(a));
  const watch = stocks.filter((s) => account.watchlist.includes(s.ticker));

  const breadth = useMemo(() => ({
    up: stocks.filter((s) => change(s) > 0.001).length,
    down: stocks.filter((s) => change(s) < -0.001).length,
    flat: stocks.filter((s) => Math.abs(change(s)) <= 0.001).length,
  }), [stocks]);

  const sectorPulse = useMemo(() => {
    const groups = new Map<string, { total: number; count: number }>();
    for (const s of stocks) {
      const current = groups.get(s.sector) ?? { total: 0, count: 0 };
      current.total += change(s);
      current.count += 1;
      groups.set(s.sector, current);
    }
    return [...groups.entries()]
      .map(([name, value]) => ({ name, change: value.total / value.count }))
      .sort((a, b) => b.change - a.change);
  }, [stocks]);

  return (
    <AppShell>
      <div className="grid gap-4 md:grid-cols-3">
        <MoverCard title="Plus fortes hausses" items={sorted.slice(0, 3)} />
        <MoverCard title="Plus fortes baisses" items={sorted.slice(-3).reverse()} />
        <MoverCard title="Watchlist" items={watch.slice(0, 3)} empty="Ajoutez des étoiles" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="panel p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Market breadth</div>
              <div className="mt-1 text-sm">État général du marché</div>
            </div>
            <span className="text-xs text-muted-foreground">{stocks.length} titres</span>
          </div>
          <div className="flex h-2 overflow-hidden rounded-full bg-muted">
            <div className="bg-up transition-all" style={{ width: `${(breadth.up / stocks.length) * 100}%` }} />
            <div className="bg-muted-foreground/40 transition-all" style={{ width: `${(breadth.flat / stocks.length) * 100}%` }} />
            <div className="bg-down transition-all" style={{ width: `${(breadth.down / stocks.length) * 100}%` }} />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
            <div><div className="flex items-center gap-1.5 text-up"><TrendingUp className="h-3.5 w-3.5" />Hausses</div><div className="num mt-1">{breadth.up}</div></div>
            <div><div className="text-muted-foreground">Stables</div><div className="num mt-1">{breadth.flat}</div></div>
            <div><div className="flex items-center gap-1.5 text-down"><TrendingDown className="h-3.5 w-3.5" />Baisses</div><div className="num mt-1">{breadth.down}</div></div>
          </div>
        </div>

        <div className="panel p-4">
          <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Performance sectorielle</div>
          <div className="space-y-2.5">
            {sectorPulse.slice(0, 4).map((s) => (
              <div key={s.name} className="flex items-center gap-3 text-sm">
                <span className="min-w-0 flex-1 truncate">{s.name}</span>
                <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                  <div className={s.change >= 0 ? "h-full bg-up" : "h-full bg-down"} style={{ width: `${Math.min(100, Math.max(8, Math.abs(s.change) * 1200))}%` }} />
                </div>
                <Delta v={s.change} className="w-16 text-right text-xs" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel mt-4">
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          {sectors.map((s) => (
            <button key={s} onClick={() => setSector(s)} className={`rounded-md px-3 py-1 text-xs transition ${sector === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}>{s}</button>
          ))}
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" className="ml-auto w-44 rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="w-8" /><th className="p-3 text-left font-medium">Symbole</th><th className="p-3 text-left font-medium">Secteur</th>
                <th className="p-3 text-right font-medium">Cours</th><th className="p-3 text-right font-medium">Var.</th>
                <th className="hidden p-3 text-right font-medium md:table-cell">Volume</th><th className="hidden p-3 text-right font-medium lg:table-cell">Capitalisation</th><th className="p-3 text-right font-medium">Tendance</th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.ticker} className="border-b last:border-0 hover:bg-accent/40">
                  <td className="pl-3"><button onClick={() => toggleWatch(s.ticker)} aria-label="Watchlist"><Star className={`h-4 w-4 ${account.watchlist.includes(s.ticker) ? "fill-gold text-gold" : "text-muted-foreground"}`} /></button></td>
                  <td className="p-3"><Link to="/stock/$ticker" params={{ ticker: s.ticker }} className="block"><div className="font-semibold">{s.ticker}</div><div className="text-xs text-muted-foreground">{s.name}</div></Link></td>
                  <td className="p-3 text-muted-foreground">{s.sector}</td>
                  <td key={s.price} className={`num p-3 text-right ${s.dir === 1 ? "flash-up" : s.dir === -1 ? "flash-down" : ""}`}>{fmt(s.price)}</td>
                  <td className="p-3 text-right"><Delta v={change(s)} /></td>
                  <td className="num hidden p-3 text-right text-muted-foreground md:table-cell">{(s.volume / 1e6).toFixed(2)}M</td>
                  <td className="num hidden p-3 text-right text-muted-foreground lg:table-cell">{fmt((s.price * s.shares) / 1000, 1)} Md</td>
                  <td className="p-3"><div className="flex justify-end"><Sparkline data={s.history.slice(-50)} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}

function MoverCard({ title, items, empty }: { title: string; items: ReturnType<typeof useMarket>["stocks"]; empty?: string }) {
  return (
    <div className="panel p-4">
      <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">{title}</div>
      {items.length === 0 && <div className="py-6 text-center text-sm text-muted-foreground">{empty}</div>}
      {items.map((s) => (
        <Link key={s.ticker} to="/stock/$ticker" params={{ ticker: s.ticker }} className="flex items-center justify-between py-1.5 text-sm">
          <span className="font-semibold">{s.ticker}</span>
          <span className="num text-muted-foreground">{fmt(s.price)}</span>
          <Delta v={change(s)} />
        </Link>
      ))}
    </div>
  );
}

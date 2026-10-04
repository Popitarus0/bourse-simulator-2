import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Star } from "lucide-react";
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

  return (
    <AppShell>
      <div className="grid gap-4 md:grid-cols-3">
        <MoverCard title="Plus fortes hausses" items={sorted.slice(0, 3)} />
        <MoverCard title="Plus fortes baisses" items={sorted.slice(-3).reverse()} />
        <MoverCard title="Watchlist" items={watch.slice(0, 3)} empty="Ajoutez des étoiles" />
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

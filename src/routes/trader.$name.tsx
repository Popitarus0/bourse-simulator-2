import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, Delta } from "@/components/AppShell";
import { START_CASH, useMarket } from "@/lib/store";
import { fmt } from "@/lib/market";
import { traderStats } from "@/lib/profiles";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/trader/$name")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.name} — Profil trader · NEXUS MARKETS` },
      { name: "description", content: `Statistiques et portefeuille de ${params.name}.` },
      { property: "og:title", content: `${params.name} — NEXUS MARKETS` },
      { property: "og:description", content: `Découvrez la performance de ${params.name}.` },
    ],
  }),
  component: Trader,
});

function RealTraderProfile({ trader }: { trader: import("@/lib/store").AdminTrader }) {
  const all = useMarket().adminTraders.sort((a, b) => b.value - a.value);
  return <AppShell>
    <Link to="/leaderboard" className="text-sm text-muted-foreground">← Classement</Link>
    <div className="mt-3 mb-4 flex items-center gap-4"><div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-xl font-semibold">{trader.name.slice(0, 2).toUpperCase()}</div><div><h1 className="text-xl font-semibold">{trader.name}</h1><p className="text-sm text-muted-foreground">Compte trader NEXUS MARKETS</p></div></div>
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <div className="panel p-4"><div className="text-xs text-muted-foreground">Patrimoine</div><div className="num mt-1 text-lg">{fmt(trader.value,0)} NX$</div></div>
      <div className="panel p-4"><div className="text-xs text-muted-foreground">Liquidités</div><div className="num mt-1 text-lg">{fmt(trader.cash,0)} NX$</div></div>
      <div className="panel p-4"><div className="text-xs text-muted-foreground">Positions</div><div className="num mt-1 text-lg">{Object.keys(trader.holdings).length}</div></div>
      <div className="panel p-4"><div className="text-xs text-muted-foreground">Transactions</div><div className="num mt-1 text-lg">{trader.txs.length}</div></div>
    </div>
    <div className="panel mt-4 divide-y"><div className="px-4 py-3 font-semibold">Positions</div>{Object.entries(trader.holdings).map(([ticker,h]) => <Link key={ticker} to="/stock/$ticker" params={{ticker}} className="flex justify-between px-4 py-2 text-sm hover:bg-accent"><span>{ticker}</span><span className="num">{h.qty} titres · {fmt(h.avg)} NX$</span></Link>)}</div>
  </AppShell>;
}

function Trader() {
  const { name } = Route.useParams();
  const { players, stocks, portfolioValue, adminTraders } = useMarket();
  const { isAdmin } = useAuth();
  const p = players.find((x) => x.name === name);
  const real = isAdmin ? adminTraders.find((x) => x.name === name) : undefined;
  if (!p && !real) return <AppShell><p className="text-muted-foreground">Trader introuvable. <Link to="/leaderboard" className="text-primary">Retour</Link></p></AppShell>;
  if (!p && real) return <RealTraderProfile trader={real} />;
  const st = traderStats(name, p.value, stocks);
  const all = [...players, { name: "__you", value: portfolioValue }].sort((a, b) => b.value - a.value);
  const box = (l: string, v: React.ReactNode) => <div className="panel p-4"><div className="text-xs text-muted-foreground">{l}</div><div className="num mt-1 text-lg">{v}</div></div>;
  return (
    <AppShell>
      <Link to="/leaderboard" className="text-sm text-muted-foreground">← Classement</Link>
      <div className="mt-3 mb-4 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-xl font-semibold">{name.slice(0, 2).toUpperCase()}</div>
        <div><h1 className="text-xl font-semibold">{name}</h1><p className="text-sm text-muted-foreground">Style {st.style} · inscrit le {new Date(st.joined).toLocaleDateString("fr-FR")}</p></div>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {box("Valeur totale", `${fmt(p.value, 0)} NX$`)}
        {box("Performance", <Delta v={(p.value - START_CASH) / START_CASH} />)}
        {box("Rang", `#${all.findIndex((x) => x.name === name) + 1}`)}
        {box("Transactions", st.trades)}
        {box("Taux de réussite", `${(st.winRate * 100).toFixed(1)} %`)}
        {box("Liquidités", `${fmt(st.cash, 0)} NX$`)}
      </div>
      <div className="panel mt-4 divide-y">
        <div className="px-4 py-3 font-semibold">Positions principales</div>
        {st.holdings.map((h) => (
          <Link key={h.ticker} to="/stock/$ticker" params={{ ticker: h.ticker }} className="flex justify-between px-4 py-2 text-sm hover:bg-accent">
            <span>{h.ticker} · {h.name}</span><span className="num">{fmt(h.amount, 0)} NX$</span>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}

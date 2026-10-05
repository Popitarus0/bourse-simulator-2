import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, Delta } from "@/components/AppShell";
import { START_CASH, useMarket } from "@/lib/store";
import { fmt } from "@/lib/market";
import { traderStats } from "@/lib/profiles";

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

function Trader() {
  const { name } = Route.useParams();
  const { players, stocks, portfolioValue } = useMarket();
  const p = players.find((x) => x.name === name);
  if (!p) return <AppShell><p className="text-muted-foreground">Trader introuvable. <Link to="/leaderboard" className="text-primary">Retour</Link></p></AppShell>;
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

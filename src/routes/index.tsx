import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, ArrowRight } from "lucide-react";
import { TickerTape, Delta } from "@/components/AppShell";
import { AreaChart, Sparkline } from "@/components/charts";
import { useMarket } from "@/lib/store";
import { change, fmt } from "@/lib/market";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NEXUS MARKETS — La bourse fictive qui ne dort jamais" },
      { name: "description", content: "Tradez des entreprises fictives sur un marché vivant. 100 000 NX$ offerts, zéro argent réel." },
      { property: "og:title", content: "NEXUS MARKETS — Bourse fictive" },
      { property: "og:description", content: "Un marché boursier simulé, vivant et compétitif." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { stocks, players } = useMarket();
  const hero = stocks[0];
  const index = hero.history.map((_, i) => stocks.reduce((s, x) => s + x.history[i], 0) / stocks.length);
  const movers = [...stocks].sort((a, b) => Math.abs(change(b)) - Math.abs(change(a))).slice(0, 5);
  return (
    <div className="min-h-screen grid-bg">
      <header className="mx-auto flex h-16 max-w-7xl items-center px-4">
        <div className="flex items-center gap-2 font-semibold"><Activity className="h-5 w-5 text-gold" />NEXUS<span className="font-normal text-muted-foreground">MARKETS</span></div>
        <Link to="/market" className="ml-auto rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90">Ouvrir le terminal</Link>
      </header>
      <TickerTape />
      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-16 lg:grid-cols-[1.1fr_1fr] lg:py-24">
        <div className="flex flex-col justify-center">
          <span className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-up" /> Marché ouvert · simulation 100 % fictive
          </span>
          <h1 className="text-5xl font-semibold tracking-tight md:text-7xl">NEXUS<br /><span className="text-gold">MARKETS</span></h1>
          <p className="mt-6 max-w-md text-lg text-muted-foreground">La bourse qui ne dort jamais. 14 entreprises fictives, des cours qui bougent à chaque seconde, et 100 000 NX$ pour prouver votre instinct.</p>
          <div className="mt-8 flex gap-3">
            <Link to="/market" className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:opacity-90">Commencer à trader <ArrowRight className="h-4 w-4" /></Link>
            <Link to="/leaderboard" className="rounded-md border px-5 py-3 text-sm hover:bg-accent">Voir le classement</Link>
          </div>
          <div className="mt-12 grid max-w-md grid-cols-3 gap-6 text-sm">
            <div><div className="num text-2xl">{stocks.length}</div><div className="text-muted-foreground">Sociétés cotées</div></div>
            <div><div className="num text-2xl">{players.length + 1}</div><div className="text-muted-foreground">Traders actifs</div></div>
            <div><div className="num text-2xl text-gold">0 €</div><div className="text-muted-foreground">Argent réel</div></div>
          </div>
        </div>
        <div className="panel p-5">
          <div className="flex items-baseline justify-between">
            <div><div className="text-xs text-muted-foreground">Indice NEXUS 14</div><div className="num text-3xl">{fmt(index[index.length - 1])}</div></div>
            <Delta v={(index[index.length - 1] - index[index.length - 40]) / index[index.length - 40]} />
          </div>
          <div className="mt-4"><AreaChart data={index} height={220} /></div>
          <div className="mt-4 divide-y">
            {movers.map((s) => (
              <Link key={s.ticker} to="/stock/$ticker" params={{ ticker: s.ticker }} className="flex items-center gap-4 py-2.5 text-sm hover:bg-accent/40">
                <span className="w-14 font-semibold">{s.ticker}</span>
                <span className="flex-1 truncate text-muted-foreground">{s.name}</span>
                <Sparkline data={s.history.slice(-40)} width={70} height={20} />
                <span className="num w-20 text-right">{fmt(s.price)}</span>
                <Delta v={change(s)} className="w-20 text-right" />
              </Link>
            ))}
          </div>
        </div>
      </section>
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">Toutes les entreprises, valeurs et événements sont fictifs. Aucun argent réel n'est utilisé.</footer>
    </div>
  );
}

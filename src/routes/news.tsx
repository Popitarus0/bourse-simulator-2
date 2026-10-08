import { createFileRoute, Link } from "@tanstack/react-router";
import { useHydrated } from "@tanstack/react-router";
import { AppShell, Delta } from "@/components/AppShell";
import { useMarket } from "@/lib/store";

export const Route = createFileRoute("/news")({
  head: () => ({
    meta: [
      { title: "Actualités — NEXUS MARKETS" },
      { name: "description", content: "Le fil d'actualités qui fait bouger les marchés fictifs." },
      { property: "og:title", content: "Actualités — NEXUS MARKETS" },
      { property: "og:description", content: "Les événements qui font bouger le marché." },
    ],
  }),
  component: News,
});

function News() {
  const { news } = useMarket();
  const hydrated = useHydrated();
  return (
    <AppShell>
      <div className="nexus-page nexus-news relative">
        <div className="news-glow" aria-hidden="true" />
        <div className="relative z-10">
      <div className="mb-4 flex items-center gap-2"><h1 className="text-xl font-semibold">Fil d'actualités</h1><span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-down" />EN DIRECT</span></div>
      <div className="panel divide-y">
        {news.map((n) => (
          <article key={n.id} className="flex flex-wrap items-center gap-3 p-4 animate-in fade-in slide-in-from-top-1">
            <span className="num w-14 text-xs text-muted-foreground">{hydrated ? new Date(n.time).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : ""}</span>
            <span className={`rounded px-2 py-0.5 text-[11px] ${n.category === "Macro" ? "bg-gold/15 text-gold" : "bg-accent text-muted-foreground"}`}>{n.category}</span>
            <p className="min-w-0 flex-1 text-sm">{n.title}</p>
            {n.ticker && <Link to="/stock/$ticker" params={{ ticker: n.ticker }} className="text-xs font-semibold text-primary">{n.ticker}</Link>}
            {n.impact !== 0 && <Delta v={n.impact} className="w-20 text-right text-xs" />}
          </article>
        ))}
        </div>
        </div>
      </div>
    </AppShell>
  );
}

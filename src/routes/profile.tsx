import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, CalendarDays, ShieldCheck, TrendingDown, TrendingUp, UserRound, WalletCards } from "lucide-react";
import { AppShell, Delta } from "@/components/AppShell";
import { START_CASH, useMarket } from "@/lib/store";
import { fmt } from "@/lib/market";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profil — NEXUS MARKETS" },
      { name: "description", content: "Profil, performance et activité du trader." },
      { property: "og:title", content: "Profil — NEXUS MARKETS" },
      { property: "og:description", content: "Profil, performance et activité du trader." },
    ],
  }),
  component: Profile,
});

function Profile() {
  const { profile, setProfile, account, portfolioValue, players, byTicker } = useMarket();
  const all = [...players, { name: "Vous", value: portfolioValue }].sort((a, b) => b.value - a.value);
  const rank = all.findIndex((p) => p.name === "Vous") + 1;
  const performance = (portfolioValue - START_CASH) / START_CASH;
  const buys = account.txs.filter((t) => t.side === "buy").length;
  const sells = account.txs.filter((t) => t.side === "sell").length;
  const initials = (profile.name || "TR").trim().slice(0, 2).toUpperCase();
  const rankProgress = all.length ? Math.max(0, Math.min(100, ((all.length - rank + 1) / all.length) * 100)) : 0;

  return (
    <AppShell>
      <div className="relative overflow-hidden rounded-2xl border bg-card shadow-2xl">
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-r from-primary/25 via-primary/5 to-gold/15" />
        <div className="relative px-5 pb-6 pt-7 md:px-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end">
            <div className="flex items-end gap-4">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border-4 border-card bg-gradient-to-br from-primary/35 to-primary/5 text-2xl font-bold shadow-xl">{initials}</div>
              <div className="pb-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="rounded-full bg-up/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-up">Trader actif</span>
                  <ShieldCheck className="h-4 w-4 text-up" aria-label="Compte protégé" />
                </div>
                <h1 className="text-2xl font-semibold tracking-tight">{profile.name || "Trader"}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{profile.bio || "Aucune bio renseignée."}</p>
              </div>
            </div>
            <div className="ml-auto grid grid-cols-2 gap-2 sm:grid-cols-4">
              <MiniMetric label="Patrimoine" value={fmt(portfolioValue) + " NX$"} />
              <MiniMetric label="Performance" value={<Delta v={performance} />} />
              <MiniMetric label="Rang" value={"#" + rank} />
              <MiniMetric label="Positions" value={Object.keys(account.holdings).length} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
        <section className="panel p-5">
          <SectionTitle icon={<UserRound className="h-4 w-4" />} title="Identité du trader" />
          <div className="mt-5 grid gap-4">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="profile-name" className="text-xs font-medium text-muted-foreground">Pseudo</label>
                <span className="text-[10px] text-muted-foreground">{profile.name.length}/32</span>
              </div>
              <input id="profile-name" value={profile.name} maxLength={32} onChange={(e) => setProfile({ name: e.target.value })} className="glass-input w-full text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/15" />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="profile-bio" className="text-xs font-medium text-muted-foreground">Bio</label>
                <span className="text-[10px] text-muted-foreground">{profile.bio.length}/160</span>
              </div>
              <textarea id="profile-bio" value={profile.bio} maxLength={160} rows={4} onChange={(e) => setProfile({ bio: e.target.value })} placeholder="Décris ta stratégie, ton style ou ton objectif…" className="glass-input w-full resize-none text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/15" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-up/15 bg-up/5 px-3 py-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-up" /> Les champs sont limités et enregistrés uniquement pour ton profil.
          </div>
        </section>

        <section className="panel p-5">
          <SectionTitle icon={<Activity className="h-4 w-4" />} title="Classement" />
          <div className="mt-5 flex items-end justify-between">
            <div><div className="text-4xl font-semibold tracking-tight">#{rank}</div><div className="mt-1 text-xs text-muted-foreground">sur {all.length} traders</div></div>
            <div className="text-right"><div className="num text-lg">{fmt(portfolioValue)} NX$</div><div className="text-xs text-muted-foreground">valeur du portefeuille</div></div>
          </div>
          <div className="mt-6 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-to-r from-primary to-gold transition-all" style={{ width: rankProgress + "%" }} /></div>
          <div className="mt-2 flex justify-between text-[10px] text-muted-foreground"><span>Dernier</span><span>Top trader</span></div>
        </section>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={<WalletCards />} label="Liquidités" value={fmt(account.cash) + " NX$"} />
        <Stat icon={<TrendingUp />} label="Achats" value={buys} />
        <Stat icon={<TrendingDown />} label="Ventes" value={sells} />
        <Stat icon={<CalendarDays />} label="Compte créé" value={new Date(profile.joined).toLocaleDateString("fr-FR")} />
      </div>

      <section className="panel mt-4 overflow-hidden">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div><h2 className="font-semibold">Positions</h2><p className="mt-0.5 text-xs text-muted-foreground">Répartition actuelle du portefeuille</p></div>
          <Link to="/portfolio" className="text-xs text-primary hover:underline">Voir le portefeuille →</Link>
        </div>
        {Object.entries(account.holdings).length ? (
          <div className="divide-y">
            {Object.entries(account.holdings).map(([ticker, holding]) => {
              const stock = byTicker(ticker);
              const price = stock?.price ?? 0;
              const value = price * holding.qty;
              const pnl = (price - holding.avg) * holding.qty;
              return (
                <Link key={ticker} to="/stock/$ticker" params={{ ticker }} className="flex items-center gap-4 px-5 py-3 transition hover:bg-accent/40">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold">{ticker.slice(0, 2)}</div>
                  <div className="min-w-0 flex-1"><div className="font-semibold">{ticker}</div><div className="truncate text-xs text-muted-foreground">{holding.qty} titres · PRU {fmt(holding.avg)}</div></div>
                  <div className="text-right"><div className="num text-sm">{fmt(value)} NX$</div><div className={"num text-xs " + (pnl >= 0 ? "text-up" : "text-down")}>{pnl >= 0 ? "+" : ""}{fmt(pnl)} NX$</div></div>
                </Link>
              );
            })}
          </div>
        ) : <div className="px-5 py-10 text-center text-sm text-muted-foreground">Aucune position ouverte pour le moment.</div>}
      </section>
    </AppShell>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return <div className="flex items-center gap-2 text-sm font-semibold">{icon}<span>{title}</span></div>;
}

function MiniMetric({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-xl border bg-background/45 px-3 py-2"><div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div><div className="num mt-1 text-sm font-medium">{value}</div></div>;
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return <div className="panel p-4"><div className="flex items-center gap-2 text-muted-foreground">{icon}<span className="text-xs">{label}</span></div><div className="num mt-2 text-xl">{value}</div></div>;
}

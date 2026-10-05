import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, Delta } from "@/components/AppShell";
import { START_CASH, useMarket } from "@/lib/store";
import { fmt } from "@/lib/market";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Mon profil — NEXUS MARKETS" },
      { name: "description", content: "Votre profil de trader et vos statistiques." },
      { property: "og:title", content: "Mon profil — NEXUS MARKETS" },
      { property: "og:description", content: "Statistiques et performance de votre compte." },
    ],
  }),
  component: Profile,
});

function Profile() {
  const { profile, setProfile, account, portfolioValue, players, byTicker } = useMarket();
  const all = [...players, { name: "Vous", value: portfolioValue }].sort((a, b) => b.value - a.value);
  const rank = all.findIndex((p) => p.name === "Vous") + 1;
  const sells = account.txs.filter((t) => t.side === "sell").length;
  return (
    <AppShell>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="panel p-5">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-xl font-semibold text-primary">{(profile.name || "?").slice(0, 2).toUpperCase()}</div>
          <label className="mb-1 block text-xs text-muted-foreground">Pseudo</label>
          <input value={profile.name} onChange={(e) => setProfile({ name: e.target.value })} className="mb-3 w-full rounded-md border bg-background px-3 py-2 text-sm" />
          <label className="mb-1 block text-xs text-muted-foreground">Bio</label>
          <textarea value={profile.bio} onChange={(e) => setProfile({ bio: e.target.value })} rows={3} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Votre stratégie…" />
        </div>
        <div className="grid grid-cols-2 gap-4 md:col-span-2">
          <Stat label="Valeur totale" value={`${fmt(portfolioValue)} NX$`} />
          <Stat label="Performance" value={<Delta v={(portfolioValue - START_CASH) / START_CASH} />} />
          <Stat label="Rang" value={`#${rank} / ${all.length}`} />
          <Stat label="Transactions" value={`${account.txs.length} (${sells} ventes)`} />
          <Stat label="Liquidités" value={`${fmt(account.cash)} NX$`} />
          <Stat label="Positions" value={Object.keys(account.holdings).length} />
        </div>
      </div>
      <div className="panel mt-4 divide-y">
        <div className="px-4 py-3 font-semibold">Positions</div>
        {Object.entries(account.holdings).map(([t, h]) => (
          <Link key={t} to="/stock/$ticker" params={{ ticker: t }} className="flex justify-between px-4 py-2 text-sm hover:bg-accent">
            <span>{t} · {h.qty}</span><span className="num">{fmt((byTicker(t)?.price ?? 0) * h.qty)} NX$</span>
          </Link>
        ))}
        {!Object.keys(account.holdings).length && <div className="px-4 py-3 text-sm text-muted-foreground">Aucune position.</div>}
      </div>
    </AppShell>
  );
}

export function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="panel p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="num mt-1 text-lg">{value}</div></div>;
}

import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  Activity, Award, BarChart3, CalendarDays, Check, CircleDollarSign, Crown,
  Grid3X3, LogIn, Palette, ShieldCheck, Sparkles, TrendingDown, TrendingUp,
  UserRound, WalletCards, Zap,
} from "lucide-react";
import { AppShell, Delta } from "@/components/AppShell";
import { START_CASH, useMarket, type ProfileAccent, type ProfileAvatar, type ProfileBanner, type ProfileStatus } from "@/lib/store";
import { fmt } from "@/lib/market";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profil — NEXUS MARKETS" },
      { name: "description", content: "Profil, personnalisation, performance et activité du trader." },
      { property: "og:title", content: "Profil — NEXUS MARKETS" },
      { property: "og:description", content: "Personnalisez votre identité de trader NEXUS MARKETS." },
    ],
  }),
  component: Profile,
});

const BANNERS: Record<ProfileBanner, string> = {
  aurora: "from-blue-500/35 via-violet-500/15 to-cyan-400/25",
  midnight: "from-slate-950 via-blue-950/70 to-indigo-900/35",
  sunset: "from-orange-500/30 via-fuchsia-500/15 to-rose-500/25",
  ice: "from-cyan-300/30 via-sky-500/15 to-blue-700/30",
};

const ACCENTS: Record<ProfileAccent, { label: string; dot: string; ring: string }> = {
  blue: { label: "Bleu", dot: "bg-blue-400", ring: "ring-blue-400/40" },
  violet: { label: "Violet", dot: "bg-violet-400", ring: "ring-violet-400/40" },
  cyan: { label: "Cyan", dot: "bg-cyan-400", ring: "ring-cyan-400/40" },
  green: { label: "Vert", dot: "bg-emerald-400", ring: "ring-emerald-400/40" },
  gold: { label: "Or", dot: "bg-amber-300", ring: "ring-amber-300/40" },
};

function Profile() {
  const { profile, setProfile, account, portfolioValue, players, byTicker } = useMarket();
  const { session } = useAuth();
  const profileName = profile.name || "Trader";
  const performance = (portfolioValue - START_CASH) / START_CASH;
  const safeHoldings = account?.holdings && typeof account.holdings === "object" ? account.holdings : {};
  const safeTxs = Array.isArray(account?.txs) ? account.txs : [];
  const all = [...(Array.isArray(players) ? players : []), { name: "Vous", value: portfolioValue }].sort((a, b) => b.value - a.value);
  const rank = Math.max(1, all.findIndex((p) => p.name === "Vous") + 1);
  const initials = profileName.trim().slice(0, 2).toUpperCase() || "NX";
  const accent = ACCENTS[profile.accent];
  const buys = safeTxs.filter((t) => t.side === "buy").length;
  const sells = safeTxs.filter((t) => t.side === "sell").length;
  const winPositions = Object.entries(safeHoldings).filter(([ticker, h]) => {
    const s = byTicker(ticker);
    return s ? s.price >= h.avg : false;
  }).length;
  const badges = [
    { icon: Zap, label: "Premier ordre", ok: safeTxs.length > 0 },
    { icon: BarChart3, label: "Diversifié", ok: Object.keys(safeHoldings).length >= 3 },
    { icon: TrendingUp, label: "Dans le vert", ok: performance > 0 },
    { icon: Crown, label: "Top 10", ok: rank <= 10 },
    { icon: Award, label: "Trader actif", ok: safeTxs.length >= 10 },
    { icon: ShieldCheck, label: "Compte protégé", ok: !!session },
  ];
  const recent = safeTxs.slice(0, 6);

  return (
    <AppShell>
      <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/45 shadow-2xl shadow-black/30 backdrop-blur-2xl">
        <div className={"absolute inset-0 bg-gradient-to-br " + BANNERS[profile.banner]} />
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative border-b border-white/10 px-5 pb-6 pt-5 md:px-8">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-white/55">
              <Sparkles className="h-3.5 w-3.5" /> Trader profile
            </div>
            <div className="rounded-full border border-white/10 bg-black/15 px-3 py-1 text-[10px] text-white/60 backdrop-blur-xl">
              {session ? "Compte connecté" : "Mode invité"}
            </div>
          </div>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-end">
            <div className={"relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-[2rem] border border-white/20 bg-white/10 text-2xl font-bold shadow-2xl ring-4 " + accent.ring + " backdrop-blur-xl"}>
              {profile.avatarStyle === "orb" && <div className="absolute inset-4 rounded-full bg-gradient-to-br from-white/70 via-primary/60 to-violet-500/70 blur-[1px]" />}
              {profile.avatarStyle === "grid" && <Grid3X3 className="h-12 w-12 text-white/80" />}
              {profile.avatarStyle === "rings" && <div className="h-14 w-14 rounded-full border-2 border-white/70 shadow-[0_0_0_8px_rgba(255,255,255,.08),0_0_0_16px_rgba(255,255,255,.04)]" />}
              {profile.avatarStyle === "mono" && <span className="relative text-3xl tracking-tight">{initials}</span>}
              {profile.avatarStyle !== "mono" && <span className="relative text-xl tracking-tight">{initials}</span>}
              <span className="absolute bottom-2 right-2 h-3 w-3 rounded-full border-2 border-slate-950 bg-emerald-400 shadow-lg shadow-emerald-400/40" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">{profile.status}</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-white/55">{profile.title}</span>
              </div>
              <h1 className="truncate text-3xl font-semibold tracking-tight text-white md:text-4xl">{profileName}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">{profile.bio || "Aucune bio pour le moment. Donne une identité à ton trader."}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-white/45">
                <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />Depuis {new Date(profile.joined).toLocaleDateString("fr-FR")}</span>
                <span>•</span>
                <span className="inline-flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" />{safeTxs.length} transaction{safeTxs.length > 1 ? "s" : ""}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-[460px]">
              <GlassMetric label="Patrimoine" value={fmt(portfolioValue) + " NX$"} />
              <GlassMetric label="Performance" value={<Delta v={performance} />} />
              <GlassMetric label="Rang" value={"#" + rank} />
              <GlassMetric label="Positions" value={Object.keys(safeHoldings).length} />
            </div>
          </div>
        </div>

        <div className="relative grid gap-px bg-white/10 lg:grid-cols-4">
          <HeroStat icon={<WalletCards />} label="Liquidités" value={fmt(account.cash) + " NX$"} />
          <HeroStat icon={<TrendingUp />} label="Achats" value={buys} />
          <HeroStat icon={<TrendingDown />} label="Ventes" value={sells} />
          <HeroStat icon={<Award />} label="Positions gagnantes" value={winPositions} />
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <section className="glass overflow-hidden rounded-[1.5rem] p-5 md:p-6">
            <SectionTitle icon={<Palette />} title="Personnalisation" subtitle="Ton profil doit te ressembler." />
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <Field label="Pseudo" hint={profileName.length + "/32"}>
                <input value={profileName} maxLength={32} onChange={(e) => setProfile({ name: e.target.value })} className="glass-input w-full text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15" />
              </Field>
              <Field label="Titre" hint={profile.title.length + "/40"}>
                <input value={profile.title} maxLength={40} onChange={(e) => setProfile({ title: e.target.value })} className="glass-input w-full text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15" />
              </Field>
              <Field label="Statut">
                <div className="grid grid-cols-3 gap-2">
                  {(["Actif", "En observation", "En pause"] as ProfileStatus[]).map((s) => (
                    <Choice key={s} active={profile.status === s} onClick={() => setProfile({ status: s })}>{s}</Choice>
                  ))}
                </div>
              </Field>
              <Field label="Avatar">
                <div className="grid grid-cols-4 gap-2">
                  {(["orb", "grid", "rings", "mono"] as ProfileAvatar[]).map((a) => (
                    <Choice key={a} active={profile.avatarStyle === a} onClick={() => setProfile({ avatarStyle: a })}>
                      {a === "orb" ? "Orb" : a === "grid" ? "Grid" : a === "rings" ? "Rings" : "Mono"}
                    </Choice>
                  ))}
                </div>
              </Field>
              <Field label="Couleur d'accent">
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(ACCENTS) as ProfileAccent[]).map((a) => (
                    <button key={a} onClick={() => setProfile({ accent: a })} title={ACCENTS[a].label} className={"flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 ring-2 ring-offset-2 ring-offset-transparent transition " + (profile.accent === a ? ACCENTS[a].ring : "ring-transparent")}>
                      <span className={"h-4 w-4 rounded-full " + ACCENTS[a].dot} />
                      {profile.accent === a && <Check className="absolute h-3.5 w-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Bannière">
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(BANNERS) as ProfileBanner[]).map((b) => (
                    <button key={b} onClick={() => setProfile({ banner: b })} className={"relative h-12 overflow-hidden rounded-xl border text-left text-[10px] uppercase tracking-wider transition " + (profile.banner === b ? "border-white/35 ring-2 ring-primary/30" : "border-white/10")}>
                      <div className={"absolute inset-0 bg-gradient-to-br " + BANNERS[b]} />
                      <span className="relative z-10 px-3 text-white/80">{b === "aurora" ? "Aurora" : b === "midnight" ? "Midnight" : b === "sunset" ? "Sunset" : "Ice"}</span>
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Bio" hint={profile.bio.length + "/160"} className="md:col-span-2">
                <textarea value={profile.bio} maxLength={160} rows={3} onChange={(e) => setProfile({ bio: e.target.value })} placeholder="Ta stratégie, ton objectif, ton style…" className="glass-input w-full resize-none text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15" />
              </Field>
            </div>
            {!session && (
              <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-primary/15 bg-primary/5 p-4 sm:flex-row sm:items-center">
                <div className="flex-1"><div className="text-sm font-medium">Sauvegarde ton identité</div><p className="mt-1 text-xs text-muted-foreground">En mode invité, tes préférences restent sur cet appareil. Connecte-toi pour les retrouver partout.</p></div>
                <Link to="/auth" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"><LogIn className="h-3.5 w-3.5" />Se connecter</Link>
              </div>
            )}
          </section>

          <section className="glass overflow-hidden rounded-[1.5rem]">
            <div className="border-b border-white/10 p-5">
              <SectionTitle icon={<Award />} title="Badges" subtitle="Des objectifs simples pour faire évoluer ton profil." />
            </div>
            <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-3">
              {badges.map((b) => {
                const Icon = b.icon;
                return <div key={b.label} className={"rounded-2xl border p-4 transition " + (b.ok ? "border-primary/20 bg-white/5" : "border-white/5 bg-black/10 opacity-45")}>
                  <div className={"flex h-10 w-10 items-center justify-center rounded-xl " + (b.ok ? "bg-primary/15 text-primary" : "bg-white/5 text-white/30")}><Icon className="h-5 w-5" /></div>
                  <div className="mt-3 text-sm font-medium">{b.label}</div>
                  <div className="mt-1 text-[10px] text-muted-foreground">{b.ok ? "Débloqué" : "À débloquer"}</div>
                </div>;
              })}
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="glass rounded-[1.5rem] p-5">
            <SectionTitle icon={<Activity />} title="Activité récente" subtitle="Tes dernières opérations." />
            <div className="mt-5 space-y-3">
              {recent.length ? recent.map((tx) => (
                <div key={tx.id} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[.025] p-3">
                  <div className={"flex h-9 w-9 items-center justify-center rounded-xl " + (tx.side === "buy" ? "bg-emerald-400/10 text-emerald-300" : "bg-rose-400/10 text-rose-300")}>
                    {tx.side === "buy" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold">{tx.side === "buy" ? "Achat" : "Vente"} · {tx.ticker}</div>
                    <div className="mt-0.5 text-[10px] text-muted-foreground">{tx.qty} titres · {new Date(tx.time).toLocaleDateString("fr-FR")}</div>
                  </div>
                  <div className="num text-xs">{fmt(tx.qty * tx.price)} NX$</div>
                </div>
              )) : <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-xs text-muted-foreground">Aucune activité pour le moment.</div>}
            </div>
          </section>

          <section className="glass rounded-[1.5rem] p-5">
            <SectionTitle icon={<CircleDollarSign />} title="Portefeuille" subtitle="Vue rapide." />
            <div className="mt-5 space-y-3">
              {Object.entries(safeHoldings).slice(0, 5).map(([ticker, h]) => {
                const s = byTicker(ticker);
                if (!s) return null;
                const pnl = (s.price - h.avg) * h.qty;
                return <Link key={ticker} to="/stock/$ticker" params={{ ticker }} className="flex items-center gap-3 rounded-xl p-2.5 transition hover:bg-white/5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-[10px] font-bold">{ticker.slice(0, 2)}</div>
                  <div className="min-w-0 flex-1"><div className="text-xs font-semibold">{ticker}</div><div className="text-[10px] text-muted-foreground">{h.qty} titres</div></div>
                  <div className={"num text-xs " + (pnl >= 0 ? "text-up" : "text-down")}>{pnl >= 0 ? "+" : ""}{fmt(pnl)}</div>
                </Link>;
              })}
              {!Object.keys(safeHoldings).length && <p className="text-xs text-muted-foreground">Aucune position ouverte.</p>}
            </div>
            <Link to="/portfolio" className="mt-4 block rounded-xl border border-white/10 bg-white/5 py-2 text-center text-xs font-medium hover:bg-white/10">Ouvrir le portefeuille →</Link>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}

function SectionTitle({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle?: string }) {
  return <div className="flex items-start gap-3"><div className="mt-0.5 text-primary">{icon}</div><div><div className="text-sm font-semibold">{title}</div>{subtitle && <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div>}</div></div>;
}

function GlassMetric({ label, value }: { label: string; value: ReactNode }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[.07] px-3 py-2.5 backdrop-blur-xl"><div className="text-[9px] uppercase tracking-wider text-white/45">{label}</div><div className="num mt-1 text-sm font-medium text-white">{value}</div></div>;
}

function HeroStat({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return <div className="bg-black/10 px-5 py-4 backdrop-blur-xl"><div className="flex items-center gap-2 text-white/45">{icon}<span className="text-[10px] uppercase tracking-wider">{label}</span></div><div className="num mt-1 text-base text-white">{value}</div></div>;
}

function Field({ label, hint, children, className = "" }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return <div className={className}><div className="mb-2 flex items-center justify-between"><label className="text-xs font-medium text-white/70">{label}</label>{hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}</div>{children}</div>;
}

function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button onClick={onClick} className={"rounded-xl border px-2 py-2 text-[10px] transition " + (active ? "border-primary/35 bg-primary/10 text-primary" : "border-white/10 bg-white/[.03] text-muted-foreground hover:bg-white/[.06]")}>{children}</button>;
}


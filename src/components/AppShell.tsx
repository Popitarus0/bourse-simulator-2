import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Activity, User, Briefcase, LayoutGrid, Newspaper, Trophy, Sparkles, LogIn, LogOut } from "lucide-react";
import { AdminPanel } from "./AdminPanel";
import { useMarket } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { change, fmt, fmtPct } from "@/lib/market";

const NAV = [
  { to: "/market", label: "Marché", icon: LayoutGrid },
  { to: "/portfolio", label: "Portefeuille", icon: Briefcase },
  { to: "/advisor", label: "Analyste IA", icon: Sparkles },
  { to: "/news", label: "Actualités", icon: Newspaper },
  { to: "/leaderboard", label: "Classement", icon: Trophy },
] as const;

function AuthButton() {
  const { session, signOut } = useAuth();
  const { profile } = useMarket();
  const initials = (profile.name || "NX").slice(0, 2).toUpperCase();
  return session ? (
    <button onClick={signOut} aria-label="Se déconnecter" title="Se déconnecter" className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[10px] font-semibold hover:bg-primary/20">{initials}</button>
  ) : (
    <Link to="/auth" className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/10"><LogIn className="h-3.5 w-3.5" />Connexion</Link>
  );
}

export function TickerTape() {
  const { stocks } = useMarket();
  const items = [...stocks, ...stocks];
  return (
    <div className="overflow-hidden border-b border-white/10 bg-white/[0.025] backdrop-blur-xl">
      <div className="flex w-max animate-ticker gap-8 py-1.5 text-xs">
        {items.map((s, i) => {
          const c = change(s);
          return (
            <Link key={i} to="/stock/$ticker" params={{ ticker: s.ticker }} className="flex items-center gap-2 whitespace-nowrap">
              <span className="font-semibold">{s.ticker}</span>
              <span className="num text-muted-foreground">{fmt(s.price)}</span>
              <span className={`num ${c >= 0 ? "text-up" : "text-down"}`}>{fmtPct(c)}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { portfolioValue, account } = useMarket();
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-background/55 backdrop-blur-2xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <Activity className="h-5 w-5 text-gold" />
            NEXUS<span className="text-muted-foreground font-normal">MARKETS</span>
          </Link>
          <nav className="hidden gap-1 md:flex">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" activeProps={{ className: "bg-accent !text-foreground" }}>
                <n.icon className="h-4 w-4" />{n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-5 text-xs">
            <AuthButton />
            <Link to="/profile" aria-label="Profil" className="hidden h-8 w-8 items-center justify-center rounded-full bg-accent hover:bg-primary/20 sm:flex"><User className="h-4 w-4" /></Link>
            <div className="text-right"><div className="text-muted-foreground">Valeur totale</div><div className="num text-sm font-medium">{fmt(portfolioValue)} NX$</div></div>
            <div className="hidden text-right sm:block"><div className="text-muted-foreground">Liquidités</div><div className="num text-sm">{fmt(account.cash)}</div></div>
          </div>
        </div>
        <TickerTape />
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 pb-24 md:pb-6">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-white/10 bg-background/65 backdrop-blur-2xl md:hidden">
        {NAV.map((n) => (
          <Link key={n.to} to={n.to} className="flex flex-col items-center gap-1 py-2 text-[11px] text-muted-foreground" activeProps={{ className: "!text-primary" }}>
            <n.icon className="h-5 w-5" />{n.label}
          </Link>
        ))}
      </nav>
      <AdminPanel />
    </div>
  );
}

export function Delta({ v, className = "" }: { v: number; className?: string }) {
  return <span className={`num ${v >= 0 ? "text-up" : "text-down"} ${className}`}>{fmtPct(v)}</span>;
}

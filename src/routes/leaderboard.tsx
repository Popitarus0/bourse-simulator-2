import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { AppShell, Delta } from "@/components/AppShell";
import { START_CASH, useMarket } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { fmt } from "@/lib/market";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Classement — NEXUS MARKETS" },
      { name: "description", content: "Les meilleurs traders de la saison en temps réel." },
      { property: "og:title", content: "Classement — NEXUS MARKETS" },
      { property: "og:description", content: "Qui domine le marché fictif cette saison ?" },
    ],
  }),
  component: Leaderboard,
});

function Leaderboard() {
  const { players, portfolioValue, profile } = useMarket();
  const { isAdmin, session } = useAuth();
  const [registered, setRegistered] = useState<Array<{ id: string; name: string; value: number }>>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!isSupabaseConfigured()) {
        if (alive) { setRegistered([]); setLoaded(true); }
        return;
      }
      const { data, error } = await supabase
        .from("public_leaderboard")
        .select("user_id,name,value")
        .order("value", { ascending: false })
        .limit(100);
      if (!alive) return;
      if (error) {
        console.error("[Leaderboard] Loading registered accounts failed:", error.message);
        setRegistered([]);
      } else {
        setRegistered((data ?? []).map((row) => ({
          id: row.user_id,
          name: row.name || "Trader",
          value: Number(row.value) || START_CASH,
        })));
      }
      setLoaded(true);
    };
    void load();
    const interval = window.setInterval(() => void load(), 15000);
    return () => { alive = false; window.clearInterval(interval); };
  }, [session?.user.id]);

  const all = isSupabaseConfigured()
    ? [...registered.map((p) => ({ ...p, isYou: p.id === session?.user.id })),
        ...(session && !registered.some((p) => p.id === session.user.id)
          ? [{ id: session.user.id, name: profile.name || session.user.email?.split("@")[0] || "Vous", value: portfolioValue, isYou: true }]
          : [])].sort((a, b) => b.value - a.value)
    : [...players, { name: "Vous", value: portfolioValue, isYou: true }].sort((a, b) => b.value - a.value);
  const myRank = all.findIndex((p) => p.isYou) + 1;
  return (
    <AppShell>
      <div className="nexus-page nexus-leaderboard relative">
        <div className="market-flow-lines" aria-hidden="true"><span /><span /><span /></div>
        <div className="relative z-10">
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div><h1 className="text-xl font-semibold">Classement · Saison 1</h1><p className="text-sm text-muted-foreground">{isSupabaseConfigured() ? "Classement des comptes inscrits · patrimoine virtuel" : "Classement de démonstration"}</p></div>
        <div className="panel ml-auto px-4 py-2 text-sm">Votre rang : <span className="num text-gold">{isAdmin ? "ADMIN" : `#${myRank}`}</span> / {all.length}</div>
      </div>
      <div className="panel divide-y">
        {isSupabaseConfigured() && loaded && all.length === 0 && <div className="px-4 py-8 text-center text-sm text-muted-foreground">Aucun compte inscrit pour le moment.</div>}
        {all.map((p, i) => (
          <div key={"id" in p ? p.id : p.name} className={`flex items-center gap-4 px-4 py-3 text-sm transition-colors ${p.isYou ? "bg-primary/10" : ""}`}>
            <span className={`num w-8 ${i < 3 ? "text-gold" : "text-muted-foreground"}`}>{i < 3 ? <Trophy className="h-4 w-4" /> : `#${i + 1}`}</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-semibold">{p.name.slice(0, 2).toUpperCase()}</span>
            {p.isYou ? <Link to="/profile" className="flex-1 font-semibold text-primary hover:underline">{p.name}</Link> : <Link to="/trader/$name" params={{ name: p.name }} className="flex-1 hover:underline">{p.name}</Link>}
            <span className="num">{fmt(p.value, 0)} NX$</span>
            <Delta v={(p.value - START_CASH) / START_CASH} className="w-24 text-right" />
          </div>
        ))}
        </div>
        </div>
      </div>
    </AppShell>
  );
}

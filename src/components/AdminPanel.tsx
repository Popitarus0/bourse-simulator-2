import { useEffect, useRef, useState, type ReactNode } from "react";
import { Activity, BarChart3, Gauge, Newspaper, Shield, Users, WalletCards, X } from "lucide-react";
import { useMarket } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { fmt } from "@/lib/market";

let lastPos = { x: 24, y: 120 };

export function AdminPanel() {
  const { isAdmin } = useAuth();
  return isAdmin ? <AdminPanelInner /> : null;
}

function AdminPanelInner() {
  const m = useMarket();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(lastPos);
  useEffect(() => { lastPos = pos; }, [pos]);
  const drag = useRef<{ dx: number; dy: number; moved: boolean } | null>(null);
  const [cash, setCash] = useState("");
  const [ticker, setTicker] = useState(m.stocks[0]?.ticker ?? "");
  const [price, setPrice] = useState("");
  const [tab, setTab] = useState<"overview" | "comptes" | "argent" | "flux" | "bourse" | "news">("overview");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [accountMsg, setAccountMsg] = useState("");
  useEffect(() => { if (open && tab === "comptes") void m.refreshAdminTraders(); }, [open, tab]);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!drag.current) return;
      drag.current.moved = true;
      setPos({
        x: Math.min(window.innerWidth - 56, Math.max(4, e.clientX - drag.current.dx)),
        y: Math.min(window.innerHeight - 56, Math.max(4, e.clientY - drag.current.dy)),
      });
    };
    const up = () => setTimeout(() => (drag.current = null), 0);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, []);

  const sel = m.byTicker(ticker);
  const rising = m.stocks.filter((s) => s.dir > 0).length;
  const falling = m.stocks.filter((s) => s.dir < 0).length;
  const totalVolume = m.stocks.reduce((sum, s) => sum + s.volume, 0);
  const panelLeft = typeof window !== "undefined" && pos.x > window.innerWidth / 2 ? pos.x - 330 : pos.x + 60;
  const panelTop = typeof window !== "undefined" ? Math.min(pos.y, window.innerHeight - 460) : pos.y;

  return (
    <>
      <button
        aria-label="Panel administrateur"
        onPointerDown={(e) => { drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y, moved: false }; }}
        onClick={() => { if (!drag.current?.moved) setOpen((o) => !o); }}
        style={{ left: pos.x, top: pos.y, touchAction: "none" }}
        className="glass fixed z-50 flex h-12 w-12 cursor-grab items-center justify-center rounded-full text-gold transition-transform hover:scale-110 active:cursor-grabbing"
      >
        <Shield className="h-5 w-5" />
      </button>
      {open && (
        <div style={{ left: Math.max(8, panelLeft), top: Math.max(8, panelTop) }} className="fixed z-50 w-80 rounded-2xl border border-white/10 bg-[#0a0d12]/[.98] p-4 text-sm shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2 font-semibold"><Shield className="h-4 w-4 text-gold" />Administration</span>
            <button onClick={() => setOpen(false)} aria-label="Fermer"><X className="h-4 w-4" /></button>
          </div>
          <div className="mb-4 grid grid-cols-3 gap-1 rounded-lg bg-background/40 p-1">
            {(["overview", "comptes", "argent", "flux", "bourse", "news"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`rounded-md py-1 capitalize ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{t === "overview" ? "Vue" : t === "comptes" ? "Comptes" : t === "news" ? "News" : t}</button>
            ))}
          </div>

          {tab === "comptes" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div><div className="font-medium">Comptes traders</div><div className="text-[10px] text-muted-foreground">{m.adminTraders.length} compte(s) chargé(s)</div></div>
                <button onClick={() => void m.refreshAdminTraders()} className="rounded-md border px-2 py-1 text-[10px] hover:bg-accent">Actualiser</button>
              </div>
              {accountMsg && <div className="rounded-lg border border-primary/20 bg-primary/10 p-2 text-[10px] text-primary">{accountMsg}</div>}
              <div className="max-h-72 space-y-2 overflow-auto pr-1">
                {m.adminTraders.map((u) => (
                  <div key={u.id} className="rounded-xl border border-white/10 bg-white/[.035] p-3">
                    <button onClick={() => setSelectedUser(selectedUser === u.id ? null : u.id)} className="flex w-full items-center gap-2 text-left">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold">{u.name.slice(0,2).toUpperCase()}</span>
                      <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{u.name}</span><span className="block truncate text-[9px] text-muted-foreground">{u.email || u.id}</span></span>
                      <span className="num text-xs">{fmt(u.value,0)} NX$</span>
                    </button>
                    {selectedUser === u.id && (
                      <div className="mt-3 border-t border-white/10 pt-3">
                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                          <span>Solde <b className="num">{fmt(u.cash,0)} NX$</b></span>
                          <span>Positions <b>{Object.keys(u.holdings).length}</b></span>
                          <span>Transactions <b>{u.txs.length}</b></span>
                          <span>P&L <b className={u.value >= 100000 ? "text-up" : "text-down"}>{fmt(u.value - 100000,0)} NX$</b></span>
                        </div>
                        <div className="mt-2 max-h-24 space-y-1 overflow-auto">
                          {Object.entries(u.holdings).map(([t,h]) => <div key={t} className="flex justify-between rounded bg-black/20 px-2 py-1 text-[10px]"><span>{t} · {h.qty}</span><span className="num">{fmt(h.avg)}</span></div>)}
                        </div>
                        <button onClick={async () => { const ok = window.confirm("Réinitialiser ce compte ?"); if (!ok) return; const err = await m.resetAdminTrader(u.id); setAccountMsg(err ?? "Compte réinitialisé."); }} className="mt-3 w-full rounded-lg border border-destructive/30 py-1.5 text-[10px] text-destructive hover:bg-destructive/10">Réinitialiser le compte</button>
                      </div>
                    )}
                  </div>
                ))}
                {!m.adminTraders.length && <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-[10px] text-muted-foreground">Aucun compte accessible. En mode Supabase, vérifie les droits RLS/admin de ces tables.</div>}
              </div>
            </div>
          )}

          {tab === "overview" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <AdminMetric icon={<WalletCards />} label="Patrimoine" value={fmt(m.portfolioValue) + " NX$"} />
                <AdminMetric icon={<Users />} label="Positions" value={String(Object.keys(m.account.holdings).length)} />
                <AdminMetric icon={<Activity />} label="Hausses" value={String(rising)} />
                <AdminMetric icon={<BarChart3 />} label="Baisses" value={String(falling)} />
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[.025] p-3">
                <div className="mb-2 flex items-center justify-between"><span className="text-xs font-medium">Moteur de marché</span><span className={m.admin.paused ? "text-amber-300" : "text-up"}>{m.admin.paused ? "PAUSE" : "LIVE"}</span></div>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
                  <span>Vitesse <b className="num text-foreground">{m.admin.speed.toFixed(2)}x</b></span>
                  <span>Volatilité <b className="num text-foreground">{m.admin.volatility.toFixed(2)}x</b></span>
                  <span>News <b className="num text-foreground">{(m.admin.newsRate * 100).toFixed(0)}%</b></span>
                  <span>Volume <b className="num text-foreground">{fmt(totalVolume, 0)}</b></span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => m.setAdmin({ paused: !m.admin.paused })} className="rounded-lg bg-primary/15 py-2 text-xs text-primary">{m.admin.paused ? "Reprendre" : "Geler"} le marché</button>
                <button onClick={() => m.reset()} className="rounded-lg border border-destructive/30 py-2 text-xs text-destructive">Reset compte</button>
              </div>
            </div>
          )}

          {tab === "argent" && (
            <div className="space-y-3">
              <div className="text-muted-foreground">Liquidités actuelles : <span className="num text-foreground">{fmt(m.account.cash)} NX$</span></div>
              <div className="flex gap-2">
                <input value={cash} onChange={(e) => setCash(e.target.value)} placeholder="Nouveau montant" type="number" className="glass-input flex-1" />
                <button onClick={() => { m.setCash(+cash); setCash(""); }} className="rounded-md bg-primary px-3 text-primary-foreground">OK</button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[10000, 100000, 1000000].map((v) => (
                  <button key={v} onClick={() => m.setCash(m.account.cash + v)} className="glass-input text-up">+{fmt(v, 0)}</button>
                ))}
              </div>
              <button onClick={m.reset} className="w-full rounded-md border border-destructive/50 py-1.5 text-destructive">Réinitialiser le compte</button>
            </div>
          )}

          {tab === "flux" && (
            <div className="space-y-4">
              <Slider label="Vitesse" value={m.admin.speed} min={0.25} max={5} step={0.25} suffix="x" onChange={(v) => m.setAdmin({ speed: v })} />
              <Slider label="Volatilité" value={m.admin.volatility} min={0} max={5} step={0.1} suffix="x" onChange={(v) => m.setAdmin({ volatility: v })} />
              <Slider label="Tendance" value={m.admin.trend} min={-1} max={1} step={0.05} onChange={(v) => m.setAdmin({ trend: v })} />
              <Slider label="Fréquence des news" value={m.admin.newsRate} min={0} max={0.5} step={0.01} onChange={(v) => m.setAdmin({ newsRate: v })} />
              <button onClick={() => m.setAdmin({ paused: !m.admin.paused })} className={`w-full rounded-md py-1.5 ${m.admin.paused ? "bg-up/20 text-up" : "bg-down/20 text-down"}`}>
                {m.admin.paused ? "Reprendre le marché" : "Geler le marché"}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => m.setAdmin({ trend: 0.8, volatility: 1.6 })} className="rounded-md bg-up/15 py-2 text-xs font-medium text-up">⚡ Bull run</button>
                <button onClick={() => m.setAdmin({ trend: -0.8, volatility: 2.2 })} className="rounded-md bg-down/15 py-2 text-xs font-medium text-down">⚠ Bear market</button>
              </div>
              <button onClick={() => m.setAdmin({ trend: 0, volatility: 1 })} className="w-full rounded-md border py-1.5 text-xs text-muted-foreground">Normaliser le marché</button>
            </div>
          )}

          {tab === "news" && (
            <div className="space-y-2">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium"><Newspaper className="h-4 w-4 text-primary" />Dernières actualités</div>
              {m.news.slice(0, 8).map((n) => (
                <div key={n.id} className="rounded-xl border border-white/5 bg-white/[.025] p-3">
                  <div className="flex justify-between gap-2"><span className="text-xs font-semibold">{n.ticker}</span><span className={n.impact >= 0 ? "text-up text-[10px]" : "text-down text-[10px]"}>{n.impact >= 0 ? "+" : ""}{(n.impact * 100).toFixed(1)}%</span></div>
                  <div className="mt-1 text-[11px] text-white/70">{n.title}</div>
                  <div className="mt-1 text-[9px] text-muted-foreground">{n.category}</div>
                </div>
              ))}
              {!m.news.length && <div className="py-6 text-center text-xs text-muted-foreground">Aucune actualité.</div>}
            </div>
          )}

          {tab === "bourse" && (
            <div className="space-y-3">
              <select value={ticker} onChange={(e) => setTicker(e.target.value)} className="glass-input w-full">
                {m.stocks.map((s) => <option key={s.ticker} value={s.ticker} className="bg-popover">{s.ticker} — {s.name}</option>)}
              </select>
              {sel && <div className="text-muted-foreground">Prix actuel : <span className="num text-foreground">{fmt(sel.price)}</span></div>}
              <div className="flex gap-2">
                <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Nouveau prix" type="number" className="glass-input flex-1" />
                <button onClick={() => { m.setPrice(ticker, +price); setPrice(""); }} className="rounded-md bg-primary px-3 text-primary-foreground">OK</button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[-0.2, -0.05, 0.05, 0.2].map((p) => (
                  <button key={p} onClick={() => sel && m.setPrice(ticker, +(sel.price * (1 + p)).toFixed(2))} className={`glass-input ${p > 0 ? "text-up" : "text-down"}`}>{p > 0 ? "+" : ""}{p * 100}%</button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => m.pushNews(ticker, 0.12)} className="rounded-md bg-up/20 py-1.5 text-up">News positive</button>
                <button onClick={() => m.pushNews(ticker, -0.12)} className="rounded-md bg-down/20 py-1.5 text-down">News négative</button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function AdminMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) { return <div className="rounded-xl border border-white/10 bg-white/[.025] p-3"><div className="flex items-center gap-2 text-[9px] uppercase tracking-wider text-muted-foreground">{icon}{label}</div><div className="num mt-1 text-sm font-semibold">{value}</div></div>; }

function Slider({ label, value, min, max, step, suffix = "", onChange }: { label: string; value: number; min: number; max: number; step: number; suffix?: string; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <div className="mb-1 flex justify-between"><span>{label}</span><span className="num text-muted-foreground">{value.toFixed(2)}{suffix}</span></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} className="w-full accent-[var(--primary)]" />
    </label>
  );
}

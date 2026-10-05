import { useEffect, useRef, useState } from "react";
import { Shield, X } from "lucide-react";
import { useMarket } from "@/lib/store";
import { fmt } from "@/lib/market";

let lastPos = { x: 24, y: 120 };

export function AdminPanel() {
  const m = useMarket();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(lastPos);
  useEffect(() => { lastPos = pos; }, [pos]);
  const drag = useRef<{ dx: number; dy: number; moved: boolean } | null>(null);
  const [cash, setCash] = useState("");
  const [ticker, setTicker] = useState(m.stocks[0]?.ticker ?? "");
  const [price, setPrice] = useState("");
  const [tab, setTab] = useState<"argent" | "flux" | "bourse">("argent");

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
        <div style={{ left: Math.max(8, panelLeft), top: Math.max(8, panelTop) }} className="glass fixed z-50 w-80 rounded-2xl p-4 text-sm animate-in fade-in zoom-in-95">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2 font-semibold"><Shield className="h-4 w-4 text-gold" />Administration</span>
            <button onClick={() => setOpen(false)} aria-label="Fermer"><X className="h-4 w-4" /></button>
          </div>
          <div className="mb-4 grid grid-cols-3 gap-1 rounded-lg bg-background/40 p-1">
            {(["argent", "flux", "bourse"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`rounded-md py-1 capitalize ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{t}</button>
            ))}
          </div>

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

function Slider({ label, value, min, max, step, suffix = "", onChange }: { label: string; value: number; min: number; max: number; step: number; suffix?: string; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <div className="mb-1 flex justify-between"><span>{label}</span><span className="num text-muted-foreground">{value.toFixed(2)}{suffix}</span></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} className="w-full accent-[var(--primary)]" />
    </label>
  );
}

import { useId } from "react";

export function Sparkline({ data, width = 100, height = 28 }: { data: number[]; width?: number; height?: number }) {
  const min = Math.min(...data), max = Math.max(...data);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / (max - min || 1)) * height}`).join(" ");
  const up = data[data.length - 1] >= data[0];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={up ? "text-up" : "text-down"}>
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function AreaChart({ data, height = 320 }: { data: number[]; height?: number }) {
  const id = useId();
  const W = 1000;
  const min = Math.min(...data), max = Math.max(...data);
  const pad = (max - min) * 0.1 || 1;
  const lo = min - pad, hi = max + pad;
  const y = (v: number) => height - ((v - lo) / (hi - lo)) * height;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${y(v)}`);
  const up = data[data.length - 1] >= data[0];
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => lo + (hi - lo) * t);
  const last = data[data.length - 1];
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" className={`w-full ${up ? "text-up" : "text-down"}`} style={{ height }}>
        <defs>
          <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <line key={t} x1="0" x2={W} y1={y(t)} y2={y(t)} className="stroke-border" strokeDasharray="3 5" vectorEffect="non-scaling-stroke" />
        ))}
        <polygon points={`0,${height} ${pts.join(" ")} ${W},${height}`} fill={`url(#${id})`} />
        <polyline points={pts.join(" ")} fill="none" stroke="currentColor" strokeWidth="1.75" vectorEffect="non-scaling-stroke" />
        <line x1="0" x2={W} y1={y(last)} y2={y(last)} stroke="currentColor" strokeOpacity="0.5" strokeDasharray="2 4" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="pointer-events-none absolute inset-y-0 right-1 flex flex-col justify-between py-0 text-[10px] num text-muted-foreground">
        {[...ticks].reverse().map((t) => <span key={t}>{t.toFixed(2)}</span>)}
      </div>
    </div>
  );
}

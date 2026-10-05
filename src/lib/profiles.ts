import type { Stock } from "./market";

function hash(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

export function traderStats(name: string, value: number, stocks: Stock[]) {
  let h = hash(name);
  const r = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0), h / 4294967296);
  const picks = [...stocks].sort(() => r() - 0.5).slice(0, 3 + Math.floor(r() * 3));
  const invested = value * (0.5 + r() * 0.4);
  const weights = picks.map(() => r() + 0.2);
  const wsum = weights.reduce((a, b) => a + b, 0);
  const holdings = picks.map((s, i) => ({ ticker: s.ticker, name: s.name, amount: (invested * weights[i]) / wsum }));
  return {
    holdings,
    cash: value - invested,
    trades: 40 + Math.floor(r() * 600),
    winRate: 0.4 + r() * 0.35,
    style: ["Agressif", "Prudent", "Day-trader", "Value", "Momentum"][Math.floor(r() * 5)],
    joined: Date.UTC(2026, Math.floor(r() * 9), 1 + Math.floor(r() * 27)),
  };
}

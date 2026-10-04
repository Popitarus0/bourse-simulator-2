import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { HISTORY_LEN, makeNews, seedNews, seedPlayers, seedStocks, type NewsItem, type Player, type Stock } from "./market";

export const START_CASH = 100000;

export interface Holding { qty: number; avg: number }
export interface Tx { id: string; ticker: string; side: "buy" | "sell"; qty: number; price: number; time: number }

interface Account { cash: number; holdings: Record<string, Holding>; txs: Tx[]; watchlist: string[] }

interface Ctx {
  stocks: Stock[];
  news: NewsItem[];
  players: Player[];
  account: Account;
  byTicker: (t: string) => Stock | undefined;
  trade: (ticker: string, side: "buy" | "sell", qty: number) => string | null;
  toggleWatch: (t: string) => void;
  portfolioValue: number;
  reset: () => void;
}

const MarketCtx = createContext<Ctx | null>(null);
const KEY = "nexus-account-v1";
const freshAccount = (): Account => ({ cash: START_CASH, holdings: {}, txs: [], watchlist: ["NXQ", "ORBT", "FUSN"] });

function gauss() {
  return Math.sqrt(-2 * Math.log(Math.random() || 1e-9)) * Math.cos(2 * Math.PI * Math.random());
}

export function MarketProvider({ children }: { children: ReactNode }) {
  const [stocks, setStocks] = useState<Stock[]>(() => seedStocks());
  const [news, setNews] = useState<NewsItem[]>(() => seedNews(seedStocks()));
  const [players, setPlayers] = useState<Player[]>(() => seedPlayers());
  const [account, setAccount] = useState<Account>(freshAccount);
  const loaded = useRef(false);
  const stocksRef = useRef(stocks);
  stocksRef.current = stocks;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setAccount(JSON.parse(raw));
    } catch {}
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (loaded.current) localStorage.setItem(KEY, JSON.stringify(account));
  }, [account]);

  useEffect(() => {
    let pending: NewsItem | null = null;
    const id = setInterval(() => {
      if (Math.random() < 0.07) {
        pending = makeNews(stocksRef.current);
        const n = pending;
        setNews((prev) => [n, ...prev].slice(0, 60));
      }
      const market = gauss() * 0.0015;
      setStocks((prev) =>
        prev.map((s) => {
          let r = market + gauss() * s.vol * 0.25 + 0.00005;
          if (pending && pending.ticker === s.ticker) r += pending.impact;
          const price = Math.max(0.5, +(s.price * (1 + r)).toFixed(2));
          const history = [...s.history.slice(-(HISTORY_LEN - 1)), price];
          return { ...s, price, history, volume: s.volume + Math.round(Math.random() * 20000), dir: price > s.price ? 1 : price < s.price ? -1 : 0 };
        }),
      );
      pending = null;
      setPlayers((prev) => prev.map((p) => ({ ...p, value: Math.max(10000, Math.round(p.value * (1 + gauss() * 0.004 + 0.0002))) })));
    }, 1600);
    return () => clearInterval(id);
  }, []);

  const byTicker = (t: string) => stocks.find((s) => s.ticker === t);

  const trade: Ctx["trade"] = (ticker, side, qty) => {
    const s = byTicker(ticker);
    if (!s || !Number.isFinite(qty) || qty <= 0) return "Quantité invalide";
    const total = s.price * qty;
    const h = account.holdings[ticker];
    if (side === "buy" && total > account.cash) return "Liquidités insuffisantes";
    if (side === "sell" && (!h || h.qty < qty)) return "Position insuffisante";
    setAccount((a) => {
      const holdings = { ...a.holdings };
      const cur = holdings[ticker] ?? { qty: 0, avg: 0 };
      if (side === "buy") {
        const nq = cur.qty + qty;
        holdings[ticker] = { qty: nq, avg: (cur.avg * cur.qty + total) / nq };
      } else {
        const nq = cur.qty - qty;
        if (nq === 0) delete holdings[ticker];
        else holdings[ticker] = { ...cur, qty: nq };
      }
      return {
        ...a,
        cash: a.cash + (side === "buy" ? -total : total),
        holdings,
        txs: [{ id: crypto.randomUUID(), ticker, side, qty, price: s.price, time: Date.now() }, ...a.txs],
      };
    });
    return null;
  };

  const toggleWatch = (t: string) =>
    setAccount((a) => ({ ...a, watchlist: a.watchlist.includes(t) ? a.watchlist.filter((x) => x !== t) : [...a.watchlist, t] }));

  const portfolioValue = account.cash + Object.entries(account.holdings).reduce((sum, [t, h]) => sum + (byTicker(t)?.price ?? 0) * h.qty, 0);

  return (
    <MarketCtx.Provider value={{ stocks, news, players, account, byTicker, trade, toggleWatch, portfolioValue, reset: () => setAccount(freshAccount()) }}>
      {children}
    </MarketCtx.Provider>
  );
}

export function useMarket() {
  const c = useContext(MarketCtx);
  if (!c) throw new Error("useMarket outside provider");
  return c;
}

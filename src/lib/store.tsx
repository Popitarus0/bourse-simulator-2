import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { HISTORY_LEN, makeNews, seedNews, seedPlayers, seedStocks, type NewsItem, type Player, type Stock } from "./market";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth";

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
  admin: AdminSettings;
  setAdmin: (a: Partial<AdminSettings>) => void;
  setCash: (v: number) => void;
  setPrice: (ticker: string, price: number) => void;
  pushNews: (ticker: string, impact: number) => void;
  profile: Profile;
  setProfile: (p: Partial<Profile>) => void;
}
export interface AdminSettings { speed: number; volatility: number; trend: number; paused: boolean; newsRate: number }
export interface Profile { name: string; bio: string; joined: number }

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
  const [admin, setAdminState] = useState<AdminSettings>({ speed: 1, volatility: 1, trend: 0, paused: false, newsRate: 0.07 });
  const [profile, setProfileState] = useState<Profile>({ name: "Vous", bio: "", joined: Date.now() });
  const adminRef = useRef(admin);
  adminRef.current = admin;
  const loaded = useRef(false);
  const stocksRef = useRef(stocks);
  stocksRef.current = stocks;

  const { session, isAdmin } = useAuth();
  const uid = session?.user.id;

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

  // Global market settings: load + live updates
  useEffect(() => {
    const apply = (r: { speed: number; volatility: number; trend: number; news_rate: number; paused: boolean }) =>
      setAdminState({ speed: +r.speed, volatility: +r.volatility, trend: +r.trend, newsRate: +r.news_rate, paused: r.paused });
    supabase.from("market_settings").select("*").eq("id", 1).maybeSingle().then(({ data }) => data && apply(data));
    const ch = supabase.channel("market_settings")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "market_settings" }, (p) => apply(p.new as never))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // Account-linked profile
  useEffect(() => {
    if (!uid) { setProfileState({ name: "Vous", bio: "", joined: Date.now() }); return; }
    supabase.from("profiles").select("name,bio,created_at").eq("id", uid).maybeSingle().then(({ data }) => {
      if (data) setProfileState({ name: data.name, bio: data.bio, joined: new Date(data.created_at).getTime() });
    });
  }, [uid]);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setProfile = (p: Partial<Profile>) => {
    setProfileState((x) => {
      const next = { ...x, ...p };
      if (uid) {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => { supabase.from("profiles").update({ name: next.name, bio: next.bio }).eq("id", uid).then(() => {}); }, 500);
      }
      return next;
    });
  };

  const setAdmin = (a: Partial<AdminSettings>) => {
    if (!isAdmin) return;
    setAdminState((prev) => {
      const n = { ...prev, ...a };
      supabase.from("market_settings").update({ speed: n.speed, volatility: n.volatility, trend: n.trend, news_rate: n.newsRate, paused: n.paused, updated_at: new Date().toISOString() }).eq("id", 1).then(() => {});
      return n;
    });
  };

  useEffect(() => {
    let pending: NewsItem | null = null;
    const id = setInterval(() => {
      const ad = adminRef.current;
      if (ad.paused) return;
      if (Math.random() < ad.newsRate) {
        pending = makeNews(stocksRef.current);
        const n = pending;
        setNews((prev) => [n, ...prev].slice(0, 60));
      }
      const market = gauss() * 0.0015;
      setStocks((prev) =>
        prev.map((s) => {
          let r = (market + gauss() * s.vol * 0.25) * ad.volatility + 0.00005 + ad.trend * 0.002;
          if (pending && pending.ticker === s.ticker) r += pending.impact;
          const price = Math.max(0.5, +(s.price * (1 + r)).toFixed(2));
          const history = [...s.history.slice(-(HISTORY_LEN - 1)), price];
          return { ...s, price, history, volume: s.volume + Math.round(Math.random() * 20000), dir: price > s.price ? 1 : price < s.price ? -1 : 0 };
        }),
      );
      pending = null;
      setPlayers((prev) => prev.map((p) => ({ ...p, value: Math.max(10000, Math.round(p.value * (1 + gauss() * 0.004 + 0.0002))) })));
    }, 1600 / admin.speed);
    return () => clearInterval(id);
  }, [admin.speed]);

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

  const setPrice = (ticker: string, price: number) => {
    if (!Number.isFinite(price) || price <= 0) return;
    setStocks((prev) => prev.map((s) => (s.ticker === ticker ? { ...s, price, history: [...s.history.slice(1), price], dir: price > s.price ? 1 : -1 } : s)));
  };
  const pushNews = (ticker: string, impact: number) => {
    const n = makeNews(stocksRef.current);
    const s = stocks.find((x) => x.ticker === ticker);
    const item = { ...n, ticker, impact, category: "Flash", title: `${s?.name ?? ticker} : ${impact >= 0 ? "annonce explosive, les acheteurs affluent" : "scandale, la confiance s'effondre"}` };
    setNews((prev) => [item, ...prev].slice(0, 60));
    if (s) setPrice(ticker, +(s.price * (1 + impact)).toFixed(2));
  };
  const portfolioValue = account.cash + Object.entries(account.holdings).reduce((sum, [t, h]) => sum + (byTicker(t)?.price ?? 0) * h.qty, 0);

  return (
    <MarketCtx.Provider value={{ stocks, news, players, account, byTicker, trade, toggleWatch, portfolioValue, reset: () => setAccount(freshAccount()), admin, setAdmin, setCash: (v) => isAdmin && Number.isFinite(v) && v >= 0 && setAccount((a) => ({ ...a, cash: v })), setPrice: (t, p) => isAdmin && setPrice(t, p), pushNews: (t, i) => isAdmin && pushNews(t, i), profile, setProfile }}>
      {children}
    </MarketCtx.Provider>
  );
}

export function useMarket() {
  const c = useContext(MarketCtx);
  if (!c) throw new Error("useMarket outside provider");
  return c;
}

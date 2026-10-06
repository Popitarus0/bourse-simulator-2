import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { HISTORY_LEN, makeNews, seedNews, seedPlayers, seedStocks, type NewsItem, type Player, type Stock } from "./market";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
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
  trade: (ticker: string, side: "buy" | "sell", qty: number) => Promise<string | null>;
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
const ACCOUNT_PREFIX = "nexus-account-v1:";
const freshAccount = (): Account => ({ cash: START_CASH, holdings: {}, txs: [], watchlist: ["NXQ", "ORBT", "FUSN"] });
function parseAccount(raw: string | null): Account | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<Account>;
    if (typeof value.cash !== "number" || !Number.isFinite(value.cash) || value.cash < 0 ||
        typeof value.holdings !== "object" || !value.holdings ||
        !Array.isArray(value.txs) || !Array.isArray(value.watchlist)) return null;
    const holdings: Record<string, Holding> = {};
    for (const [ticker, raw] of Object.entries(value.holdings as Record<string, unknown>)) {
      if (!raw || typeof raw !== "object") continue;
      const h = raw as Partial<Holding>;
      if (Number.isInteger(h.qty) && Number.isFinite(h.qty) && h.qty > 0 && Number.isFinite(h.avg) && h.avg >= 0) {
        holdings[ticker] = { qty: h.qty, avg: h.avg };
      }
    }
    const txs = value.txs.filter((tx): tx is Tx => {
      if (!tx || typeof tx !== "object") return false;
      const t = tx as Partial<Tx>;
      return typeof t.id === "string" &&
        typeof t.ticker === "string" &&
        (t.side === "buy" || t.side === "sell") &&
        Number.isInteger(t.qty) && t.qty > 0 &&
        Number.isFinite(t.price) && t.price >= 0 &&
        Number.isFinite(t.time);
    }).slice(0, 1000);
    return {
      cash: value.cash,
      holdings,
      txs,
      watchlist: value.watchlist.filter((x): x is string => typeof x === "string").slice(0, 50),
    };
  } catch { return null; }
}

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
  const storageKey = ACCOUNT_PREFIX + (uid ?? "guest");

  useEffect(() => {
    let cancelled = false;
    loaded.current = false;

    if (!uid || !isSupabaseConfigured()) {
      setAccount(parseAccount(localStorage.getItem(storageKey)) ?? freshAccount());
      loaded.current = true;
      return () => { cancelled = true; };
    }

    (async () => {
      try {
        const [accountResult, holdingsResult, txResult] = await Promise.all([
          supabase.from("paper_accounts").select("cash").eq("user_id", uid).maybeSingle(),
          supabase.from("paper_holdings").select("ticker,qty,avg_price").eq("user_id", uid),
          supabase.from("paper_transactions").select("id,ticker,side,qty,price,created_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(1000),
        ]);
        if (accountResult.error) throw accountResult.error;
        if (holdingsResult.error) throw holdingsResult.error;
        if (txResult.error) throw txResult.error;
        if (cancelled) return;

        const holdings: Record<string, Holding> = {};
        for (const row of holdingsResult.data ?? []) {
          const qty = Number(row.qty);
          const avg = Number(row.avg_price);
          if (Number.isInteger(qty) && qty > 0 && Number.isFinite(avg) && avg >= 0) {
            holdings[row.ticker] = { qty, avg };
          }
        }
        const txs: Tx[] = (txResult.data ?? []).flatMap((row) => {
          const qty = Number(row.qty);
          const price = Number(row.price);
          const time = new Date(row.created_at).getTime();
          return Number.isInteger(qty) && qty > 0 && Number.isFinite(price) && price > 0 && Number.isFinite(time)
            ? [{ id: row.id, ticker: row.ticker, side: row.side as "buy" | "sell", qty, price, time }]
            : [];
        });

        setAccount({
          cash: Number.isFinite(Number(accountResult.data?.cash)) ? Number(accountResult.data?.cash) : START_CASH,
          holdings,
          txs,
          watchlist: parseAccount(localStorage.getItem(storageKey))?.watchlist ?? ["NXQ", "ORBT", "FUSN"],
        });
      } catch (error) {
        console.error("[Account] Server state load failed:", error);
        if (!cancelled) setAccount(freshAccount());
      } finally {
        if (!cancelled) loaded.current = true;
      }
    })();

    return () => { cancelled = true; };
  }, [uid, storageKey]);

  useEffect(() => {
    if (!uid && loaded.current) localStorage.setItem(storageKey, JSON.stringify(account));
  }, [account, uid, storageKey]);

  // Global market settings: load + live updates
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
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
    if (!uid || !isSupabaseConfigured()) {
      if (!uid) setProfileState({ name: "Vous", bio: "", joined: Date.now() });
      return;
    }
    supabase.from("profiles").select("name,bio,created_at").eq("id", uid).maybeSingle().then(({ data }) => {
      if (data) setProfileState({ name: typeof data.name === "string" ? data.name : "Trader", bio: typeof data.bio === "string" ? data.bio : "", joined: Number.isFinite(new Date(data.created_at).getTime()) ? new Date(data.created_at).getTime() : Date.now() });
    });
  }, [uid]);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setProfile = (p: Partial<Profile>) => {
    setProfileState((x) => {
      const next = {
        ...x,
        ...(p.name !== undefined ? { name: p.name.trim().slice(0, 32) } : {}),
        ...(p.bio !== undefined ? { bio: p.bio.trim().slice(0, 160) } : {}),
      };
      if (uid && isSupabaseConfigured()) {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => { supabase.from("profiles").update({ name: next.name || "Trader", bio: next.bio }).eq("id", uid).then(() => {}); }, 500);
      }
      return next;
    });
  };

  const setAdmin = (a: Partial<AdminSettings>) => {
    if (!isAdmin || !isSupabaseConfigured()) return;
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

  const trade: Ctx["trade"] = async (ticker, side, qty) => {
    const s = byTicker(ticker);
    if (!s || !Number.isFinite(qty) || !Number.isInteger(qty) || qty <= 0 || qty > 1000000) return "Quantité invalide";

    if (uid && isSupabaseConfigured()) {
      const { error } = await supabase.rpc("execute_paper_trade", {
        p_ticker: ticker,
        p_side: side,
        p_qty: qty,
        p_client_price: s.price,
      });
      if (error) {
        const messages: Record<string, string> = {
          AUTH_REQUIRED: "Connexion requise",
          INSUFFICIENT_CASH: "Liquidités insuffisantes",
          INSUFFICIENT_POSITION: "Position insuffisante",
          UNKNOWN_TICKER: "Action inconnue",
        };
        return messages[error.message] ?? "Ordre refusé par le serveur";
      }

      const [accountResult, holdingsResult, txResult] = await Promise.all([
        supabase.from("paper_accounts").select("cash").eq("user_id", uid).maybeSingle(),
        supabase.from("paper_holdings").select("ticker,qty,avg_price").eq("user_id", uid),
        supabase.from("paper_transactions").select("id,ticker,side,qty,price,created_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(1000),
      ]);
      if (accountResult.error || holdingsResult.error || txResult.error) {
        console.error("[Trade] Server state refresh failed:", accountResult.error ?? holdingsResult.error ?? txResult.error);
        return "Ordre exécuté, mais actualisation du portefeuille impossible";
      }
      const holdings: Record<string, Holding> = {};
      for (const row of holdingsResult.data ?? []) {
        const q = Number(row.qty);
        const avg = Number(row.avg_price);
        if (Number.isInteger(q) && q > 0 && Number.isFinite(avg) && avg >= 0) holdings[row.ticker] = { qty: q, avg };
      }
      const txs: Tx[] = (txResult.data ?? []).flatMap((row) => {
        const q = Number(row.qty);
        const price = Number(row.price);
        const time = new Date(row.created_at).getTime();
        return Number.isInteger(q) && q > 0 && Number.isFinite(price) && price > 0 && Number.isFinite(time)
          ? [{ id: row.id, ticker: row.ticker, side: row.side as "buy" | "sell", qty: q, price, time }]
          : [];
      });
      setAccount((a) => ({
        ...a,
        cash: Number(accountResult.data?.cash ?? a.cash),
        holdings,
        txs,
      }));
      return null;
    }

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
        txs: [{ id: crypto.randomUUID(), ticker, side, qty, price: s.price, time: Date.now() }, ...a.txs].slice(0, 1000),
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
    <MarketCtx.Provider value={{ stocks, news, players, account, byTicker, trade, toggleWatch, portfolioValue, reset: () => {
      if (uid && isSupabaseConfigured()) {
        supabase.rpc("reset_paper_account").then(({ error }) => {
          if (error) console.error("[Account] Reset failed:", error);
          else setAccount(freshAccount());
        });
        return;
      }
      setAccount(freshAccount());
    }, admin, setAdmin, setCash: (v) => {
      if (!isAdmin || !Number.isFinite(v) || v < 0) return;
      if (uid && isSupabaseConfigured()) {
        supabase.rpc("admin_set_paper_cash", { p_user_id: uid, p_cash: v }).then(({ error }) => {
          if (error) console.error("[Admin] Cash update failed:", error);
          else setAccount((a) => ({ ...a, cash: v }));
        });
        return;
      }
      setAccount((a) => ({ ...a, cash: v }));
    }, setPrice: (t, p) => isAdmin && setPrice(t, p), pushNews: (t, i) => isAdmin && pushNews(t, i), profile, setProfile }}>
      {children}
    </MarketCtx.Provider>
  );
}

export function useMarket() {
  const c = useContext(MarketCtx);
  if (!c) throw new Error("useMarket outside provider");
  return c;
}

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export type LocalSession = Session;

const LOCAL_ACCOUNTS_KEY = "nexus_local_accounts_v1";
const LOCAL_SESSION_KEY = "nexus_local_session_v1";
const LOCAL_ADMIN_EMAIL = "claudelisscfj@gmail.com";
type LocalAccount = { id: string; email: string; passwordHash: string; name: string; createdAt: string; isAdmin: boolean };
function readLocalAccounts(): LocalAccount[] { try { const raw = localStorage.getItem(LOCAL_ACCOUNTS_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; } }
function writeLocalAccounts(accounts: LocalAccount[]) { localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts)); }
async function hashPassword(value: string) { const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join(""); }
function localSession(account: LocalAccount): Session { return { user: { id: account.id, email: account.email, user_metadata: { name: account.name }, app_metadata: { provider: "local" }, aud: "authenticated", role: "authenticated" } } as unknown as Session; }

interface AuthCtx {
  session: Session | null;
  isAdmin: boolean;
  ready: boolean;
  supabaseConfigured: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string, name?: string) => Promise<string | null>;
  sendReset: (email: string) => Promise<string | null>;
  updatePassword: (password: string) => Promise<string | null>;
  signInGoogle: () => Promise<string | null>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>(null as unknown as AuthCtx);

function translate(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "E-mail ou mot de passe incorrect.";
  if (m.includes("email not confirmed")) return "Confirme d'abord ton adresse e-mail (lien reçu par mail).";
  if (m.includes("already registered") || m.includes("already exists")) return "Un compte existe déjà avec cette adresse.";
  if (m.includes("password") && (m.includes("weak") || m.includes("pwned") || m.includes("leaked"))) return "Mot de passe trop faible ou trop courant, choisis-en un autre.";
  if (m.includes("rate limit") || m.includes("too many")) return "Trop de tentatives, réessaie dans quelques minutes.";
  if (m.includes("invalid") && m.includes("email")) return "Adresse e-mail invalide.";
  return msg;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      const email = localStorage.getItem(LOCAL_SESSION_KEY);
      const account = email ? readLocalAccounts().find((a) => a.email === email) : null;
      if (account) { setSession(localSession(account)); setIsAdmin(account.isAdmin); }
      setReady(true);
      return;
    }
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession()
      .then(({ data }) => { setSession(data.session); setReady(true); })
      .catch(() => setReady(true));
    return () => sub.subscription.unsubscribe();
  }, []);

  const uid = session?.user.id;
  useEffect(() => {
    if (!uid) { setIsAdmin(false); return; }
    if (!isSupabaseConfigured()) {
      setIsAdmin(session?.user.email?.trim().toLowerCase() === LOCAL_ADMIN_EMAIL);
      return;
    }
    let alive = true;
    supabase.from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle()
      .then(({ data }) => { if (alive) setIsAdmin(!!data); });
    return () => { alive = false; };
  }, [uid]);

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured()) {
      const normalized = email.trim().toLowerCase();
      const account = readLocalAccounts().find((a) => a.email === normalized);
      if (!account || account.passwordHash !== await hashPassword(password)) return "E-mail ou mot de passe incorrect.";
      localStorage.setItem(LOCAL_SESSION_KEY, normalized); setSession(localSession(account)); setIsAdmin(account.isAdmin); return null;
    }
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    return error ? translate(error.message) : null;
  };

  const signUp = async (email: string, password: string, name?: string) => {
    if (password.length < 8) return "Le mot de passe doit contenir au moins 8 caractères.";
    if (!isSupabaseConfigured()) {
      const normalized = email.trim().toLowerCase(); const accounts = readLocalAccounts();
      if (accounts.some((a) => a.email === normalized)) return "Un compte existe déjà avec cette adresse.";
      const account: LocalAccount = { id: "local-" + crypto.randomUUID(), email: normalized, passwordHash: await hashPassword(password), name: name?.trim().slice(0, 32) || normalized.split("@")[0], createdAt: new Date().toISOString(), isAdmin: normalized === LOCAL_ADMIN_EMAIL };
      writeLocalAccounts([...accounts, account]);
      localStorage.setItem(LOCAL_SESSION_KEY, normalized);
      localStorage.setItem("nexus-profile-v2:" + account.id, JSON.stringify({ name: account.name, bio: "", joined: Date.now(), title: "Market Explorer", avatarStyle: "orb", accent: "blue", banner: "aurora", status: "Actif" }));
      setSession(localSession(account)); setIsAdmin(account.isAdmin); return null;
    }
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { emailRedirectTo: window.location.origin + "/profile", data: { name: name?.trim().slice(0, 32) } },
    });
    if (error) return translate(error.message);
    if (data.user && data.user.identities?.length === 0) return "Un compte existe déjà avec cette adresse.";
    return null;
  };

  const sendReset = async (email: string) => {
    if (!isSupabaseConfigured()) return "En mode navigateur, la récupération par e-mail n’est pas disponible. Utilise ton compte local.";
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: window.location.origin + "/reset-password",
    });
    return error ? translate(error.message) : null;
  };

  const updatePassword = async (password: string) => {
    if (password.length < 8) return "Le mot de passe doit contenir au moins 8 caractères.";
    if (!isSupabaseConfigured()) {
      const email = localStorage.getItem(LOCAL_SESSION_KEY); if (!email) return "Aucun compte local connecté.";
      const nextAccounts = await Promise.all(readLocalAccounts().map(async (a) => a.email === email ? { ...a, passwordHash: await hashPassword(password) } : a)); writeLocalAccounts(nextAccounts); return null;
    }
    const { error } = await supabase.auth.updateUser({ password });
    return error ? translate(error.message) : null;
  };

  const signInGoogle = async () => {
    if (!isSupabaseConfigured()) return "Google nécessite Supabase. Le mode navigateur utilise e-mail + mot de passe.";
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    const err = (res as { error?: { message?: string } } | undefined)?.error;
    return err ? translate(err.message ?? "Connexion Google impossible.") : null;
  };

  const signOut = async () => { if (isSupabaseConfigured()) await supabase.auth.signOut(); else { localStorage.removeItem(LOCAL_SESSION_KEY); setSession(null); setIsAdmin(false); } };

  return (
    <Ctx.Provider value={{ session, isAdmin, ready, supabaseConfigured: isSupabaseConfigured(), signIn, signUp, sendReset, updatePassword, signInGoogle, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export type LocalSession = Session;

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
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  const uid = session?.user.id;
  useEffect(() => {
    if (!uid || !isSupabaseConfigured()) { setIsAdmin(false); return; }
    let alive = true;
    supabase.from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle()
      .then(({ data }) => { if (alive) setIsAdmin(!!data); });
    return () => { alive = false; };
  }, [uid]);

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured()) return "Connexion indisponible : Supabase n’est pas configuré.";\n    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    return error ? translate(error.message) : null;
  };

  const signUp = async (email: string, password: string, name?: string) => {
    if (password.length < 8) return "Le mot de passe doit contenir au moins 8 caractères.";
    if (!isSupabaseConfigured()) return "Inscription indisponible : Supabase n’est pas configuré.";\n    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { emailRedirectTo: window.location.origin + "/profile", data: { name: name?.trim().slice(0, 32) } },
    });
    if (error) return translate(error.message);
    if (data.user && data.user.identities?.length === 0) return "Un compte existe déjà avec cette adresse.";
    return null;
  };

  const sendReset = async (email: string) => {
    if (!isSupabaseConfigured()) return "Réinitialisation indisponible : Supabase n’est pas configuré.";\n    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: window.location.origin + "/reset-password",
    });
    return error ? translate(error.message) : null;
  };

  const updatePassword = async (password: string) => {
    if (password.length < 8) return "Le mot de passe doit contenir au moins 8 caractères.";
    if (!isSupabaseConfigured()) return "Modification du mot de passe indisponible : Supabase n’est pas configuré.";\n    const { error } = await supabase.auth.updateUser({ password });
    return error ? translate(error.message) : null;
  };

  const signInGoogle = async () => {
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    const err = (res as { error?: { message?: string } } | undefined)?.error;
    return err ? translate(err.message ?? "Connexion Google impossible.") : null;
  };

  const signOut = async () => { if (isSupabaseConfigured()) await supabase.auth.signOut(); };

  return (
    <Ctx.Provider value={{ session, isAdmin, ready, supabaseConfigured: true, signIn, signUp, sendReset, updatePassword, signInGoogle, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);

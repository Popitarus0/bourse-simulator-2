import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";

interface AuthCtx {
  session: Session | null;
  isAdmin: boolean;
  ready: boolean;
  supabaseConfigured: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  session: null,
  isAdmin: false,
  ready: false,
  supabaseConfigured: false,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [ready, setReady] = useState(false);
  const supabaseConfigured = isSupabaseConfigured();

  useEffect(() => {
    if (!supabaseConfigured) {
      setSession(null);
      setIsAdmin(false);
      setReady(true);
      return;
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) setIsAdmin(false);
    });
    supabase.auth.getSession()
      .then(({ data }) => setSession(data.session))
      .catch((error) => console.error("[Auth] Session load failed:", error))
      .finally(() => setReady(true));

    return () => sub.subscription.unsubscribe();
  }, [supabaseConfigured]);

  useEffect(() => {
    const uid = session?.user.id;
    if (!uid || !supabaseConfigured) {
      setIsAdmin(false);
      return;
    }

    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error("[Auth] Role check failed:", error);
        setIsAdmin(!!data);
      });
  }, [session?.user.id, supabaseConfigured]);

  const signOut = async () => {
    if (!supabaseConfigured) return;
    const { error } = await supabase.auth.signOut();
    if (error) console.error("[Auth] Sign out failed:", error);
  };

  return (
    <Ctx.Provider value={{ session, isAdmin, ready, supabaseConfigured, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);

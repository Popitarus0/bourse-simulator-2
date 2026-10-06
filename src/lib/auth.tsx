import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthCtx { session: Session | null; isAdmin: boolean; ready: boolean; signOut: () => Promise<void> }
const Ctx = createContext<AuthCtx>({ session: null, isAdmin: false, ready: false, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const uid = session?.user.id;
    if (!uid) { setIsAdmin(false); return; }
    supabase.from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [session?.user.id]);

  return <Ctx.Provider value={{ session, isAdmin, ready, signOut: async () => { await supabase.auth.signOut(); } }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);

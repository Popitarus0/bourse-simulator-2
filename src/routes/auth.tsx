import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSupabaseConfigError, supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Connexion — NEXUS MARKETS" },
      { name: "description", content: "Connectez-vous ou créez votre compte de trader." },
      { property: "og:title", content: "Connexion — NEXUS MARKETS" },
      { property: "og:description", content: "Accédez à votre compte NEXUS MARKETS." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { session, supabaseConfigured } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) navigate({ to: "/profile" });
  }, [session, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseConfigured) {
      setMsg(getSupabaseConfigError());
      return;
    }

    setBusy(true);
    setMsg(null);
    try {
      const result = mode === "in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });

      if (result.error) {
        setMsg(result.error.message);
      } else if (mode === "up") {
        setMsg("Vérifiez votre boîte mail pour confirmer votre compte.");
      }
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Connexion impossible.");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    if (!supabaseConfigured) {
      setMsg(getSupabaseConfigError());
      return;
    }

    try {
      const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      if (r.error) setMsg(String(r.error.message ?? r.error));
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Connexion Google impossible.");
    }
  };

  return (
    <AppShell>
      <div className="panel mx-auto max-w-sm p-6">
        <h1 className="mb-4 text-xl font-semibold">{mode === "in" ? "Connexion" : "Créer un compte"}</h1>

        {!supabaseConfigured && (
          <div className="mb-4 rounded-md border border-down/20 bg-down/5 px-3 py-2 text-xs text-muted-foreground">
            Le mode connecté est momentanément indisponible sur cette version publiée. Le site peut rester utilisé en mode invité.
          </div>
        )}

        <form onSubmit={submit} className="space-y-3">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
          <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe" className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
          <button disabled={busy || !supabaseConfigured} className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">{mode === "in" ? "Se connecter" : "S'inscrire"}</button>
        </form>
        <button disabled={busy || !supabaseConfigured} onClick={google} className="mt-3 w-full rounded-md border py-2 text-sm hover:bg-accent disabled:opacity-50">Continuer avec Google</button>
        {msg && <p className="mt-3 text-sm text-muted-foreground">{msg}</p>}
        <button onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-4 text-sm text-primary">
          {mode === "in" ? "Pas de compte ? S'inscrire" : "Déjà inscrit ? Se connecter"}
        </button>
      </div>
    </AppShell>
  );
}

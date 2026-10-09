import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";

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

type Mode = "in" | "up" | "forgot" | "reset";
void 0;

function AuthPage() {
  const { session, signIn, signUp, sendReset, signInGoogle } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (session) navigate({ to: "/profile" });
  }, [session, navigate]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (mode === "forgot") {
        const error = await sendReset(email);
        setMsg(error ? { ok: false, text: error } : { ok: true, text: "Si un compte existe, un lien de réinitialisation vient d'être envoyé par e-mail." });
        return;
      }
      if (mode === "up") {
        const error = await signUp(email, password, email.trim().split("@")[0]);
        if (error) setMsg({ ok: false, text: error });
        else { setMsg({ ok: true, text: "Compte créé ! Clique sur le lien de confirmation reçu par e-mail, puis connecte-toi." }); setPassword(""); setMode("in"); }
        return;
      }
      const error = await signIn(email, password);
      setMsg(error ? { ok: false, text: error } : { ok: true, text: "Connexion réussie." });
    } catch (error) {
      setMsg({ ok: false, text: error instanceof Error ? error.message : "Connexion impossible." });
    } finally {
      setBusy(false);
    }
  };

  const title = mode === "up" ? "Créer ton compte" : mode === "forgot" ? "Récupérer ton compte" : mode === "reset" ? "Nouveau mot de passe" : "Ravi de te revoir";
  const subtitle = mode === "up"
    ? "Crée ton identité de trader et conserve ton portefeuille."
    : mode === "forgot"
      ? "Entre ton e-mail pour recevoir un lien de réinitialisation."
      : mode === "reset"
        ? "Choisis un nouveau mot de passe pour sécuriser ton compte."
        : "Connecte-toi pour retrouver ton portefeuille.";

  return (
    <div className="relative min-h-[calc(100vh-2rem)] overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/50 p-4 shadow-2xl backdrop-blur-2xl md:p-8">
      <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-violet-500/15 blur-3xl" />
      <div className="relative mx-auto grid min-h-[620px] max-w-5xl items-center gap-10 lg:grid-cols-[1fr_420px]">
        <div className="hidden lg:block">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-white/55">
            <Sparkles className="h-3.5 w-3.5" /> NEXUS ID
          </div>
          <h1 className="max-w-xl text-6xl font-semibold tracking-tight text-white">Ton marché.<br /><span className="text-primary">Ton identité.</span></h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-white/55">Connecte ton compte pour conserver ton portefeuille, tes transactions et toute la personnalisation de ton profil.</p>
          <div className="mt-8 grid max-w-lg grid-cols-3 gap-3">
            <Trust icon={<ShieldCheck />} title="Sécurisé" text="Compte en ligne" />
            <Trust icon={<LockKeyhole />} title="Fictif" text="0 € réel" />
            <Trust icon={<Sparkles />} title="Persistant" text="Sauvegardé" />
          </div>
        </div>

        <div className="glass rounded-[1.75rem] p-6 shadow-2xl md:p-7">
          <div className="mb-7 lg:hidden">
            <div className="text-sm font-semibold">NEXUS <span className="font-normal text-white/40">MARKETS</span></div>
          </div>
          <div className="mb-6">
            <div className="mb-2 text-xs uppercase tracking-[0.16em] text-primary">NEXUS ID</div>
            <h2 className="text-2xl font-semibold text-white">{title}</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{subtitle}</p>
          </div>

          {mode !== "reset" && mode !== "forgot" && (
            <div className="mb-5 grid grid-cols-2 rounded-xl border border-white/10 bg-white/[.03] p-1">
              <button onClick={() => { setMode("in"); setMsg(null); }} className={"rounded-lg py-2 text-xs font-medium transition " + (mode === "in" ? "bg-white/10 text-white" : "text-muted-foreground")}>Connexion</button>
              <button onClick={() => { setMode("up"); setMsg(null); }} className={"rounded-lg py-2 text-xs font-medium transition " + (mode === "up" ? "bg-white/10 text-white" : "text-muted-foreground")}>Inscription</button>
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            {mode !== "reset" && (
              <div>
                <label className="mb-2 block text-xs font-medium text-white/70">E-mail</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} id="auth-email" placeholder="toi@exemple.fr" className="glass-input w-full pl-10 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15" />
                </div>
              </div>
            )}
            {mode !== "forgot" && (
              <div>
                <label className="mb-2 block text-xs font-medium text-white/70">{mode === "reset" ? "Nouveau mot de passe" : "Mot de passe"}</label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                  <input type={showPassword ? "text" : "password"} required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8 caractères minimum" className="glass-input w-full px-10 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15" />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                </div>
              </div>
            )}

            <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/15 transition hover:opacity-90 disabled:opacity-50">
              {busy ? "Chargement…" : mode === "in" ? "Se connecter" : mode === "up" ? "Créer mon compte" : mode === "forgot" ? "Continuer" : "Changer le mot de passe"}
              {!busy && mode !== "forgot" && mode !== "reset" && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          {mode === "in" && (
            <button onClick={() => { setMode("forgot"); setMsg(null); }} className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-primary">Mot de passe oublié ?</button>
          )}

          {mode !== "forgot" && mode !== "reset" && (
            <>
              <div className="my-5 flex items-center gap-3"><div className="h-px flex-1 bg-white/10" /><span className="text-[10px] text-white/30">OU</span><div className="h-px flex-1 bg-white/10" /></div>
              <button type="button" onClick={() => { setMode("in"); setMsg(null); document.getElementById("auth-email")?.focus(); }} className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-medium text-white/80 transition hover:bg-white/10">
                <Mail className="h-4 w-4" />
                Continuer avec e-mail
              </button>
            </>
          )}

          {msg && <div className={"mt-4 rounded-xl border px-3 py-2.5 text-xs " + (msg.ok ? "border-emerald-400/20 bg-emerald-400/5 text-emerald-300" : "border-rose-400/20 bg-rose-400/5 text-rose-300")}>{msg.text}</div>}

          {mode === "forgot" && <button onClick={() => { setMode("in"); setMsg(null); }} className="mt-5 w-full text-xs text-muted-foreground hover:text-primary">← Retour à la connexion</button>}
          {mode === "reset" && <button onClick={() => navigate({ to: "/profile" })} className="mt-5 w-full text-xs text-muted-foreground hover:text-primary">Retour au profil</button>}
        </div>
      </div>
    </div>
  );
}

function Trust({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[.04] p-4 backdrop-blur-xl"><div className="text-primary">{icon}</div><div className="mt-3 text-xs font-semibold text-white">{title}</div><div className="mt-1 text-[10px] text-white/40">{text}</div></div>;
}

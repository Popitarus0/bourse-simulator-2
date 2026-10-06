import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Sparkles, Square } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useMarket } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { change } from "@/lib/market";

export const Route = createFileRoute("/advisor")({
  head: () => ({
    meta: [
      { title: "Analyste IA — NEXUS MARKETS" },
      { name: "description", content: "Posez une question sur votre portefeuille et recevez des pistes d'action personnalisées." },
      { property: "og:title", content: "Analyste IA — NEXUS MARKETS" },
      { property: "og:description", content: "Un analyste IA qui étudie vos positions, transactions et les actualités." },
    ],
  }),
  component: Advisor,
});

const SUGGEST = ["Mon portefeuille est-il trop risqué ?", "Quelles positions devrais-je alléger ?", "Quelles actualités récentes m'impactent ?", "Comment mieux diversifier ?"];

function Advisor() {
  const m = useMarket();
  const { session } = useAuth();
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState("");
  const [asked, setAsked] = useState("");
  const [busy, setBusy] = useState(false);
  const ctrl = useRef<AbortController | null>(null);

  const ask = async (question: string) => {
    if (!question.trim() || busy || !session) return;
    setAsked(question); setAnswer(""); setBusy(true);
    const context = {
      liquidites: +m.account.cash.toFixed(2),
      valeurTotale: +m.portfolioValue.toFixed(2),
      positions: Object.entries(m.account.holdings).map(([t, h]) => {
        const s = m.byTicker(t);
        return { ticker: t, qte: h.qty, prixMoyen: +h.avg.toFixed(2), cours: s?.price, plusValuePct: s ? +(((s.price - h.avg) / h.avg) * 100).toFixed(2) : null };
      }),
      transactionsRecentes: m.account.txs.slice(0, 25).map((t) => ({ ticker: t.ticker, sens: t.side, qte: t.qty, prix: t.price, date: new Date(t.time).toISOString() })),
      marche: m.stocks.map((s) => ({ ticker: s.ticker, nom: s.name, secteur: (s as { sector?: string }).sector, cours: s.price, variationPct: +(change(s) * 100).toFixed(2) })),
      actualites: m.news.slice(0, 15).map((n) => ({ ticker: n.ticker, titre: n.title, impactPct: +(n.impact * 100).toFixed(1) })),
    };
    ctrl.current = new AbortController();
    try {
      const res = await fetch("/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ question, context }),
        signal: ctrl.current.signal,
      });
      if (!res.ok || !res.body) { setAnswer(await res.text()); return; }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        setAnswer((a) => a + dec.decode(value, { stream: true }));
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") setAnswer((a) => a + "\n\n(arrêté)");
      else setAnswer("Impossible de joindre l'assistant.");
    } finally { setBusy(false); }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-1 flex items-center gap-2 text-2xl font-semibold"><Sparkles className="h-5 w-5 text-gold" />Analyste IA</h1>
        <p className="mb-5 text-sm text-muted-foreground">Posez une question : l'IA étudie vos positions, vos transactions et les actualités pour vous proposer des pistes d'action.</p>
        {!session ? (
          <div className="panel p-5 text-sm">Connectez-vous pour utiliser l'analyste. <Link to="/auth" className="text-primary">Se connecter</Link></div>
        ) : (
          <>
            <form onSubmit={(e) => { e.preventDefault(); ask(q); }} className="panel flex gap-2 p-3">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ex. : dois-je vendre ORBT après la dernière news ?" className="flex-1 bg-transparent px-2 text-sm outline-none" />
              {busy ? (
                <button type="button" onClick={() => ctrl.current?.abort()} className="flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm"><Square className="h-3 w-3" />Stop</button>
              ) : (
                <button className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground">Analyser</button>
              )}
            </form>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGEST.map((s) => <button key={s} onClick={() => { setQ(s); ask(s); }} className="rounded-full border px-3 py-1 text-xs text-muted-foreground hover:bg-accent">{s}</button>)}
            </div>
            {asked && (
              <div className="panel mt-5 p-5">
                <div className="mb-3 text-xs text-muted-foreground">« {asked} »</div>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{answer || (busy ? "Analyse en cours…" : "")}</div>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

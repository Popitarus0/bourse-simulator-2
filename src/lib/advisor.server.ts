import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { createClient } from "@supabase/supabase-js";

const RUN = "X-Lovable-AIG-Run-ID";

export async function handleAdvisor(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return new Response("Connectez-vous pour utiliser l'assistant.", { status: 401 });
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const sb = createClient(process.env["SUPABASE_URL"]!, key, { auth: { persistSession: false } });
  const { data: u } = await sb.auth.getUser(token);
  if (!u.user) return new Response("Session invalide.", { status: 401 });

  const body = (await request.json()) as { question?: string; context?: unknown };
  const question = String(body.question ?? "").slice(0, 2000).trim();
  if (!question) return new Response("Question vide.", { status: 400 });
  const context = JSON.stringify(body.context ?? {}).slice(0, 30000);

  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return new Response("Assistant non configuré.", { status: 500 });

  let runId = request.headers.get(RUN) ?? undefined;
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: async (input, init) => {
      const h = new Headers(init?.headers);
      if (runId && !h.has(RUN)) h.set(RUN, runId);
      const res = await fetch(input, { ...init, headers: h });
      runId ??= res.headers.get(RUN) ?? undefined;
      if (!res.ok) throw Object.assign(new Error(await res.clone().text()), { status: res.status });
      return res;
    },
  });

  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    system:
      "Tu es l'analyste IA de NEXUS MARKETS, une bourse 100 % fictive (monnaie NX$). Réponds en français, de façon concise et structurée (titres courts, puces). " +
      "Analyse les positions, transactions, liquidités, cours et actualités fournis. Propose 2 à 4 pistes d'action concrètes et personnalisées (renforcer, alléger, diversifier, surveiller une news), en citant les tickers et chiffres. " +
      "Rappelle brièvement que c'est un jeu fictif, sans conseil financier réel. N'invente pas de données absentes du contexte.",
    messages: [{ role: "user", content: `Données du trader et du marché (JSON) :\n${context}\n\nQuestion : ${question}` }],
    abortSignal: request.signal,
    providerOptions: {
      openai: { forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] },
    },
    onError: () => {},
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(c) {
      try {
        for await (const part of result.fullStream) {
          if (part.type === "text-delta") c.enqueue(encoder.encode(part.text));
          else if (part.type === "error") {
            const st = (part.error as { status?: number })?.status;
            const m = st === 429 ? "Trop de demandes, réessayez dans un instant." : st === 402 ? "Crédits IA épuisés pour cet espace de travail." : "L'assistant a rencontré une erreur.";
            c.enqueue(encoder.encode(`\n\n⚠️ ${m}`));
          }
        }
      } catch {
        c.enqueue(encoder.encode("\n\n⚠️ Réponse interrompue."));
      }
      c.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache, no-transform" } });
}

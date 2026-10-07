import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, Delta } from "@/components/AppShell";
import { START_CASH, useMarket } from "@/lib/store";
import { fmt } from "@/lib/market";

export const Route = createFileRoute("/portfolio")({
  head: () => ({
    meta: [
      { title: "Portefeuille — NEXUS MARKETS" },
      { name: "description", content: "Vos positions, performances et transactions." },
      { property: "og:title", content: "Portefeuille — NEXUS MARKETS" },
      { property: "og:description", content: "Suivez votre portefeuille fictif." },
    ],
  }),
  component: Portfolio,
});

function Portfolio() {
  const { account, byTicker, portfolioValue, reset } = useMarket();
  const rows = Object.entries(account.holdings).map(([t, h]) => ({ t, h, s: byTicker(t)! }));
  const invested = portfolioValue - account.cash;
  const perf = (portfolioValue - START_CASH) / START_CASH;
  const winners = [...rows].sort((a, b) => (b.s.price - b.h.avg) / b.h.avg - (a.s.price - a.h.avg) / a.h.avg);
  const sectorAllocation = Object.entries(
    rows.reduce<Record<string, number>>((acc, { h, s }) => {
      acc[s.sector] = (acc[s.sector] ?? 0) + h.qty * s.price;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  return (
    <AppShell>
      <div className="grid gap-3 md:grid-cols-4">
        <Stat k="Valeur totale" v={`${fmt(portfolioValue)} NX$`} gold />
        <Stat k="Investi" v={fmt(invested)} />
        <Stat k="Liquidités" v={fmt(account.cash)} />
        <div className="panel p-4"><div className="text-xs text-muted-foreground">Performance</div><div className="mt-1 text-xl"><Delta v={perf} /></div><div className={`num text-xs ${perf >= 0 ? "text-up" : "text-down"}`}>{fmt(portfolioValue - START_CASH)} NX$</div></div>
      </div>

      {invested > 0 && (
        <div className="panel mt-4 p-4">
          <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Répartition</div>
          <div className="flex h-3 overflow-hidden rounded-full bg-muted">
            {rows.map(({ t, h, s }, i) => (
              <div key={t} title={t} style={{ width: `${((h.qty * s.price) / portfolioValue) * 100}%`, opacity: 1 - i * 0.12 }} className="bg-primary first:rounded-l-full" />
            ))}
          </div>
        </div>
      )}

      <div className="panel mt-4 overflow-x-auto">
        <div className="border-b p-3 text-sm font-semibold">Positions</div>
        {rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Aucune position. <Link to="/market" className="text-primary">Explorer le marché →</Link></p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground"><tr className="border-b"><th className="p-3 text-left font-medium">Titre</th><th className="p-3 text-right font-medium">Qté</th><th className="p-3 text-right font-medium">PRU</th><th className="p-3 text-right font-medium">Cours</th><th className="p-3 text-right font-medium">Valeur</th><th className="p-3 text-right font-medium">P&L</th></tr></thead>
            <tbody>
              {rows.map(({ t, h, s }) => (
                <tr key={t} className="border-b last:border-0 hover:bg-accent/40">
                  <td className="p-3"><Link to="/stock/$ticker" params={{ ticker: t }} className="font-semibold">{t}</Link><div className="text-xs text-muted-foreground">{s.name}</div></td>
                  <td className="num p-3 text-right">{h.qty}</td>
                  <td className="num p-3 text-right">{fmt(h.avg)}</td>
                  <td className="num p-3 text-right">{fmt(s.price)}</td>
                  <td className="num p-3 text-right">{fmt(h.qty * s.price)}</td>
                  <td className="p-3 text-right"><div className={`num ${s.price >= h.avg ? "text-up" : "text-down"}`}>{fmt((s.price - h.avg) * h.qty)}</div><Delta v={(s.price - h.avg) / h.avg} className="text-xs" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="panel mt-4">
        <div className="flex items-center border-b p-3 text-sm font-semibold">Historique des transactions
          <button onClick={() => confirm("Réinitialiser le compte à 100 000 NX$ ?") && reset()} className="ml-auto text-xs font-normal text-muted-foreground hover:text-down">Réinitialiser</button>
        </div>
        {account.txs.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">Aucune transaction.</p> : (
          <div className="max-h-80 divide-y overflow-y-auto">
            {account.txs.map((x) => (
              <div key={x.id} className="flex items-center gap-4 px-3 py-2 text-sm">
                <span className={`w-14 rounded px-1.5 py-0.5 text-center text-xs font-medium ${x.side === "buy" ? "bg-up/15 text-up" : "bg-down/15 text-down"}`}>{x.side === "buy" ? "ACHAT" : "VENTE"}</span>
                <span className="w-14 font-semibold">{x.ticker}</span>
                <span className="num text-muted-foreground">{x.qty} × {fmt(x.price)}</span>
                <span className="num ml-auto">{fmt(x.qty * x.price)}</span>
                <span className="num hidden w-20 text-right text-xs text-muted-foreground sm:block">{new Date(x.time).toLocaleTimeString("fr-FR")}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

const Stat = ({ k, v, gold }: { k: string; v: string; gold?: boolean }) => (
  <div className="panel p-4"><div className="text-xs text-muted-foreground">{k}</div><div className={`num mt-1 text-xl ${gold ? "text-gold" : ""}`}>{v}</div></div>
);

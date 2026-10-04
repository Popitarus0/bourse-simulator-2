export type Sector = "Tech" | "Énergie" | "Finance" | "Santé" | "Industrie" | "Consommation" | "Spatial";

export interface Company {
  ticker: string;
  name: string;
  sector: Sector;
  description: string;
  shares: number; // millions
  vol: number;
  base: number;
}

export const COMPANIES: Company[] = [
  { ticker: "NXQ", name: "Nexora Quantum", sector: "Tech", description: "Processeurs quantiques et cloud de calcul haute performance.", shares: 820, vol: 0.022, base: 248.3 },
  { ticker: "HLX", name: "Helix Biogenics", sector: "Santé", description: "Thérapies géniques et diagnostics prédictifs.", shares: 410, vol: 0.026, base: 112.7 },
  { ticker: "SOLR", name: "Solaris Grid", sector: "Énergie", description: "Réseaux solaires orbitaux et stockage d'énergie.", shares: 960, vol: 0.018, base: 64.2 },
  { ticker: "ARCB", name: "Arcadia Bank", sector: "Finance", description: "Banque d'investissement paneuropéenne.", shares: 1500, vol: 0.011, base: 41.85 },
  { ticker: "VTRX", name: "Vectrix Motors", sector: "Industrie", description: "Véhicules autonomes et logistique robotisée.", shares: 700, vol: 0.028, base: 187.4 },
  { ticker: "ORBT", name: "Orbital Dynamics", sector: "Spatial", description: "Lanceurs réutilisables et constellations satellites.", shares: 380, vol: 0.032, base: 93.6 },
  { ticker: "LUMA", name: "Luma Retail", sector: "Consommation", description: "Commerce omnicanal et marques lifestyle.", shares: 1100, vol: 0.013, base: 28.4 },
  { ticker: "CYPH", name: "Cypher Security", sector: "Tech", description: "Cybersécurité et chiffrement post-quantique.", shares: 520, vol: 0.021, base: 156.9 },
  { ticker: "AQUA", name: "Aquaterra", sector: "Industrie", description: "Dessalement et infrastructures hydrauliques.", shares: 640, vol: 0.012, base: 52.3 },
  { ticker: "FUSN", name: "Fusion Core", sector: "Énergie", description: "Réacteurs à fusion compacts de nouvelle génération.", shares: 300, vol: 0.035, base: 74.1 },
  { ticker: "MDNA", name: "Medina Pharma", sector: "Santé", description: "Médicaments génériques et vaccins.", shares: 880, vol: 0.014, base: 88.0 },
  { ticker: "KRNL", name: "Kernel Systems", sector: "Tech", description: "Systèmes d'exploitation et puces embarquées.", shares: 760, vol: 0.019, base: 311.5 },
  { ticker: "PLTX", name: "Platinex Capital", sector: "Finance", description: "Gestion d'actifs et paiements numériques.", shares: 990, vol: 0.015, base: 67.9 },
  { ticker: "NOVA", name: "Nova Foods", sector: "Consommation", description: "Protéines alternatives et agriculture verticale.", shares: 450, vol: 0.02, base: 35.6 },
];

export interface Stock extends Company {
  price: number;
  open: number;
  history: number[];
  volume: number;
  dir: 0 | 1 | -1;
}

export interface NewsItem {
  id: string;
  ticker?: string;
  title: string;
  impact: number;
  time: number;
  category: string;
}

export interface Player {
  name: string;
  value: number;
  isYou?: boolean;
}

function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const HISTORY_LEN = 160;

export function seedStocks(): Stock[] {
  const rnd = mulberry32(42);
  return COMPANIES.map((c) => {
    const h: number[] = [];
    let p = c.base * (0.85 + rnd() * 0.2);
    for (let i = 0; i < HISTORY_LEN; i++) {
      p *= 1 + (rnd() - 0.48) * c.vol;
      h.push(+p.toFixed(2));
    }
    return { ...c, price: h[h.length - 1], open: h[HISTORY_LEN - 40], history: h, volume: Math.round(rnd() * 4e6 + 5e5), dir: 0 };
  });
}

const NAMES = ["Kaito_Trades", "M.Laurent", "AlphaWolf", "Sofia.R", "BullRunner", "Nadia_K", "QuantPilot", "J.Mercier", "OrionCap", "LeoFinance", "Yuki88", "Theo.B", "DeltaHedge", "Ines.V", "Marcus_X", "ZenInvest", "Clara.D", "IronHands", "Hugo_FX", "Lina.M"];

export function seedPlayers(): Player[] {
  const rnd = mulberry32(7);
  return NAMES.map((name) => ({ name, value: Math.round(80000 + rnd() * 90000) }));
}

const TEMPLATES: { t: string; impact: [number, number]; cat: string }[] = [
  { t: "{n} dépasse les attentes au trimestre, chiffre d'affaires record", impact: [0.03, 0.08], cat: "Résultats" },
  { t: "{n} annonce un partenariat stratégique majeur", impact: [0.02, 0.06], cat: "Entreprise" },
  { t: "{n} lance un nouveau produit salué par les analystes", impact: [0.02, 0.05], cat: "Produit" },
  { t: "Les analystes relèvent leur objectif de cours sur {n}", impact: [0.015, 0.04], cat: "Analyse" },
  { t: "{n} visé par une enquête des régulateurs", impact: [-0.08, -0.03], cat: "Régulation" },
  { t: "{n} manque ses prévisions, la direction prudente", impact: [-0.07, -0.025], cat: "Résultats" },
  { t: "Départ surprise du PDG de {n}", impact: [-0.06, -0.02], cat: "Entreprise" },
  { t: "Incident de production chez {n}", impact: [-0.05, -0.015], cat: "Opérations" },
];

export function makeNews(stocks: Stock[]): NewsItem {
  const s = stocks[Math.floor(Math.random() * stocks.length)];
  const tpl = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];
  const impact = tpl.impact[0] + Math.random() * (tpl.impact[1] - tpl.impact[0]);
  return { id: crypto.randomUUID(), ticker: s.ticker, title: tpl.t.replace("{n}", s.name), impact, time: Date.now(), category: tpl.cat };
}

export function seedNews(stocks: Stock[]): NewsItem[] {
  const base = Date.UTC(2026, 9, 4, 12, 0);
  return [
    { id: "s1", title: "La Banque Centrale Nexus maintient ses taux à 3,25 %", impact: 0, time: base - 18e5, category: "Macro" },
    { id: "s2", ticker: "NXQ", title: "Nexora Quantum franchit le cap des 1000 qubits stables", impact: 0.04, time: base - 36e5, category: "Produit" },
    { id: "s3", ticker: "VTRX", title: "Vectrix Motors rappelle 12 000 véhicules autonomes", impact: -0.03, time: base - 54e5, category: "Opérations" },
    { id: "s4", ticker: stocks[2].ticker, title: "Solaris Grid remporte un contrat d'État de 4 milliards", impact: 0.05, time: base - 72e5, category: "Entreprise" },
  ];
}

export const fmt = (n: number, d = 2) => n.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
export const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${(n * 100).toFixed(2)} %`;
export const change = (s: Stock) => (s.price - s.open) / s.open;

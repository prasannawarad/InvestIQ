export type CandidateRisk = "low" | "medium" | "high";
export type CandidateSize = "small" | "medium" | "large";
export type CandidateLocation = "domestic" | "international";
export type CandidateAssetClass = "equity" | "debt" | "gold" | "cash";

export interface UniverseCandidate {
  symbol: string;
  name: string;
  logo: string;
  industry: string;
  size: CandidateSize;
  location: CandidateLocation;
  asset_class: CandidateAssetClass;
  risk: CandidateRisk;
  keywords: string[];
}

export const INVEST_UNIVERSE: UniverseCandidate[] = [
  { symbol: "TFHLD", name: "TechFin Holdings", logo: "TF", industry: "technology", size: "large", location: "domestic", asset_class: "equity", risk: "medium", keywords: ["fintech", "platform", "payments"] },
  { symbol: "BELTD", name: "Bharat Energy Ltd", logo: "BE", industry: "energy", size: "medium", location: "domestic", asset_class: "equity", risk: "high", keywords: ["power", "utilities", "infrastructure"] },
  { symbol: "ATCFD", name: "Atlas Consumer Fund", logo: "AC", industry: "consumer", size: "large", location: "international", asset_class: "equity", risk: "medium", keywords: ["fmcg", "staples", "defensive"] },
  { symbol: "HLTHX", name: "Helios Health Labs", logo: "HH", industry: "healthcare", size: "medium", location: "domestic", asset_class: "equity", risk: "medium", keywords: ["pharma", "diagnostics", "health"] },
  { symbol: "RIVRB", name: "RiverBank Financials", logo: "RB", industry: "financials", size: "large", location: "domestic", asset_class: "equity", risk: "medium", keywords: ["banking", "credit", "lending"] },
  { symbol: "CYBER", name: "CyberGrid Systems", logo: "CG", industry: "technology", size: "small", location: "international", asset_class: "equity", risk: "high", keywords: ["cloud", "security", "ai"] },
  { symbol: "SEEDC", name: "SeedCore AgriTech", logo: "SC", industry: "agriculture", size: "small", location: "domestic", asset_class: "equity", risk: "high", keywords: ["agri", "inputs", "rural"] },
  { symbol: "URBNR", name: "UrbanRail Infra", logo: "UR", industry: "infrastructure", size: "large", location: "domestic", asset_class: "equity", risk: "medium", keywords: ["transport", "rail", "capital goods"] },
  { symbol: "GLBEX", name: "Global Export Basket", logo: "GE", industry: "industrials", size: "medium", location: "international", asset_class: "equity", risk: "medium", keywords: ["export", "manufacturing", "cyclical"] },
  { symbol: "CLNEN", name: "CleanEdge Renewables", logo: "CR", industry: "energy", size: "small", location: "international", asset_class: "equity", risk: "high", keywords: ["solar", "renewables", "esg"] },
  { symbol: "INDBD", name: "India Corporate Bond Basket", logo: "IB", industry: "fixed_income", size: "large", location: "domestic", asset_class: "debt", risk: "low", keywords: ["bond", "yield", "stability"] },
  { symbol: "SHRTD", name: "Short Duration Income Fund", logo: "SD", industry: "fixed_income", size: "medium", location: "domestic", asset_class: "debt", risk: "low", keywords: ["duration", "income", "debt"] },
  { symbol: "GILT5", name: "Gilt 5Y Shield", logo: "GS", industry: "fixed_income", size: "large", location: "domestic", asset_class: "debt", risk: "low", keywords: ["sovereign", "gilt", "defensive"] },
  { symbol: "HYBND", name: "Hybrid Bond Opportunity", logo: "HB", industry: "fixed_income", size: "medium", location: "international", asset_class: "debt", risk: "medium", keywords: ["credit", "carry", "income"] },
  { symbol: "GOLDX", name: "Auric Gold Trust", logo: "AG", industry: "commodities", size: "large", location: "international", asset_class: "gold", risk: "medium", keywords: ["gold", "hedge", "inflation"] },
  { symbol: "SILVR", name: "Silverline Metals ETF", logo: "SM", industry: "commodities", size: "medium", location: "international", asset_class: "gold", risk: "medium", keywords: ["metals", "hedge", "inflation"] },
  { symbol: "CASHP", name: "Prime Cash Reserve Fund", logo: "PC", industry: "money_market", size: "large", location: "domestic", asset_class: "cash", risk: "low", keywords: ["liquidity", "cash", "reserve"] },
  { symbol: "LIQID", name: "Liquid Income Plus", logo: "LP", industry: "money_market", size: "medium", location: "domestic", asset_class: "cash", risk: "low", keywords: ["liquid", "short-term", "cash"] },
];

export type PageClassification = {
  badgeLabel: string;
  /** True when RBI/rates Day-1 scripted explain path is available (keyword heuristic). */
  isDemoHeuristic: boolean;
  tickers: string[];
};

const MARKET_KEYWORDS = [
  "stock",
  "stocks",
  "equity",
  "market",
  "nasdaq",
  "s&p",
  "earnings",
  "revenue",
  "gdp",
  "inflation",
  "fed",
  "fomc",
  "interest rate",
  "rates ",
  "rbi",
  "reserve bank",
  "bond",
  "yield",
  "crypto",
  "bitcoin",
];

function extractTickers(signal: string): string[] {
  const tickers = new Set<string>();
  const upperSig = signal.toUpperCase();
  const bracket = /\$([A-Z]{1,6})\b/g;
  let m: RegExpExecArray | null;
  while ((m = bracket.exec(upperSig)) !== null) {
    tickers.add(m[1]!);
  }
  const word = /\b([A-Z]{2,6})\s+stock\b/g;
  while ((m = word.exec(upperSig)) !== null) {
    tickers.add(m[1]!);
  }
  return [...tickers].slice(0, 5);
}

/**
 * Lightweight client classifier (regex / keyword map). Replace with `/api/kuber/classify`
 * later without changing extension wiring.
 */
export function classifyPage(title: string, url: string, excerpt: string): PageClassification {
  const signal = `${title}\n${url}\n${excerpt}`.toLowerCase();
  const tickers = extractTickers(`${title} ${excerpt}`);

  const isRateStory =
    signal.includes("rbi") ||
    signal.includes("reserve bank of india") ||
    /\binterest rate\b/i.test(signal) ||
    /\brates?\b/i.test(signal);

  let badgeLabel = "General";
  let isDemoHeuristic = false;

  if (tickers.length > 0) {
    badgeLabel = `Markets (${tickers[0]})`;
  }

  if (isRateStory) {
    badgeLabel = "Rates & policy";
    isDemoHeuristic = true;
  } else if (MARKET_KEYWORDS.some((kw) => signal.includes(kw))) {
    badgeLabel = tickers.length > 0 ? `Markets · ${tickers[0]}` : "Markets";
  }

  return { badgeLabel, isDemoHeuristic, tickers };
}

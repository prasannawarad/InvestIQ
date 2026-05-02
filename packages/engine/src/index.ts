import type {
  Portfolio,
  Holding,
  UserProfile,
  Goal,
  Trade,
  GoalImpact,
  RebalanceRecommendation,
} from "@investiq/data";
import { INVEST_UNIVERSE, type UniverseCandidate } from "./universe";

export type { UniverseCandidate } from "./universe";

/** Resolve mock-universe meta for discovery commits (symbols from `generateMatches`). */
export function getUniverseCandidateBySymbol(symbol: string): UniverseCandidate | undefined {
  const s = symbol.trim().toUpperCase();
  return INVEST_UNIVERSE.find((c) => c.symbol.toUpperCase() === s);
}

// ---------------------------------------------------------------------------
// Scenarios — Person 3 implements
// ---------------------------------------------------------------------------

export type ScenarioName =
  | "market-drop-20"
  | "market-drop-30"
  | "inflation-stays-high"
  | "withdraw-20-percent"
  | "lose-job-need-emergency";

export interface ScenarioResult {
  scenario: ScenarioName;
  projected_total_value: number;
  projected_allocation: Record<string, number>;
  goal_impacts: GoalImpact[];
  needs_action: boolean;
  human_summary: string; // engine-generated one-liner; Kuber rephrases
}

const KNOWN_ASSET_CLASSES = ["equity", "debt", "gold", "cash"] as const;

type KnownAssetClass = (typeof KNOWN_ASSET_CLASSES)[number];

const EXPECTED_ANNUAL_RETURNS: Record<KnownAssetClass, number> = {
  equity: 0.08,
  debt: 0.06,
  gold: 0.04,
  cash: 0.01,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeAllocation(classValues: Record<KnownAssetClass, number>): Record<string, number> {
  const total = Object.values(classValues).reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    return { equity: 0, debt: 0, gold: 0, cash: 0 };
  }

  return {
    equity: round2((classValues.equity / total) * 100),
    debt: round2((classValues.debt / total) * 100),
    gold: round2((classValues.gold / total) * 100),
    cash: round2((classValues.cash / total) * 100),
  };
}

function getClassValues(portfolio: Portfolio): Record<KnownAssetClass, number> {
  const total = Number(portfolio.summary.total_value ?? 0);
  const allocation = portfolio.allocation.by_asset_class as Record<string, number>;

  return {
    equity: (Number(allocation.equity ?? 0) / 100) * total,
    debt: (Number(allocation.debt ?? 0) / 100) * total,
    gold: (Number(allocation.gold ?? 0) / 100) * total,
    cash: (Number(allocation.cash ?? 0) / 100) * total,
  };
}

function monthsBetween(asOfIso: string, targetIso: string): number {
  const start = new Date(asOfIso);
  const end = new Date(targetIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return 0;

  const yearDiff = end.getUTCFullYear() - start.getUTCFullYear();
  const monthDiff = end.getUTCMonth() - start.getUTCMonth();
  let result = yearDiff * 12 + monthDiff;
  if (end.getUTCDate() > start.getUTCDate()) result += 1;
  return Math.max(0, result);
}

function holdingsForAssetClass(portfolio: Portfolio, assetClass: KnownAssetClass): Holding[] {
  return portfolio.holdings
    .filter((holding) => holding.asset_class === assetClass)
    .sort((a, b) => {
      if (b.current_value !== a.current_value) return b.current_value - a.current_value;
      return a.symbol.localeCompare(b.symbol);
    });
}

function fallbackHolding(assetClass: KnownAssetClass): { symbol: string; name: string } {
  if (assetClass === "debt") return { symbol: "DEBT_BASKET", name: "Debt Allocation Basket" };
  if (assetClass === "gold") return { symbol: "GOLD_BASKET", name: "Gold Allocation Basket" };
  if (assetClass === "cash") return { symbol: "CASH_RESERVE", name: "Cash Reserve" };
  return { symbol: "EQUITY_BASKET", name: "Equity Allocation Basket" };
}

/** Deterministic per portfolio so different users see different trade legs; same portfolio stays stable across reloads. */
function portfolioShuffleSeed(portfolioId: string, salt: string): number {
  let h = 2166136261;
  const str = `${portfolioId}:${salt}`;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

type TradeTarget = { symbol: string; name: string; weight: number };

function pickTradeTargets(
  portfolio: Portfolio,
  assetClass: KnownAssetClass,
  source: RebalanceSource,
  action: "buy" | "sell"
): TradeTarget[] {
  const holdings = holdingsForAssetClass(portfolio, assetClass);

  if (holdings.length === 0) {
    const fallback = fallbackHolding(assetClass);
    return [{ ...fallback, weight: 1 }];
  }

  if (action === "sell" && assetClass === "equity") {
    if (source === "scenario" && holdings.length >= 3) {
      return [
        { symbol: holdings[1].symbol, name: holdings[1].name, weight: 0.55 },
        { symbol: holdings[2].symbol, name: holdings[2].name, weight: 0.45 },
      ];
    }
    if (source === "panic" && holdings.length >= 4) {
      return [
        { symbol: holdings[3].symbol, name: holdings[3].name, weight: 0.5 },
        { symbol: holdings[0].symbol, name: holdings[0].name, weight: 0.5 },
      ];
    }
  }

  const seed = portfolioShuffleSeed(portfolio.portfolio_id, `${assetClass}-${action}`);
  const idx = holdings.length <= 1 ? 0 : seed % holdings.length;
  return [{ symbol: holdings[idx].symbol, name: holdings[idx].name, weight: 1 }];
}

function splitTradeAmount(totalAmount: number, targets: TradeTarget[]): Array<{ symbol: string; name: string; amount: number }> {
  if (targets.length === 0 || totalAmount <= 0) return [];
  const weightTotal = targets.reduce((sum, target) => sum + target.weight, 0);
  if (weightTotal <= 0) return [];

  const legs: Array<{ symbol: string; name: string; amount: number }> = [];
  let remaining = round2(totalAmount);

  for (let i = 0; i < targets.length; i += 1) {
    const target = targets[i];
    const isLast = i === targets.length - 1;
    const amount = isLast ? remaining : round2((totalAmount * target.weight) / weightTotal);
    const normalized = Math.max(0, amount);
    remaining = round2(remaining - normalized);
    if (normalized > 0) {
      legs.push({ symbol: target.symbol, name: target.name, amount: normalized });
    }
  }

  return legs;
}

function tradeAssetClass(symbol: string, portfolio: Portfolio): KnownAssetClass {
  const holding = portfolio.holdings.find((item) => item.symbol === symbol);
  if (!holding) {
    if (symbol.includes("DEBT")) return "debt";
    if (symbol.includes("GOLD")) return "gold";
    if (symbol.includes("CASH")) return "cash";
    return "equity";
  }
  return holding.asset_class as KnownAssetClass;
}

function buildGoalList(portfolio: Portfolio): Goal[] {
  const maybePortfolioWithGoals = portfolio as unknown as { goals?: Goal[] };
  return maybePortfolioWithGoals.goals ?? [];
}

export function simulateScenario(
  portfolio: Portfolio,
  scenario: ScenarioName
): ScenarioResult {
  const originalTotal = Number(portfolio.summary.total_value ?? 0);
  const classValues = getClassValues(portfolio);
  const nextClassValues = { ...classValues };

  if (scenario === "market-drop-20") {
    nextClassValues.equity *= 0.8;
    nextClassValues.debt *= 0.95;
    nextClassValues.gold *= 1.08;
  } else if (scenario === "market-drop-30") {
    nextClassValues.equity *= 0.7;
    nextClassValues.debt *= 0.92;
    nextClassValues.gold *= 1.12;
  } else if (scenario === "inflation-stays-high") {
    nextClassValues.debt *= 0.93;
    nextClassValues.gold *= 1.1;
  } else if (scenario === "withdraw-20-percent") {
    nextClassValues.equity *= 0.8;
    nextClassValues.debt *= 0.8;
    nextClassValues.gold *= 0.8;
    nextClassValues.cash *= 0.8;
  } else if (scenario === "lose-job-need-emergency") {
    nextClassValues.equity *= 0.9;
    nextClassValues.debt *= 0.97;
    nextClassValues.gold *= 1.04;

    const stressedTotal =
      nextClassValues.equity + nextClassValues.debt + nextClassValues.gold + nextClassValues.cash;
    const emergencyNeed = originalTotal * 0.2;
    const postEmergency = Math.max(0, stressedTotal - emergencyNeed);
    const scale = stressedTotal <= 0 ? 1 : postEmergency / stressedTotal;
    nextClassValues.equity *= scale;
    nextClassValues.debt *= scale;
    nextClassValues.gold *= scale;
    nextClassValues.cash *= scale;
  }

  const projectedTotal =
    nextClassValues.equity + nextClassValues.debt + nextClassValues.gold + nextClassValues.cash;
  const projectedAllocation = normalizeAllocation(nextClassValues);
  const lossPercent = originalTotal <= 0 ? 0 : ((projectedTotal - originalTotal) / originalTotal) * 100;
  const goalImpacts = computeGoalImpact(portfolio, [], buildGoalList(portfolio));

  const needsAction =
    scenario === "market-drop-30" ||
    scenario === "lose-job-need-emergency" ||
    lossPercent <= -10 ||
    (scenario === "withdraw-20-percent" && projectedTotal < originalTotal * 0.85);

  const humanSummary =
    scenario === "market-drop-20"
      ? `Portfolio may drop about ${Math.abs(lossPercent).toFixed(1)}% in this scenario; avoid panic trading.`
      : scenario === "market-drop-30"
        ? `This is a severe drawdown scenario with about ${Math.abs(lossPercent).toFixed(1)}% decline.`
        : scenario === "inflation-stays-high"
          ? "Sticky inflation may pressure debt while gold can cushion part of the impact."
          : scenario === "withdraw-20-percent"
            ? "A 20% withdrawal reduces compounding power; prioritize liquidity before new risk."
            : "Emergency stress indicates liquidity risk; raise cash buffer and reduce concentrated risk.";

  return {
    scenario,
    projected_total_value: round2(projectedTotal),
    projected_allocation: projectedAllocation,
    goal_impacts: goalImpacts,
    needs_action: needsAction,
    human_summary: humanSummary,
  };
}

// ---------------------------------------------------------------------------
// Rebalance — Person 3 implements
// ---------------------------------------------------------------------------

export type RebalanceSource = "drift" | "scenario" | "panic" | "discover";

export function recommendRebalance(
  portfolio: Portfolio,
  target: Record<string, number>,
  source: RebalanceSource
): RebalanceRecommendation {
  const total = Number(portfolio.summary.total_value ?? 0);
  const current = portfolio.allocation.by_asset_class as Record<string, number>;
  const baseValues = getClassValues(portfolio);
  const threshold = source === "panic" ? 3 : 5;
  const adjustment = source === "panic" ? 0.6 : source === "scenario" ? 0.85 : 1;
  const minTradePct = source === "scenario" ? 0.08 : source === "panic" ? 0.04 : 0.06;
  const classes: KnownAssetClass[] = [...KNOWN_ASSET_CLASSES];
  const trades: Trade[] = [];

  if (source === "discover") {
    const budget = Math.max(100, round2(total * 0.03));
    const underweights = classes
      .map((assetClass) => ({
        assetClass,
        gap: Math.max(0, Number(target[assetClass] ?? 0) - Number(current[assetClass] ?? 0)),
      }))
      .filter((item) => item.gap > 0);

    const bucket = underweights.length > 0 ? underweights : [{ assetClass: "equity" as const, gap: 1 }];
    const gapTotal = bucket.reduce((sum, item) => sum + item.gap, 0);

    for (const item of bucket) {
      const amount = round2((budget * item.gap) / gapTotal);
      if (amount <= 0) continue;
      const firstTarget = pickTradeTargets(portfolio, item.assetClass, source, "buy")[0];
      trades.push({
        action: "buy",
        symbol: firstTarget.symbol,
        name: firstTarget.name,
        amount_usd: amount,
        reason: `Add new money to improve ${item.assetClass} balance without selling current holdings.`,
      });
    }
  } else {
    const sellPlan: { assetClass: KnownAssetClass; amount: number }[] = [];
    const buyPlan: { assetClass: KnownAssetClass; amount: number }[] = [];

    for (const assetClass of classes) {
      const drift = Number(current[assetClass] ?? 0) - Number(target[assetClass] ?? 0);
      if (drift >= threshold) {
        const rawAmount = total * ((drift - threshold + 1) / 100) * adjustment;
        const floorAmount = total * minTradePct;
        const amount = round2(Math.max(rawAmount, floorAmount));
        if (amount > 0) sellPlan.push({ assetClass, amount });
      } else if (drift <= -threshold) {
        const rawAmount = total * ((Math.abs(drift) - threshold + 1) / 100) * adjustment;
        const floorAmount = total * minTradePct;
        const amount = round2(Math.max(rawAmount, floorAmount));
        if (amount > 0) buyPlan.push({ assetClass, amount });
      }
    }

    const totalSells = sellPlan.reduce((sum, item) => sum + item.amount, 0);
    const totalBuys = buyPlan.reduce((sum, item) => sum + item.amount, 0);
    const buyScale = totalBuys <= 0 || totalSells <= 0 ? 0 : Math.min(1, totalSells / totalBuys);

    for (const item of sellPlan) {
      const targets = pickTradeTargets(portfolio, item.assetClass, source, "sell");
      const legs = splitTradeAmount(round2(item.amount), targets);
      for (const leg of legs) {
        trades.push({
          action: "sell",
          symbol: leg.symbol,
          name: leg.name,
          amount_usd: leg.amount,
          reason: source === "panic"
            ? `Trim ${item.assetClass} gradually to reduce downside risk.`
            : `Trim overweight ${item.assetClass} back toward target.`,
        });
      }
    }

    for (const item of buyPlan) {
      const amount = round2(item.amount * buyScale);
      if (amount <= 0) continue;
      const targets = pickTradeTargets(portfolio, item.assetClass, source, "buy");
      const legs = splitTradeAmount(amount, targets);
      for (const leg of legs) {
        trades.push({
          action: "buy",
          symbol: leg.symbol,
          name: leg.name,
          amount_usd: leg.amount,
          reason:
            source === "scenario"
              ? `Restore ${item.assetClass} allocation after scenario stress.`
              : `Refill underweight ${item.assetClass} toward target.`,
        });
      }
    }
  }

  const nextValues = { ...baseValues };
  let taxCost = 0;

  for (const trade of trades) {
    const assetClass = tradeAssetClass(trade.symbol, portfolio);
    if (trade.action === "sell") {
      nextValues[assetClass] = Math.max(0, nextValues[assetClass] - trade.amount_usd);

      const holding = portfolio.holdings.find((item) => item.symbol === trade.symbol);
      const metadata = (holding as unknown as { metadata?: { purchase_date?: string } })?.metadata;
      const purchaseDate = metadata?.purchase_date ? new Date(metadata.purchase_date) : null;
      const isLongTerm =
        purchaseDate != null && !Number.isNaN(purchaseDate.getTime()) && Date.now() - purchaseDate.getTime() >= 365 * 24 * 60 * 60 * 1000;
      const gainPct = clamp(Number(holding?.unrealized_pnl_percent ?? 0) / 100, 0, 1);
      if (isLongTerm) {
        taxCost += trade.amount_usd * gainPct * 0.1;
      }
    } else {
      nextValues[assetClass] += trade.amount_usd;
    }
  }

  const goalImpacts = computeGoalImpact(portfolio, trades, buildGoalList(portfolio));

  return {
    source,
    trades,
    before_allocation: {
      equity: round2(Number(current.equity ?? 0)),
      debt: round2(Number(current.debt ?? 0)),
      gold: round2(Number(current.gold ?? 0)),
      cash: round2(Number(current.cash ?? 0)),
    },
    after_allocation: normalizeAllocation(nextValues),
    tax_cost_usd: round2(taxCost),
    fees_usd: 0,
    goal_impacts: goalImpacts,
    rationale_summary:
      source === "panic"
        ? "Smaller defensive moves to improve resilience while avoiding over-trading."
        : source === "scenario"
          ? "Rebalance after stress scenario by trimming drifts and restoring core allocation."
          : source === "discover"
            ? "Deploy only new money into underweight buckets; no forced sells."
            : "Routine drift rebalance to realign with target risk.",
  };
}

// ---------------------------------------------------------------------------
// Fit score — Person 3 implements
// ---------------------------------------------------------------------------

export function computeFitScore(holding: Holding, userProfile: UserProfile): number {
  const tolerance = userProfile.risk_profile.risk_tolerance;
  const desiredRisk = tolerance === "low" ? 35 : tolerance === "high" ? 75 : 55;
  const holdingRisk =
    holding.asset_class === "equity" ? 75 : holding.asset_class === "gold" ? 55 : holding.asset_class === "debt" ? 35 : 20;
  const riskAlignment = clamp(100 - Math.abs(desiredRisk - holdingRisk) * 1.4, 0, 100);

  const now = new Date();
  const nearestGoalMonths = userProfile.goals.reduce((min, goal) => {
    const months = monthsBetween(now.toISOString(), goal.target_date);
    return Math.min(min, months > 0 ? months : min);
  }, Number.POSITIVE_INFINITY);

  let horizonFit = 85;
  if (nearestGoalMonths <= 36) {
    horizonFit = holding.asset_class === "equity" ? 55 : holding.asset_class === "debt" ? 90 : holding.asset_class === "gold" ? 78 : 72;
  } else if (nearestGoalMonths <= 84) {
    horizonFit = holding.asset_class === "equity" ? 84 : holding.asset_class === "debt" ? 84 : holding.asset_class === "gold" ? 80 : 70;
  } else {
    horizonFit = holding.asset_class === "equity" ? 94 : holding.asset_class === "debt" ? 78 : holding.asset_class === "gold" ? 74 : 62;
  }

  const maxSingleHolding =
    tolerance === "low" ? 10 : tolerance === "high" ? 24 : 16;
  const concentrationFit =
    holding.weight_in_portfolio <= maxSingleHolding
      ? 100
      : clamp(100 - (holding.weight_in_portfolio - maxSingleHolding) * 5, 20, 100);

  const diversificationFit =
    holding.sector === "diversified" || holding.asset_class === "debt" || holding.asset_class === "gold" ? 88 : 72;

  const score =
    riskAlignment * 0.4 +
    horizonFit * 0.3 +
    concentrationFit * 0.2 +
    diversificationFit * 0.1;

  return Math.round(clamp(score, 0, 100));
}

// ---------------------------------------------------------------------------
// Goal impact — Person 3 implements
// ---------------------------------------------------------------------------

export function computeGoalImpact(
  portfolio: Portfolio,
  trades: Trade[],
  goals: Goal[]
): GoalImpact[] {
  if (goals.length === 0) return [];

  const currentValues = getClassValues(portfolio);
  const projectedValues = { ...currentValues };

  for (const trade of trades) {
    const assetClass = tradeAssetClass(trade.symbol, portfolio);
    if (trade.action === "sell") {
      projectedValues[assetClass] = Math.max(0, projectedValues[assetClass] - trade.amount_usd);
    } else {
      projectedValues[assetClass] += trade.amount_usd;
    }
  }

  const currentAllocation = normalizeAllocation(currentValues);
  const projectedAllocation = normalizeAllocation(projectedValues);

  const currentReturn =
    (currentAllocation.equity / 100) * EXPECTED_ANNUAL_RETURNS.equity +
    (currentAllocation.debt / 100) * EXPECTED_ANNUAL_RETURNS.debt +
    (currentAllocation.gold / 100) * EXPECTED_ANNUAL_RETURNS.gold +
    (currentAllocation.cash / 100) * EXPECTED_ANNUAL_RETURNS.cash;

  const projectedReturn =
    (projectedAllocation.equity / 100) * EXPECTED_ANNUAL_RETURNS.equity +
    (projectedAllocation.debt / 100) * EXPECTED_ANNUAL_RETURNS.debt +
    (projectedAllocation.gold / 100) * EXPECTED_ANNUAL_RETURNS.gold +
    (projectedAllocation.cash / 100) * EXPECTED_ANNUAL_RETURNS.cash;

  function estimateRequiredContribution(
    principal: number,
    targetAmount: number,
    months: number,
    annualReturn: number
  ): number {
    if (months <= 0 || principal >= targetAmount) return 0;
    const monthlyRate = annualReturn / 12;
    if (Math.abs(monthlyRate) < 1e-9) {
      return Math.max(0, (targetAmount - principal) / months);
    }

    const growth = (1 + monthlyRate) ** months;
    const numerator = (targetAmount - principal * growth) * monthlyRate;
    const denominator = growth - 1;
    if (Math.abs(denominator) < 1e-9) return 0;
    return Math.max(0, numerator / denominator);
  }

  function monthsToReachTarget(
    principal: number,
    targetAmount: number,
    monthlyContribution: number,
    annualReturn: number
  ): number {
    if (principal >= targetAmount) return 0;
    const monthlyRate = annualReturn / 12;
    let value = principal;
    for (let month = 1; month <= 1200; month += 1) {
      value = value * (1 + monthlyRate) + monthlyContribution;
      if (value >= targetAmount) return month;
    }
    return 1200;
  }

  return goals.map((goal) => {
    const monthsWindow = monthsBetween(portfolio.as_of, goal.target_date);
    const requiredContribution = estimateRequiredContribution(
      goal.current_progress,
      goal.target_amount,
      Math.max(1, monthsWindow),
      currentReturn
    );

    const beforeMonths = monthsToReachTarget(
      goal.current_progress,
      goal.target_amount,
      requiredContribution,
      currentReturn
    );
    const afterMonths = monthsToReachTarget(
      goal.current_progress,
      goal.target_amount,
      requiredContribution,
      projectedReturn
    );

    return {
      goal_id: goal.goal_id,
      goal_name: goal.name,
      delta_months: afterMonths - beforeMonths,
    };
  });
}

export type DiscoveryFilters = {
  money_to_invest: number;
  per_position_cap: number;
  industries: string[];
  sizes: Array<"small" | "medium" | "large">;
  risk: "low" | "medium" | "high";
  asset_classes: Array<"equity" | "debt" | "gold" | "cash">;
  geography: Array<"domestic" | "international">;
  keywords: string[];
};

export type MatchCandidate = {
  symbol: string;
  name: string;
  logo: string;
  industry: string;
  size: "small" | "medium" | "large";
  location: "domestic" | "international";
  match_score: number;
  why_match: string[];
};

function riskDistance(a: "low" | "medium" | "high", b: "low" | "medium" | "high"): number {
  const map = { low: 1, medium: 2, high: 3 };
  return Math.abs(map[a] - map[b]);
}

function keywordMatchScore(candidate: UniverseCandidate, filters: DiscoveryFilters): number {
  if (filters.keywords.length === 0) return 70;
  const keys = filters.keywords.map((item) => item.toLowerCase());
  const hits = keys.filter((key) => candidate.keywords.some((word) => word.includes(key))).length;
  return clamp((hits / keys.length) * 100, 0, 100);
}

export function generateMatches(
  filters: DiscoveryFilters,
  userProfile: UserProfile,
  portfolio: Portfolio
): MatchCandidate[] {
  const currentAllocation = portfolio.allocation.by_asset_class as Record<string, number>;
  const targetAllocation = portfolio.allocation.target_allocation as Record<string, number>;
  const sectorWeight = portfolio.holdings.reduce<Record<string, number>>((acc, holding) => {
    acc[holding.sector] = (acc[holding.sector] ?? 0) + holding.weight_in_portfolio;
    return acc;
  }, {});

  const effectiveRisk = filters.risk || userProfile.risk_profile.risk_tolerance;
  const underweights = KNOWN_ASSET_CLASSES.reduce<Record<string, number>>((acc, key) => {
    acc[key] = Math.max(0, Number(targetAllocation[key] ?? 0) - Number(currentAllocation[key] ?? 0));
    return acc;
  }, {});

  const scored = INVEST_UNIVERSE.map((candidate) => {
    const industryScore =
      filters.industries.length === 0
        ? 70
        : filters.industries.map((item) => item.toLowerCase()).includes(candidate.industry)
          ? 100
          : 35;
    const sizeScore =
      filters.sizes.length === 0 ? 70 : filters.sizes.includes(candidate.size) ? 100 : 30;
    const riskScore = [100, 60, 25][riskDistance(candidate.risk, effectiveRisk)];
    const diversificationScore =
      sectorWeight[candidate.industry] == null
        ? 100
        : sectorWeight[candidate.industry] <= 10
          ? 90
          : sectorWeight[candidate.industry] <= 20
            ? 70
            : 45;
    const keywordsScore = keywordMatchScore(candidate, filters);

    let score =
      industryScore * 0.3 +
      sizeScore * 0.2 +
      riskScore * 0.2 +
      diversificationScore * 0.2 +
      keywordsScore * 0.1;

    if (filters.asset_classes.length > 0 && !filters.asset_classes.includes(candidate.asset_class)) {
      score -= 25;
    }
    if (filters.geography.length > 0 && !filters.geography.includes(candidate.location)) {
      score -= 12;
    }

    score += Math.min(10, underweights[candidate.asset_class] ?? 0);
    score = clamp(score, 0, 100);

    const why = [
      industryScore >= 80 ? "Industry preference match" : "Adds sector diversification",
      riskScore >= 80 ? "Aligned with your risk profile" : "Risk level is within acceptable range",
      (underweights[candidate.asset_class] ?? 0) > 0
        ? `Fills your ${candidate.asset_class} allocation gap`
        : "Complements your existing allocation",
    ];

    return {
      symbol: candidate.symbol,
      name: candidate.name,
      logo: candidate.logo,
      industry: candidate.industry,
      size: candidate.size,
      location: candidate.location,
      match_score: Math.round(score),
      why_match: why,
    } satisfies MatchCandidate;
  });

  const sorted = scored.sort((a, b) => b.match_score - a.match_score);
  return sorted.slice(0, Math.min(10, Math.max(6, sorted.length)));
}

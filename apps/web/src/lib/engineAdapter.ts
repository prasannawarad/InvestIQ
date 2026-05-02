import type { Goal, MarketContext, Portfolio, UserProfile } from "@investiq/data";
import type { SupabaseDashboardData, JsonRecord } from "./supabaseData";

function toNumber(value: unknown, fallback = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function toRiskLevel(value: unknown): "low" | "medium" | "high" {
  if (value === "low" || value === "medium" || value === "high") return value;
  return "medium";
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object") return value as Record<string, unknown>;
  return {};
}

function mapGoals(data: SupabaseDashboardData): Goal[] {
  return data.goals.map((goal) => ({
    goal_id: goal.external_goal_id || goal.id,
    name: goal.name,
    target_amount: toNumber(goal.target_amount),
    current_progress: toNumber(goal.current_progress),
    target_date: goal.target_date,
    priority:
      goal.priority === "low" || goal.priority === "medium" || goal.priority === "high"
        ? goal.priority
        : "medium",
    flexibility:
      goal.flexibility === "low" || goal.flexibility === "medium" || goal.flexibility === "high"
        ? goal.flexibility
        : "medium",
  }));
}

export function mapDashboardToUserProfile(data: SupabaseDashboardData): UserProfile {
  const financial = asRecord(data.profile.financial_context);
  const risk = asRecord(data.profile.risk_profile);
  const preferences = asRecord(data.profile.preferences);

  return {
    user_id: data.profile.id,
    version: "supabase-1",
    identity: {
      name: data.profile.name,
      age: toNumber(data.profile.age),
      occupation: data.profile.occupation,
      location: data.profile.location,
      currency: data.profile.currency || data.portfolio.currency,
    },
    financial_context: {
      annual_income: toNumber(financial.annual_income),
      monthly_savings_capacity: toNumber(financial.monthly_savings_capacity),
      dependents: toNumber(financial.dependents),
      emergency_fund_months: toNumber(financial.emergency_fund_months),
    },
    risk_profile: {
      persona: String(risk.persona ?? "balanced"),
      persona_label: String(risk.persona_label ?? "Balanced"),
      risk_score: toNumber(risk.risk_score, 5),
      risk_capacity: toRiskLevel(risk.risk_capacity),
      risk_tolerance: toRiskLevel(risk.risk_tolerance),
    },
    goals: mapGoals(data),
    preferences: {
      communication_tone: String(preferences.communication_tone ?? "friendly_simple"),
      explanation_depth: String(preferences.explanation_depth ?? "beginner"),
    },
  };
}

export function mapDashboardToPortfolio(data: SupabaseDashboardData): Portfolio {
  const summary = asRecord(data.portfolio.summary);
  const allocation = asRecord(data.portfolio.allocation);
  const byAsset = asRecord(allocation.by_asset_class);
  const targetAllocation = asRecord(allocation.target_allocation);

  return {
    portfolio_id: data.portfolio.external_portfolio_id || data.portfolio.id,
    user_id: data.profile.id,
    as_of: data.portfolio.as_of,
    currency: data.portfolio.currency,
    summary: {
      total_value: toNumber(summary.total_value),
      total_invested: toNumber(summary.total_invested),
      total_returns: toNumber(summary.total_returns),
      returns_percent: toNumber(summary.returns_percent),
      day_change_value: toNumber(summary.day_change_value),
      day_change_percent: toNumber(summary.day_change_percent),
      health_score: toNumber(summary.health_score),
    },
    allocation: {
      by_asset_class: {
        equity: toNumber(byAsset.equity),
        debt: toNumber(byAsset.debt),
        gold: toNumber(byAsset.gold),
        cash: toNumber(byAsset.cash),
      },
      target_allocation: {
        equity: toNumber(targetAllocation.equity),
        debt: toNumber(targetAllocation.debt),
        gold: toNumber(targetAllocation.gold),
        cash: toNumber(targetAllocation.cash),
      },
      drift_from_target: toNumber(allocation.drift_from_target),
    },
    holdings: data.holdings.map((holding) => ({
      holding_id: holding.external_holding_id || holding.id,
      symbol: holding.symbol,
      name: holding.name,
      asset_class:
        holding.asset_class === "equity" ||
        holding.asset_class === "debt" ||
        holding.asset_class === "gold" ||
        holding.asset_class === "cash"
          ? holding.asset_class
          : "equity",
      subcategory: holding.subcategory,
      sector: holding.sector,
      quantity: toNumber(holding.quantity),
      avg_buy_price: toNumber(holding.avg_buy_price),
      current_price: toNumber(holding.current_price),
      current_value: toNumber(holding.current_value),
      unrealized_pnl: toNumber(holding.unrealized_pnl),
      unrealized_pnl_percent: toNumber(holding.unrealized_pnl_percent),
      weight_in_portfolio: toNumber(holding.weight_in_portfolio),
      metadata: (holding.metadata as JsonRecord | null) ?? undefined,
    })),
  };
}

export function mapDashboardToMarketContext(data: SupabaseDashboardData): MarketContext {
  const marketSnapshot = asRecord(data.marketContext?.market_snapshot);
  const macroContext = asRecord(data.marketContext?.macro_context);

  return {
    market_context_id: data.marketContext?.external_market_context_id ?? "market-context",
    as_of: data.marketContext?.as_of ?? new Date().toISOString(),
    market_snapshot: {
      sentiment: String(marketSnapshot.sentiment ?? "neutral"),
      volatility_regime: String(marketSnapshot.volatility_regime ?? "normal"),
    },
    macro_context: {
      interest_rate: toNumber(macroContext.interest_rate),
      inflation_rate: toNumber(macroContext.inflation_rate),
    },
    recent_events: data.marketEvents.map((event) => ({
      event_id: event.external_event_id || event.id,
      headline: event.headline,
      category: event.category,
      impact:
        event.impact === "negative" || event.impact === "neutral" || event.impact === "positive"
          ? event.impact
          : "neutral",
      relevance_to_user:
        event.relevance_to_user === "low" ||
        event.relevance_to_user === "moderate" ||
        event.relevance_to_user === "high"
          ? event.relevance_to_user
          : "moderate",
      plain_summary: event.plain_summary,
    })),
  };
}

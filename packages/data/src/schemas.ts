import { z } from "zod";

// ---------------------------------------------------------------------------
// User profile
// ---------------------------------------------------------------------------

export const GoalSchema = z.object({
  goal_id: z.string(),
  name: z.string(),
  target_amount: z.number(),
  current_progress: z.number(),
  target_date: z.string(),
  priority: z.enum(["low", "medium", "high"]),
  flexibility: z.enum(["low", "medium", "high"]),
});

export const UserProfileSchema = z.object({
  user_id: z.string(),
  version: z.string(),
  identity: z.object({
    name: z.string(),
    age: z.number(),
    occupation: z.string(),
    location: z.string(),
    currency: z.string(),
  }),
  financial_context: z.object({
    annual_income: z.number(),
    monthly_savings_capacity: z.number(),
    dependents: z.number(),
    emergency_fund_months: z.number(),
  }),
  risk_profile: z.object({
    persona: z.string(),
    persona_label: z.string(),
    risk_score: z.number(),
    risk_capacity: z.enum(["low", "medium", "high"]),
    risk_tolerance: z.enum(["low", "medium", "high"]),
  }),
  goals: z.array(GoalSchema),
  preferences: z.object({
    communication_tone: z.string(),
    explanation_depth: z.string(),
  }),
});

// ---------------------------------------------------------------------------
// Portfolio
// ---------------------------------------------------------------------------

export const HoldingSchema = z.object({
  holding_id: z.string(),
  symbol: z.string(),
  name: z.string(),
  asset_class: z.enum(["equity", "debt", "gold", "cash"]),
  subcategory: z.string(),
  sector: z.string(),
  quantity: z.number(),
  avg_buy_price: z.number(),
  current_price: z.number(),
  current_value: z.number(),
  unrealized_pnl: z.number(),
  unrealized_pnl_percent: z.number(),
  weight_in_portfolio: z.number(),
});

export const PortfolioSchema = z.object({
  portfolio_id: z.string(),
  user_id: z.string(),
  as_of: z.string(),
  currency: z.string(),
  summary: z.object({
    total_value: z.number(),
    total_invested: z.number(),
    total_returns: z.number(),
    returns_percent: z.number(),
    day_change_value: z.number(),
    day_change_percent: z.number(),
    health_score: z.number(),
  }),
  allocation: z.object({
    by_asset_class: z.record(z.number()),
    target_allocation: z.record(z.number()),
    drift_from_target: z.number(),
  }),
  holdings: z.array(HoldingSchema),
});

// ---------------------------------------------------------------------------
// Market context
// ---------------------------------------------------------------------------

export const MarketContextSchema = z.object({
  market_context_id: z.string(),
  as_of: z.string(),
  market_snapshot: z.object({
    sentiment: z.string(),
    volatility_regime: z.string(),
  }),
  macro_context: z.object({
    interest_rate: z.number(),
    inflation_rate: z.number(),
  }),
  recent_events: z.array(
    z.object({
      event_id: z.string(),
      headline: z.string(),
      category: z.string(),
      impact: z.enum(["negative", "neutral", "positive"]),
      relevance_to_user: z.enum(["low", "moderate", "high"]),
      plain_summary: z.string(),
    })
  ),
});

// ---------------------------------------------------------------------------
// Rebalance recommendation — produced by @investiq/engine, narrated by Kuber
// ---------------------------------------------------------------------------

export const TradeSchema = z.object({
  action: z.enum(["buy", "sell"]),
  symbol: z.string(),
  name: z.string(),
  amount_usd: z.number(),
  reason: z.string(),
});

export const GoalImpactSchema = z.object({
  goal_id: z.string(),
  goal_name: z.string(),
  delta_months: z.number(), // positive = goal pushed back, negative = brought closer
});

export const RebalanceRecommendationSchema = z.object({
  source: z.enum(["scenario", "drift", "discover", "panic"]),
  scenario_name: z.string().optional(),
  trades: z.array(TradeSchema),
  before_allocation: z.record(z.number()),
  after_allocation: z.record(z.number()),
  tax_cost_usd: z.number(),
  fees_usd: z.number(),
  goal_impacts: z.array(GoalImpactSchema),
  rationale_summary: z.string(), // one-line summary the engine produces; Kuber can rephrase
});

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type UserProfile = z.infer<typeof UserProfileSchema>;
export type Portfolio = z.infer<typeof PortfolioSchema>;
export type Holding = z.infer<typeof HoldingSchema>;
export type Goal = z.infer<typeof GoalSchema>;
export type MarketContext = z.infer<typeof MarketContextSchema>;
export type Trade = z.infer<typeof TradeSchema>;
export type GoalImpact = z.infer<typeof GoalImpactSchema>;
export type RebalanceRecommendation = z.infer<typeof RebalanceRecommendationSchema>;

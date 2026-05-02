import type { Portfolio, UserProfile, Goal } from "@investiq/data";
import {
  computeFitScore,
  computeGoalImpact,
  generateMatches,
  recommendRebalance,
  simulateScenario,
  type DiscoveryFilters,
} from "./index";

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

const sampleGoals: Goal[] = [
  {
    goal_id: "g1",
    name: "House down payment",
    target_amount: 2500000,
    current_progress: 400000,
    target_date: "2029-06-01",
    priority: "high",
    flexibility: "low",
  },
  {
    goal_id: "g2",
    name: "Retirement",
    target_amount: 30000000,
    current_progress: 1200000,
    target_date: "2052-01-01",
    priority: "high",
    flexibility: "medium",
  },
];

const sampleUser: UserProfile = {
  user_id: "u_001",
  version: "1.0",
  identity: {
    name: "Priya Sharma",
    age: 38,
    occupation: "Teacher",
    location: "Pune",
    currency: "INR",
  },
  financial_context: {
    annual_income: 850000,
    monthly_savings_capacity: 25000,
    dependents: 2,
    emergency_fund_months: 3,
  },
  risk_profile: {
    persona: "balanced",
    persona_label: "Balanced Ben",
    risk_score: 5,
    risk_capacity: "medium",
    risk_tolerance: "medium",
  },
  goals: sampleGoals,
  preferences: {
    communication_tone: "friendly_simple",
    explanation_depth: "beginner",
  },
};

const samplePortfolio: Portfolio = {
  portfolio_id: "p_001",
  user_id: "u_001",
  as_of: "2026-05-01T09:00:00Z",
  currency: "INR",
  summary: {
    total_value: 1875000,
    total_invested: 1650000,
    total_returns: 225000,
    returns_percent: 13.64,
    day_change_value: -12500,
    day_change_percent: -0.66,
    health_score: 72,
  },
  allocation: {
    by_asset_class: {
      equity: 65,
      debt: 25,
      gold: 5,
      cash: 5,
    },
    target_allocation: {
      equity: 60,
      debt: 30,
      gold: 5,
      cash: 5,
    },
    drift_from_target: 5,
  },
  holdings: [
    {
      holding_id: "h1",
      symbol: "NIFTY50_INDEX",
      name: "Nifty 50 Index Fund",
      asset_class: "equity",
      subcategory: "index_fund",
      sector: "diversified",
      quantity: 1000,
      avg_buy_price: 425,
      current_price: 478,
      current_value: 573600,
      unrealized_pnl: 63600,
      unrealized_pnl_percent: 12.47,
      weight_in_portfolio: 30.59,
    },
    {
      holding_id: "h2",
      symbol: "HDFC_CORP_BOND",
      name: "HDFC Corporate Bond Fund",
      asset_class: "debt",
      subcategory: "bond_fund",
      sector: "fixed_income",
      quantity: 4000,
      avg_buy_price: 28,
      current_price: 30,
      current_value: 120000,
      unrealized_pnl: 8000,
      unrealized_pnl_percent: 7.14,
      weight_in_portfolio: 6.4,
    },
    {
      holding_id: "h3",
      symbol: "GOLDBEES",
      name: "Gold ETF",
      asset_class: "gold",
      subcategory: "gold_etf",
      sector: "commodities",
      quantity: 200,
      avg_buy_price: 425,
      current_price: 468,
      current_value: 93600,
      unrealized_pnl: 8600,
      unrealized_pnl_percent: 10.12,
      weight_in_portfolio: 4.99,
    },
  ],
};

function testSimulateScenario(): void {
  const result = simulateScenario(samplePortfolio, "market-drop-20");
  assert(result.projected_total_value < samplePortfolio.summary.total_value, "market-drop-20 should reduce total");
  assert(result.projected_allocation.equity < 65, "equity allocation should reduce after market-drop-20");
}

function testRecommendRebalance(): void {
  const recommendation = recommendRebalance(
    samplePortfolio,
    { equity: 55, debt: 35, gold: 5, cash: 5 },
    "drift"
  );
  assert(recommendation.trades.length >= 1, "drift rebalance should produce at least one trade");
  assert(recommendation.fees_usd === 0, "fees should be zero for demo");
}

function testComputeFitScore(): void {
  const score = computeFitScore(samplePortfolio.holdings[0], sampleUser);
  assert(score >= 0 && score <= 100, "fit score should be bounded 0-100");
}

function testComputeGoalImpact(): void {
  const impacts = computeGoalImpact(samplePortfolio, [], sampleGoals);
  assert(impacts.length === sampleGoals.length, "goal impacts should align with goals");
}

function testGenerateMatches(): void {
  const filters: DiscoveryFilters = {
    money_to_invest: 500,
    per_position_cap: 200,
    industries: ["technology", "healthcare"],
    sizes: ["medium", "large"],
    risk: "medium",
    asset_classes: ["equity", "debt"],
    geography: ["domestic"],
    keywords: ["defensive", "platform"],
  };

  const matches = generateMatches(filters, sampleUser, samplePortfolio);
  assert(matches.length >= 6, "matches should return at least 6 results");
  assert(matches[0].match_score >= matches[matches.length - 1].match_score, "matches should be sorted desc");
}

function run(): void {
  testSimulateScenario();
  testRecommendRebalance();
  testComputeFitScore();
  testComputeGoalImpact();
  testGenerateMatches();
  console.log("engine tests passed");
}

run();

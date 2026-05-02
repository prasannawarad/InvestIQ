import { loadDemoData } from "@investiq/data";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEMO_USER } from "./demoUser";
import { isDemoUserId, isLocalDemoMode } from "./localDemo";

export type JsonRecord = Record<string, unknown>;

export type ProfileRow = {
  id: string;
  app_user_id: string;
  name: string;
  age: number;
  occupation: string;
  location: string;
  currency: string;
  financial_context: JsonRecord;
  risk_profile: JsonRecord;
  preferences: JsonRecord;
};

export type GoalRow = {
  id: string;
  user_id: string;
  external_goal_id: string;
  name: string;
  target_amount: number;
  current_progress: number;
  target_date: string;
  priority: string;
  flexibility: string;
};

export type PortfolioRow = {
  id: string;
  user_id: string;
  external_portfolio_id: string;
  as_of: string;
  currency: string;
  summary: JsonRecord;
  allocation: JsonRecord;
  risk_metrics: JsonRecord;
};

export type HoldingRow = {
  id: string;
  portfolio_id: string;
  user_id: string;
  external_holding_id: string;
  symbol: string;
  name: string;
  asset_class: string;
  subcategory: string;
  sector: string;
  quantity: number;
  avg_buy_price: number;
  current_price: number;
  current_value: number;
  unrealized_pnl: number;
  unrealized_pnl_percent: number;
  weight_in_portfolio: number;
  metadata: JsonRecord | null;
};

export type MarketContextRow = {
  id: string;
  external_market_context_id: string;
  as_of: string;
  market_snapshot: JsonRecord;
  macro_context: JsonRecord;
};

export type MarketEventRow = {
  id: string;
  market_context_id: string;
  external_event_id: string;
  headline: string;
  category: string;
  impact: string;
  relevance_to_user: string;
  plain_summary: string;
};

export type SupabaseDashboardData = {
  profile: ProfileRow;
  goals: GoalRow[];
  portfolio: PortfolioRow;
  holdings: HoldingRow[];
  marketContext: MarketContextRow | null;
  marketEvents: MarketEventRow[];
};

async function getLocalDemoDashboardData(): Promise<SupabaseDashboardData> {
  const { userProfile, portfolio, marketContext } = await loadDemoData();

  return {
    profile: {
      id: DEMO_USER.uuid,
      app_user_id: userProfile.user_id,
      name: userProfile.identity.name,
      age: userProfile.identity.age,
      occupation: userProfile.identity.occupation,
      location: userProfile.identity.location,
      currency: userProfile.identity.currency,
      financial_context: userProfile.financial_context as JsonRecord,
      risk_profile: userProfile.risk_profile as JsonRecord,
      preferences: userProfile.preferences as JsonRecord,
    },
    goals: userProfile.goals.map((goal) => ({
      id: goal.goal_id,
      user_id: DEMO_USER.uuid,
      external_goal_id: goal.goal_id,
      name: goal.name,
      target_amount: goal.target_amount,
      current_progress: goal.current_progress,
      target_date: goal.target_date,
      priority: goal.priority,
      flexibility: goal.flexibility,
    })),
    portfolio: {
      id: portfolio.portfolio_id,
      user_id: DEMO_USER.uuid,
      external_portfolio_id: portfolio.portfolio_id,
      as_of: portfolio.as_of,
      currency: portfolio.currency,
      summary: portfolio.summary as JsonRecord,
      allocation: portfolio.allocation as JsonRecord,
      risk_metrics: {},
    },
    holdings: portfolio.holdings.map((holding) => ({
      id: holding.holding_id,
      portfolio_id: portfolio.portfolio_id,
      user_id: DEMO_USER.uuid,
      external_holding_id: holding.holding_id,
      symbol: holding.symbol,
      name: holding.name,
      asset_class: holding.asset_class,
      subcategory: holding.subcategory,
      sector: holding.sector,
      quantity: holding.quantity,
      avg_buy_price: holding.avg_buy_price,
      current_price: holding.current_price,
      current_value: holding.current_value,
      unrealized_pnl: holding.unrealized_pnl,
      unrealized_pnl_percent: holding.unrealized_pnl_percent,
      weight_in_portfolio: holding.weight_in_portfolio,
      metadata: ((holding as unknown as { metadata?: JsonRecord }).metadata ?? null) as JsonRecord | null,
    })),
    marketContext: {
      id: marketContext.market_context_id,
      external_market_context_id: marketContext.market_context_id,
      as_of: marketContext.as_of,
      market_snapshot: marketContext.market_snapshot as JsonRecord,
      macro_context: marketContext.macro_context as JsonRecord,
    },
    marketEvents: marketContext.recent_events.map((event) => ({
      id: event.event_id,
      market_context_id: marketContext.market_context_id,
      external_event_id: event.event_id,
      headline: event.headline,
      category: event.category,
      impact: event.impact,
      relevance_to_user: event.relevance_to_user,
      plain_summary: event.plain_summary,
    })),
  };
}

async function requireData<T>(promise: PromiseLike<{ data: T | null; error: { message: string } | null }>, label: string): Promise<T> {
  const { data, error } = await promise;
  if (error) {
    throw new Error(`${label}: ${error.message}`);
  }
  if (data == null) {
    throw new Error(`${label}: missing data`);
  }
  return data;
}

/** Works with browser `supabase` or a `@supabase/ssr` route-handler client with the user session. */
export async function getDashboardData(client: SupabaseClient, userId: string): Promise<SupabaseDashboardData> {
  if (isLocalDemoMode && isDemoUserId(userId)) {
    return getLocalDemoDashboardData();
  }

  const profile = (await requireData(
    client
      .from("profiles")
      .select("id,app_user_id,name,age,occupation,location,currency,financial_context,risk_profile,preferences")
      .eq("id", userId)
      .single(),
    "profiles"
  )) as ProfileRow;

  const goals = (await requireData(
    client
      .from("goals")
      .select("id,user_id,external_goal_id,name,target_amount,current_progress,target_date,priority,flexibility")
      .eq("user_id", userId)
      .order("target_date", { ascending: true }),
    "goals"
  )) as GoalRow[];

  const portfolio = (await requireData(
    client
      .from("portfolios")
      .select("id,user_id,external_portfolio_id,as_of,currency,summary,allocation,risk_metrics")
      .eq("user_id", userId)
      .order("as_of", { ascending: false })
      .limit(1)
      .single(),
    "portfolios"
  )) as PortfolioRow;

  const holdings = (await requireData(
    client
      .from("holdings")
      .select(
        "id,portfolio_id,user_id,external_holding_id,symbol,name,asset_class,subcategory,sector,quantity,avg_buy_price,current_price,current_value,unrealized_pnl,unrealized_pnl_percent,weight_in_portfolio,metadata"
      )
      .eq("portfolio_id", portfolio.id)
      .order("current_value", { ascending: false }),
    "holdings"
  )) as HoldingRow[];

  const { data: marketContextRaw, error: marketContextError } = await client
    .from("market_contexts")
    .select("id,external_market_context_id,as_of,market_snapshot,macro_context")
    .order("as_of", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (marketContextError) {
    throw new Error(`market_contexts: ${marketContextError.message}`);
  }

  const marketContext = (marketContextRaw ?? null) as MarketContextRow | null;

  let marketEvents: MarketEventRow[] = [];
  if (marketContext) {
    const { data: events, error: eventsError } = await client
      .from("market_events")
      .select("id,market_context_id,external_event_id,headline,category,impact,relevance_to_user,plain_summary")
      .eq("market_context_id", marketContext.id)
      .order("created_at", { ascending: false });

    if (eventsError) {
      throw new Error(`market_events: ${eventsError.message}`);
    }

    marketEvents = events ?? [];
  }

  return {
    profile,
    goals,
    portfolio,
    holdings,
    marketContext: marketContext ?? null,
    marketEvents,
  };
}

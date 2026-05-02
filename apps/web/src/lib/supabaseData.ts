import type { SupabaseClient } from "@supabase/supabase-js";

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

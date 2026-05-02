import { NextRequest } from "next/server";
import type { MarketContext, Portfolio, UserProfile } from "@investiq/data";
import { demoJargonFallback, explainJargon, type KuberContext } from "@investiq/kuber";
import {
  mapDashboardToMarketContext,
  mapDashboardToPortfolio,
  mapDashboardToUserProfile,
} from "../../../../lib/engineAdapter";
import { getDashboardData } from "../../../../lib/supabaseData";
import { createSupabaseRouteClient } from "../../../../lib/supabaseRoute";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Private-Network": "true",
};

/** Minimal placeholders when jargon is fetched without dashboard (should be rare). */
function thinContext(holderName: string): KuberContext {
  const stubUser: UserProfile = {
    user_id: "anon",
    version: "thin",
    identity: { name: holderName, age: 0, occupation: "Investor", location: "—", currency: "USD" },
    financial_context: { annual_income: 0, monthly_savings_capacity: 0, dependents: 0, emergency_fund_months: 0 },
    risk_profile: { persona: "balanced", persona_label: "Balanced", risk_score: 5, risk_capacity: "medium", risk_tolerance: "medium" },
    goals: [],
    preferences: { communication_tone: "friendly_simple", explanation_depth: "beginner" },
  };
  const stubPortfolio: Portfolio = {
    portfolio_id: "thin",
    user_id: "anon",
    as_of: new Date().toISOString(),
    currency: "USD",
    summary: {
      total_value: 0,
      total_invested: 0,
      total_returns: 0,
      returns_percent: 0,
      day_change_value: 0,
      day_change_percent: 0,
      health_score: 0,
    },
    allocation: {
      by_asset_class: { equity: 0, debt: 0, gold: 0, cash: 0 },
      target_allocation: { equity: 0, debt: 0, gold: 0, cash: 0 },
      drift_from_target: 0,
    },
    holdings: [],
  };
  const stubMarket: MarketContext = {
    market_context_id: "thin",
    as_of: new Date().toISOString(),
    market_snapshot: { sentiment: "neutral", volatility_regime: "normal" },
    macro_context: { interest_rate: 0, inflation_rate: 0 },
    recent_events: [],
  };
  return { userProfile: stubUser, portfolio: stubPortfolio, marketContext: stubMarket };
}

type Body = { term?: string };

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  const groqKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL?.trim() || "llama-3.3-70b-versatile";
  if (!groqKey) {
    return Response.json({ message: "GROQ_API_KEY missing in apps/web/.env" }, { status: 503, headers: corsHeaders });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ message: "Invalid JSON." }, { status: 400, headers: corsHeaders });
  }

  const term = typeof body.term === "string" ? body.term.trim() : "";
  if (!term) {
    return Response.json({ message: "Send { term: string }." }, { status: 400, headers: corsHeaders });
  }

  const canned = demoJargonFallback(term);
  if (canned) {
    return Response.json({ message: canned }, { headers: corsHeaders });
  }

  let kuberCore: KuberContext | undefined;
  try {
    const supa = await createSupabaseRouteClient();
    const { data } = await supa.auth.getUser();
    const uid = data.user?.id;
    if (uid) {
      const dash = await getDashboardData(supa, uid);
      kuberCore = {
        userProfile: mapDashboardToUserProfile(dash),
        portfolio: mapDashboardToPortfolio(dash),
        marketContext: mapDashboardToMarketContext(dash),
      };
    }
  } catch {
    kuberCore = undefined;
  }

  const ctx = kuberCore ?? thinContext("Priya");

  let message = "";
  for await (const part of explainJargon(term, ctx, { groq: { apiKey: groqKey, model, temperature: 0.35, maxTokens: 600 } })) {
    message += part;
  }

  message = message.trim() || "I could not explain that term right now.";
  return Response.json({ message }, { headers: corsHeaders });
}

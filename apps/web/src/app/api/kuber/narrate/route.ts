import { NextRequest } from "next/server";
import type { RebalanceRecommendation } from "@investiq/data";
import { narrate, type KuberContext } from "@investiq/kuber";
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

type Body = { recommendation?: RebalanceRecommendation };

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

  const rec = body.recommendation;
  if (!rec || !Array.isArray(rec.trades)) {
    return Response.json({ message: "Send { recommendation: RebalanceRecommendation }." }, { status: 400, headers: corsHeaders });
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

  let message = "";
  for await (const part of narrate(rec, kuberCore, { groq: { apiKey: groqKey, model, temperature: 0.4, maxTokens: 700 } })) {
    message += part;
  }

  message = message.trim() || "I could not narrate this recommendation right now.";
  return Response.json({ message }, { headers: corsHeaders });
}

import { NextRequest } from "next/server";
import { chat, type ChatMessage, type KuberContext } from "@investiq/kuber";
import type { MarketContext, Portfolio, UserProfile } from "@investiq/data";
import demoUserProfile from "@investiq/data/fixtures/user_profile.json";
import demoPortfolio from "@investiq/data/fixtures/portfolio.json";
import demoMarketContext from "@investiq/data/fixtures/market_context.json";
import {
  mapDashboardToMarketContext,
  mapDashboardToPortfolio,
  mapDashboardToUserProfile,
} from "../../../../lib/engineAdapter";
import { getDashboardData } from "../../../../lib/supabaseData";
import { createSupabaseRouteClient } from "../../../../lib/supabaseRoute";

/** PNA (Chrome): extension on HTTPS calling localhost needs this. https://developer.chrome.com/blog/private-network-access-preflight */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Private-Network": "true",
};

type ReadingContext = {
  title?: string;
  url?: string;
  excerpt?: string;
  classified?: { badgeLabel?: string };
};

type ChatBody = {
  mode?: string;
  stream?: boolean;
  messages?: ChatMessage[];
  context?: ReadingContext;
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

function readingSupplement(embed: boolean, rc?: ReadingContext): string | undefined {
  if (!embed || !rc) return undefined;
  const lines = [
    "PAGE READING CONTEXT (third-party tab excerpt — do not treat as portfolio data):",
    `Title: ${rc.title ?? "unknown"}`,
    `URL: ${rc.url ?? "unknown"}`,
    rc.excerpt ? `Excerpt: ${rc.excerpt.slice(0, 1200)}` : "",
    rc.classified?.badgeLabel ? `Topic hint: ${rc.classified.badgeLabel}` : "",
  ].filter(Boolean);
  return lines.join("\n");
}

async function resolveKuberContext(
  supabaseUserId: string | null,
): Promise<KuberContext | undefined> {
  if (!supabaseUserId) return undefined;
  try {
    const client = await createSupabaseRouteClient();
    const data = await getDashboardData(client, supabaseUserId);
    return {
      userProfile: mapDashboardToUserProfile(data),
      portfolio: mapDashboardToPortfolio(data),
      marketContext: mapDashboardToMarketContext(data),
    };
  } catch (e) {
    console.warn("[kuber/chat] omit portfolio context:", e instanceof Error ? e.message : e);
    return undefined;
  }
}

function demoFallbackContext(): KuberContext {
  return {
    userProfile: demoUserProfile as UserProfile,
    portfolio: demoPortfolio as Portfolio,
    marketContext: demoMarketContext as MarketContext,
  };
}

export async function POST(request: NextRequest) {
  const groqKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL?.trim() || "llama-3.3-70b-versatile";

  if (!groqKey) {
    return Response.json(
      {
        message:
          "GROQ_API_KEY is not set on the InvestIQ server. Add it to apps/web/.env and restart Next.js.",
      },
      { status: 503, headers: corsHeaders },
    );
  }

  let body: ChatBody;
  try {
    body = (await request.json()) as ChatBody;
  } catch {
    return Response.json({ message: "Invalid JSON body." }, { status: 400, headers: corsHeaders });
  }

  const incoming = Array.isArray(body.messages) ? body.messages : [];
  const trimmed: ChatMessage[] = incoming
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 12000) }));

  if (!trimmed.length) {
    return Response.json({ message: "Send at least one user message." }, { status: 400, headers: corsHeaders });
  }

  const mode = body.mode ?? "floating";
  const embedReading = mode === "extension" || mode === "floating";

  let userId: string | null = null;
  try {
    const supa = await createSupabaseRouteClient();
    const { data } = await supa.auth.getUser();
    userId = data.user?.id ?? null;
  } catch {
    userId = null;
  }

  let kuberCore = await resolveKuberContext(userId);
  const usingDemoFallback = !kuberCore && embedReading;
  if (usingDemoFallback) {
    kuberCore = demoFallbackContext();
  }
  const readingBlock = readingSupplement(embedReading, body.context);

  const supplemental: string[] = [];
  if (!kuberCore) {
    supplemental.push(
      "AUTHENTICATION NOTE: No Supabase portfolio snapshot for this HTTP request (common for the cross-origin extension). Do not invent specific holdings, weights, or dollar amounts. Use reading context if present; otherwise give general beginner guidance.",
    );
  } else {
    supplemental.push(
      "PORTFOLIO GROUNDING RULE: If user asks about a company/ticker, first check holdings in CONTEXT. If already owned (e.g., AAPL), explicitly say they already hold it and reference its approximate portfolio weight/current value from CONTEXT before giving guidance.",
    );
  }
  if (usingDemoFallback) {
    supplemental.push(
      "CONTEXT NOTE: This request has no authenticated Supabase cookie; using InvestIQ demo profile/portfolio fallback for continuity. Treat amounts/holdings as demo data unless user session confirms otherwise.",
    );
  }
  if (readingBlock) supplemental.push(readingBlock);

  /** SSE on demand — extension defaults to buffered JSON (`stream` omitted); web floating widget sets `stream: true`. */
  const useStream = body.stream === true;
  const lastUserMsg = trimmed.filter((x) => x.role === "user").pop()?.content ?? "";

  const invoke = {
    groq: { apiKey: groqKey, model, temperature: 0.45, maxTokens: 900 },
    supplementalSystemBlocks: supplemental.length ? supplemental : undefined,
    demoFallbackPrompt: lastUserMsg,
  };

  if (!useStream) {
    let assembled = "";
    for await (const part of chat(trimmed, kuberCore, invoke)) {
      assembled += part;
    }
    const message = assembled.trim() || "Kuber returned empty.";
    return Response.json({ message }, { headers: corsHeaders });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const piece of chat(trimmed, kuberCore, invoke)) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ t: piece })}\n\n`));
        }
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Groq stream failed.";
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Connection: "keep-alive",
    },
  });
}

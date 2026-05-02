import { NextRequest, NextResponse } from "next/server";

/** PNA (Chrome): public initiators → localhost need this on OPTIONS + responses. https://developer.chrome.com/blog/private-network-access-preflight */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Private-Network": "true",
};

type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

type ExtensionContext = {
  title?: string;
  url?: string;
  excerpt?: string;
};

type ChatBody = {
  mode?: string;
  messages?: ChatTurn[];
  context?: ExtensionContext & { classified?: { badgeLabel?: string } };
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  const groqKey = process.env.GROQ_API_KEY;
  const model =
    process.env.GROQ_MODEL?.trim() || "llama-3.3-70b-versatile";

  if (!groqKey) {
    return NextResponse.json(
      {
        message:
          "GROQ_API_KEY is not set on the InvestIQ server. Add it to apps/web/.env and restart Next.js.",
      },
      { status: 503, headers: corsHeaders }
    );
  }

  let body: ChatBody;
  try {
    body = (await request.json()) as ChatBody;
  } catch {
    return NextResponse.json(
      { message: "Invalid JSON body." },
      { status: 400, headers: corsHeaders }
    );
  }

  const incoming = Array.isArray(body.messages) ? body.messages : [];
  const trimmed = incoming
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 12000) }));

  if (trimmed.length === 0) {
    return NextResponse.json(
      { message: "Send at least one user message." },
      { status: 400, headers: corsHeaders }
    );
  }

  const ctx = body.context;
  /** Floating web widget + extension both send page/snippet hints for grounding. */
  const embedsReadingContext =
    body.mode === "extension" || body.mode === "floating";

  const pageBlock =
    embedsReadingContext && ctx
      ? [
          "The user is reading a web page; use it to stay concrete and short (3–6 sentences unless they ask for more).",
          `Title: ${ctx.title ?? "unknown"}`,
          `URL: ${ctx.url ?? "unknown"}`,
          ctx.excerpt ? `Excerpt: ${ctx.excerpt.slice(0, 1200)}` : "",
          ctx.classified?.badgeLabel
            ? `Topic hint: ${ctx.classified.badgeLabel}`
            : "",
        ]
          .filter(Boolean)
          .join("\n")
      : "";

  const systemParts = [
    "You are Kuber, a calm, beginner-friendly investing guide for InvestIQ. No hype, no jargon without a plain-English gloss. Prefer actionable clarity over disclaimers stuffing; one short caveat is enough when risk matters.",
    pageBlock,
  ].filter(Boolean);

  const messages = [{ role: "system" as const, content: systemParts.join("\n\n") }, ...trimmed];

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.45,
        max_tokens: 900,
      }),
    });

    if (!res.ok) {
      const errTxt = await res.text();
      return NextResponse.json(
        {
          message: `Groq error (${res.status}). Try again briefly. ${errTxt.slice(0, 280)}`,
        },
        { status: 502, headers: corsHeaders }
      );
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text =
      data.choices?.[0]?.message?.content?.trim() ||
      "I could not produce an answer.";

    return NextResponse.json({ message: text }, { headers: corsHeaders });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Groq request failed.";
    return NextResponse.json({ message: msg }, { status: 502, headers: corsHeaders });
  }
}

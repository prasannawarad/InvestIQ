import { NextRequest, NextResponse } from "next/server";
import { speak } from "@investiq/kuber";

/** PNA (Chrome): extension on public HTTPS pages calling localhost requires this header. See chat route comment. */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Private-Network": "true",
};

const MAX_CHARS = 4_800;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

type Body = { text?: unknown };

export async function POST(request: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  const voiceId = process.env.ELEVENLABS_VOICE_ID?.trim();
  const modelId = process.env.ELEVENLABS_MODEL_ID?.trim();

  if (!apiKey || !voiceId) {
    return NextResponse.json(
      {
        message:
          "ElevenLabs is not configured on the server. Add ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID (a voice UUID from ElevenLabs) to apps/web/.env.",
      },
      { status: 503, headers: corsHeaders }
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ message: "Invalid JSON body." }, { status: 400, headers: corsHeaders });
  }

  const raw =
    typeof body.text === "string" ? body.text.trim().slice(0, MAX_CHARS) : "";
  if (!raw) {
    return NextResponse.json({ message: "Send a non-empty text string." }, { status: 400, headers: corsHeaders });
  }

  try {
    const audio = await speak(raw, {
      apiKey,
      voiceId,
      modelId: modelId || "eleven_turbo_v2_5",
    });
    return new NextResponse(audio as unknown as ReadableStream | Blob, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Speech request failed.";
    return NextResponse.json({ message: msg }, { status: 502, headers: corsHeaders });
  }
}

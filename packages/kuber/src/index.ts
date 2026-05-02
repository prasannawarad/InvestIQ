// Kuber — InvestIQ AI agent (Person 2). Groq streams + ElevenLabs TTS helpers.

import type { MarketContext, Portfolio, UserProfile, RebalanceRecommendation } from "@investiq/data";
import { streamElevenLabsSpeech } from "./elevenlabs";
import { demoChatFallback, demoJargonFallback } from "./demo-responses";
import { completeGroqChat, streamGroqChat, type GroqMessage, type GroqRuntimeConfig } from "./groq";
import {
  KUBER_JARGON_PROMPT,
  KUBER_NARRATION_PROMPT,
  KUBER_SYSTEM_PROMPT,
} from "./prompts";
import { serializeKuberContext } from "./serialize-context";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface KuberContext {
  userProfile: UserProfile;
  portfolio: Portfolio;
  marketContext: MarketContext;
}

export type ChatInvokeOptions = {
  groq: GroqRuntimeConfig;
  supplementalSystemBlocks?: string[];
  demoFallbackPrompt?: string;
  abortSignal?: AbortSignal;
};

function baseSystem(parts: Array<string | undefined>): string {
  return parts.filter(Boolean).join("\n\n");
}

/** Streaming replies for floating/extension chat. Honors demo fallbacks mirroring Python agent safeguards. */
export async function* chat(
  messages: ChatMessage[],
  context: KuberContext | undefined,
  options: ChatInvokeOptions,
): AsyncIterable<string> {
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content;
  const fb = demoChatFallback(options.demoFallbackPrompt ?? lastUser ?? "");
  if (fb) {
    yield fb;
    return;
  }

  const blocks = [KUBER_SYSTEM_PROMPT];
  if (context) {
    blocks.push(
      serializeKuberContext({
        userProfile: context.userProfile,
        portfolio: context.portfolio,
        marketContext: context.marketContext,
      }),
    );
  }
  for (const s of options.supplementalSystemBlocks ?? []) {
    if (s?.trim()) blocks.push(s.trim());
  }

  const system = baseSystem(blocks);
  const turns: Omit<GroqMessage, "system">[] = messages.map((m) => ({
    role: m.role,
    content: m.content.slice(0, 12000),
  }));

  yield* streamGroqChat(system, turns, options.groq, options.abortSignal);
}

export type NarrateInvokeOptions = ChatInvokeOptions;

export async function* narrate(
  recommendation: RebalanceRecommendation,
  context: KuberContext | undefined,
  options: NarrateInvokeOptions,
): AsyncIterable<string> {
  const blocks = [KUBER_SYSTEM_PROMPT];
  if (context) {
    blocks.push(
      serializeKuberContext({
        userProfile: context.userProfile,
        portfolio: context.portfolio,
        marketContext: context.marketContext,
      }),
    );
  }
  blocks.push(KUBER_NARRATION_PROMPT(JSON.stringify(recommendation)));
  for (const s of options.supplementalSystemBlocks ?? []) {
    if (s?.trim()) blocks.push(s.trim());
  }

  yield* streamGroqChat(
    baseSystem(blocks),
    [{ role: "user", content: "Narrate the recommendation for Priya in plain English." }],
    options.groq,
    options.abortSignal,
  );
}

export type JargonInvokeOptions = ChatInvokeOptions;

export async function* explainJargon(
  term: string,
  context: KuberContext | undefined,
  options: JargonInvokeOptions,
): AsyncIterable<string> {
  const blocks = [KUBER_SYSTEM_PROMPT];
  if (context) {
    blocks.push(
      serializeKuberContext({
        userProfile: context.userProfile,
        portfolio: context.portfolio,
        marketContext: context.marketContext,
      }),
    );
  }
  blocks.push(KUBER_JARGON_PROMPT(term.trim()));
  for (const s of options.supplementalSystemBlocks ?? []) {
    if (s?.trim()) blocks.push(s.trim());
  }

  yield* streamGroqChat(
    baseSystem(blocks),
    [{ role: "user", content: `Explain this term plainly: "${term.trim()}"` }],
    options.groq,
    options.abortSignal,
  );
}

export type SpeakEnv = {
  apiKey: string;
  voiceId: string;
  modelId?: string;
};

export function speak(text: string, env: SpeakEnv): Promise<ReadableStream<Uint8Array>> {
  if (!env.apiKey?.trim() || !env.voiceId?.trim()) {
    return Promise.reject(
      new Error("ElevenLabs requires apiKey + voiceId (set ELEVENLABS_* in apps/web/.env)."),
    );
  }
  return streamElevenLabsSpeech({
    apiKey: env.apiKey.trim(),
    voiceId: env.voiceId.trim(),
    modelId: env.modelId,
    text,
  });
}

/** @internal exported for Route Handlers that buffer instead of yielding stream. */
export { completeGroqChat, demoChatFallback, demoJargonFallback, streamGroqChat, serializeKuberContext };
export * from "./prompts";
export * from "./cue-chips";
export { readKuberChatResponse } from "./read-chat-response";

// Kuber — the InvestIQ agent
// Person 2 implements the bodies of these.

import type { UserProfile, Portfolio, MarketContext, RebalanceRecommendation } from "@investiq/data";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface KuberContext {
  userProfile: UserProfile;
  portfolio: Portfolio;
  marketContext: MarketContext;
}

/**
 * Streaming chat with Kuber. Yields text tokens as they arrive from Groq.
 */
export async function* chat(
  _messages: ChatMessage[],
  _context: KuberContext
): AsyncIterable<string> {
  throw new Error("not implemented — Person 2");
}

/**
 * Narrate a rebalance recommendation in plain English. Engine produces
 * structured output, Kuber rephrases for the user.
 */
export async function* narrate(
  _recommendation: RebalanceRecommendation,
  _context: KuberContext
): AsyncIterable<string> {
  throw new Error("not implemented — Person 2");
}

/**
 * Explain a financial term in 3 layers — meaning, signal, what it means for this user.
 */
export async function* explainJargon(
  _term: string,
  _context: KuberContext
): AsyncIterable<string> {
  throw new Error("not implemented — Person 2");
}

/**
 * Pipe text to ElevenLabs streaming TTS. Returns audio stream.
 */
export function speak(_text: string): ReadableStream<Uint8Array> {
  throw new Error("not implemented — Person 2");
}

export * from "./prompts";
export * from "./cue-chips";
export { readKuberChatResponse } from "./read-chat-response";

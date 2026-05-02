# @investiq/kuber

Kuber is the AI agent. This package owns the agent's voice, prompts, and the API clients that make it work.

## Provider — Groq

`https://api.groq.com/openai/v1/chat/completions`. OpenAI-compatible. Default model: `llama-3.3-70b-versatile`. Configured via env in `.env.local`.

## Voice

- **STT:** Browser Web Speech API. Lives in `apps/web` and `apps/extension`, NOT here.
- **TTS:** ElevenLabs streaming. Client in `src/voice/elevenlabs.ts`. Use **Daniel** voice with model `eleven_turbo_v2_5` for lowest latency.

## The system prompt

Lives in `src/prompts/system.ts`. The prompt establishes:

1. Kuber's identity — calm, trustworthy, slightly older, plain English
2. Hard rules:
   - **Never compute numbers.** The engine does that. If asked a quantitative question, request the structured engine output and narrate it.
   - When asked about jargon, answer in 3 layers: human meaning, what it tells you, what it means for *this user* given their portfolio.
   - Always tie macro events to specific holdings the user owns.
   - Default to "do nothing" when the right answer is to do nothing. Don't manufacture action.
3. Format guidelines:
   - Short sentences. No financial jargon without a translation.
   - One paragraph max for spoken responses (TTS sounds bad past ~30 seconds).
   - For longer explanations, structure as: short verbal summary, then "want me to break that down?" prompt.

## Public API (Person 2 implements)

### `chat(messages, context) → AsyncIterable<string>`
Streaming chat completion. `context` includes user_profile, portfolio, market_context. Streams tokens as they arrive.

### `narrate(recommendation) → AsyncIterable<string>`
Takes a `RebalanceRecommendation` from the engine, asks Groq to write a plain-language narration of it. Streams.

### `explainJargon(term, context) → AsyncIterable<string>`
Takes a financial term and the user's context, returns the 3-layer explanation. Streams.

### `speak(text) → ReadableStream<Uint8Array>`
Pipes text to ElevenLabs streaming TTS. Returns audio stream the caller can play.

## Latency budget

User stops speaking → first audio plays back: target **under 2 seconds**.

To hit this:
- Browser STT runs on-device (instant)
- Groq is fast (~500ms first token for Llama 3.3 70B)
- ElevenLabs Turbo v2.5 first byte: ~400ms
- We stream Groq → ElevenLabs sentence-by-sentence so audio starts as soon as one full sentence is ready

If you can't hit 2s, prioritize "first audio plays" over "audio is fully synthesized." Buffering is okay; silent staring at a screen is not.

## Out of scope

- Multi-turn memory across sessions (single-session conversation only for hackathon)
- Tool use / function calling (engine outputs are pre-computed, passed in context)
- Multiple voices for different personas

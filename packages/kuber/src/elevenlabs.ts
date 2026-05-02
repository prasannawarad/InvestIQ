/** Returns raw MP3 stream from ElevenLabs (reuse in `@investiq/web` speak route). */
export async function streamElevenLabsSpeech(options: {
  apiKey: string;
  voiceId: string;
  modelId?: string;
  text: string;
  maxChars?: number;
  abortSignal?: AbortSignal;
}): Promise<ReadableStream<Uint8Array>> {
  const clipped = options.text.trim().slice(0, options.maxChars ?? 4800);
  if (!clipped) {
    throw new Error("Speak text is empty.");
  }

  const modelId = options.modelId ?? "eleven_turbo_v2_5";
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(options.voiceId)}`;

  const res = await fetch(url, {
    method: "POST",
    signal: options.abortSignal,
    headers: {
      "xi-api-key": options.apiKey,
      Accept: "audio/mpeg",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: clipped,
      model_id: modelId,
    }),
  });

  if (!res.ok || !res.body) {
    const txt = await res.text().catch(() => "");
    throw new Error(`ElevenLabs HTTP ${res.status}: ${txt.slice(0, 400)}`);
  }

  return res.body;
}

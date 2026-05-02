export type GroqRuntimeConfig = {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
};

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

/** OpenAI-shaped chat messages excluding system concatenation externally. */
export type GroqMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export async function* streamGroqChat(
  systemContent: string,
  turns: Omit<GroqMessage, "system">[],
  cfg: GroqRuntimeConfig,
  abortSignal?: AbortSignal,
): AsyncIterable<string> {
  const model = cfg.model?.trim() || "llama-3.3-70b-versatile";

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      "Content-Type": "application/json",
    },
    signal: abortSignal,
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemContent }, ...turns],
      temperature: cfg.temperature ?? 0.45,
      max_tokens: cfg.maxTokens ?? 900,
      stream: true,
    }),
  });

  if (!res.ok) {
    const errTxt = await res.text().catch(() => "");
    throw new Error(`Groq error ${res.status}: ${errTxt.slice(0, 400)}`);
  }

  const body = res.body;
  if (!body) throw new Error("Groq returned empty stream body.");

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    /** Line-oriented SSE (`data:` lines); tolerates chunked TCP fragments. */
    let nl: number;
    while ((nl = buffer.indexOf("\n")) !== -1) {
      const rawLine = buffer.slice(0, nl).replace(/\r$/, "");
      buffer = buffer.slice(nl + 1);
      const stripped = rawLine.trim();
      if (!stripped || !stripped.startsWith("data:")) continue;
      const payload = stripped.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const json = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const piece = json.choices?.[0]?.delta?.content;
        if (piece) yield piece;
      } catch {
        // ignore incomplete JSON fragments
      }
    }
  }
}

export async function completeGroqChat(
  systemContent: string,
  turns: Omit<GroqMessage, "system">[],
  cfg: GroqRuntimeConfig,
  abortSignal?: AbortSignal,
): Promise<string> {
  let full = "";
  for await (const chunk of streamGroqChat(systemContent, turns, cfg, abortSignal)) {
    full += chunk;
  }
  return full.trim() || "I could not produce an answer.";
}

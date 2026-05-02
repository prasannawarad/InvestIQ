/** Parse `/api/kuber/chat` responses: buffered JSON `{ message }`, or SSE `data: {"t":...}`. */

async function readSseAccumulator(body: ReadableStream<Uint8Array>): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let out = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    let sep: number;
    while ((sep = buf.indexOf("\n\n")) !== -1) {
      const evt = buf.slice(0, sep).trimEnd();
      buf = buf.slice(sep + 2);

      const lines = evt.split("\n");
      for (const line of lines) {
        const t = line.trim();
        if (!t.startsWith("data:")) continue;
        const payload = t.slice(5).trim();
        if (payload === "[DONE]") continue;
        try {
          const j = JSON.parse(payload) as { t?: string; error?: string };
          if (typeof j.error === "string") throw new Error(j.error);
          if (typeof j.t === "string") out += j.t;
        } catch (e) {
          if (!(e instanceof SyntaxError)) throw e;
          out += payload;
        }
      }
    }
  }
  return out.trim();
}

/** Parse SSE from a fully buffered string (fallback when Body already consumed via text()). */
export function parseKuberChatSseText(rawText: string): string {
  let out = "";
  const chunks = rawText.split("\n\n");
  for (const evt of chunks) {
    const lines = evt.trim().split("\n");
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith("data:")) continue;
      const payload = t.slice(5).trim();
      if (payload === "[DONE]") continue;
      try {
        const j = JSON.parse(payload) as { t?: string; error?: string };
        if (typeof j.error === "string") return j.error;
        if (typeof j.t === "string") out += j.t;
      } catch {
        out += payload;
      }
    }
  }
  return out.trim();
}

export async function readKuberChatResponse(response: Response): Promise<string> {
  const ct = response.headers.get("content-type") ?? "";

  if (response.ok && ct.includes("text/event-stream") && response.body) {
    try {
      const streamed = await readSseAccumulator(response.body);
      if (streamed) return streamed;
    } catch {
      // fall through to text()/JSON parsing
    }
  }

  const rawText = await response.text();
  const trimmed = rawText.trim();

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const body = JSON.parse(trimmed) as {
        message?: unknown;
        text?: unknown;
        response?: unknown;
        error?: unknown;
      };
      if (typeof body.error === "string") return body.error;
      const m = body.message ?? body.text ?? body.response;
      if (typeof m === "string") {
        const s = m.trim();
        return s || "Kuber returned empty JSON.";
      }
    } catch {
      // fall through
    }
  }

  /** Buffered SSE fallback (mislabeled content-type) */
  if (rawText.includes("data:") && (rawText.includes('"t"') || trimmed.includes("[DONE]"))) {
    const parsed = parseKuberChatSseText(rawText);
    if (parsed) return parsed;
  }

  const sseConcat = rawText
    .split("\n")
    .filter((line) => line.trim().startsWith("data:"))
    .map((line) => line.replace(/^data:\s*/i, "").trim())
    .filter((line) => line !== "[DONE]")
    .join("")
    .trim();

  return sseConcat || rawText || "Unreadable answer.";
}

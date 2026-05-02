/** Parse `/api/kuber/chat` responses (JSON { message }, or crude SSE-ish lines). */
export async function readKuberChatResponse(response: Response): Promise<string> {
  const rawText = await response.text();
  const trimmed = rawText.trim();

  /** Prefer body parse (works even when Content-Type is missing / not exposed cross-origin). */
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
      // fall through to SSE / plain text heuristics below
    }
  }

  const sseText = rawText
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.replace(/^data:\s*/, ""))
    .filter((line) => line !== "[DONE]")
    .join("")
    .trim();

  return sseText || rawText || "Unreadable answer.";
}

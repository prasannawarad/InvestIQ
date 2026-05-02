import type { PlasmoCSConfig } from "plasmo";
import { useEffect, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { colors, radii, shadows, typography } from "@investiq/ui/tokens";

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: false,
  run_at: "document_idle"
};

const ROOT_ID = "investiq-kuber-overlay-root";
const APP_URL = process.env.PLASMO_PUBLIC_APP_URL || "http://localhost:3000";

type PageContext = {
  title: string;
  url: string;
  excerpt: string;
  isRateStory: boolean;
};

function collectPageContext(): PageContext {
  const title = document.title || "this page";
  const url = window.location.href;
  const articleText =
    document.querySelector("article")?.textContent ||
    document.querySelector("main")?.textContent ||
    document.body?.innerText ||
    "";

  const excerpt = articleText.replace(/\s+/g, " ").trim().slice(0, 360);

  const pageSignal = `${title} ${url} ${excerpt}`.toLowerCase();
  const isRateStory =
    pageSignal.includes("rbi") ||
    pageSignal.includes("reserve bank of india") ||
    pageSignal.includes("rate") ||
    pageSignal.includes("interest");

  return { title, url, excerpt, isRateStory };
}

function getDemoGreeting(context: PageContext): string {
  if (context.isRateStory) {
    return "Hey Priya. I see you're reading about the RBI's rate decision. Here's the short version: rates staying steady is mildly good news for the bond fund you own, about 6% of your portfolio. Want me to walk you through why?";
  }

  return "Hey Priya. I can read this page with you and translate what it means for your portfolio. For the demo, try this on the CNBC RBI rates article and I'll connect the news to your bond fund.";
}

const demoExplanation =
  "Sure. When rates stay steady, bond funds usually avoid the pressure they feel when rates rise quickly. Your portfolio has a small bond fund position, so this helps smooth out the ride, but it is not a reason to trade. Bottom line: you do not need to do anything. You're positioned for this.";

type ChatMessage = {
  id: string;
  speaker: "kuber" | "priya";
  text: string;
};

type KuberApiMessage = {
  role: "user" | "assistant";
  content: string;
};

async function readKuberResponse(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const body = (await response.json()) as { message?: string; text?: string; response?: string };
    return body.message || body.text || body.response || "I connected to Kuber, but did not receive a readable answer.";
  }

  const rawText = await response.text();
  const sseText = rawText
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.replace(/^data:\s*/, ""))
    .filter((line) => line !== "[DONE]")
    .join("");

  return sseText || rawText || "I connected to Kuber, but did not receive a readable answer.";
}

function KuberOverlay({ context, onClose }: { context: PageContext; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "greeting", speaker: "kuber", text: getDemoGreeting(context) }
  ]);
  const [question, setQuestion] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const hasExplained = messages.some((message) => message.id === "explanation");

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  function explain() {
    if (hasExplained) return;

    setMessages((currentMessages) => [
      ...currentMessages,
      { id: "yes", speaker: "priya", text: "Yes, walk me through it." },
      { id: "explanation", speaker: "kuber", text: demoExplanation }
    ]);
  }

  async function askLiveKuber() {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || isSending) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      speaker: "priya",
      text: trimmedQuestion
    };

    setMessages((currentMessages) => [...currentMessages, userMessage]);
    setQuestion("");
    setIsSending(true);

    try {
      const apiMessages: KuberApiMessage[] = [
        {
          role: "user",
          content: `${trimmedQuestion}\n\nPage context:\nTitle: ${context.title}\nURL: ${context.url}\nExcerpt: ${context.excerpt}`
        }
      ];

      const response = await fetch(`${APP_URL}/api/kuber/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode: "extension",
          messages: apiMessages,
          context
        })
      });

      if (!response.ok) {
        throw new Error(`Kuber API returned ${response.status}`);
      }

      const answer = await readKuberResponse(response);
      setMessages((currentMessages) => [
        ...currentMessages,
        { id: `kuber-${Date.now()}`, speaker: "kuber", text: answer }
      ]);
    } catch {
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: `fallback-${Date.now()}`,
          speaker: "kuber",
          text: "I cannot reach the live InvestIQ app yet. For the demo path, use the RBI rates article and the scripted explanation. Once the web app is running, this box will call Kuber live."
        }
      ]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <aside style={styles.panel} aria-label="InvestIQ Kuber overlay">
      <header style={styles.header}>
        <div>
          <div style={styles.kicker}>InvestIQ</div>
          <h1 style={styles.title}>Kuber</h1>
        </div>
        <button type="button" aria-label="Close Kuber overlay" onClick={onClose} style={styles.closeButton}>
          x
        </button>
      </header>

      <section style={styles.contextCard}>
        <div style={styles.contextMeta}>
          <span style={styles.contextLabel}>Reading now</span>
          <span style={context.isRateStory ? styles.demoBadge : styles.liveBadge}>
            {context.isRateStory ? "Demo ready" : "Context mode"}
          </span>
        </div>
        <div style={styles.contextTitle}>{context.title}</div>
      </section>

      <section style={styles.messages} aria-live="polite">
        {messages.map((message) => (
          <div
            key={message.id}
            style={message.speaker === "kuber" ? styles.chatArea : styles.userChatArea}
          >
            <div style={message.speaker === "kuber" ? styles.avatar : styles.userAvatar}>
              {message.speaker === "kuber" ? "K" : "P"}
            </div>
            <p style={message.speaker === "kuber" ? styles.message : styles.userMessage}>{message.text}</p>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </section>

      <div style={styles.actions}>
        <button type="button" style={styles.primaryButton} onClick={explain} disabled={hasExplained}>
          {hasExplained ? "Explained" : "Yes, explain"}
        </button>
        <button type="button" style={styles.secondaryButton} onClick={onClose}>
          {hasExplained ? "Close" : "Not now"}
        </button>
      </div>

      <form
        style={styles.askForm}
        onSubmit={(event) => {
          event.preventDefault();
          void askLiveKuber();
        }}
      >
        <input
          aria-label="Ask Kuber about this page"
          placeholder="Ask about this page"
          value={question}
          onChange={(event) => setQuestion(event.currentTarget.value)}
          style={styles.askInput}
        />
        <button type="submit" style={styles.sendButton} disabled={isSending || !question.trim()}>
          {isSending ? "..." : "Ask"}
        </button>
      </form>

      <footer style={styles.footer}>
        <span style={styles.footerText}>{context.isRateStory ? "Scripted Day 1" : "Live Kuber fallback"}</span>
        <a href={`${APP_URL}/extension`} target="_blank" rel="noreferrer" style={styles.appLink}>
          Open in app
        </a>
      </footer>
    </aside>
  );
}

let root: Root | null = null;
let host: HTMLDivElement | null = null;

function showOverlay() {
  if (host) return;

  host = document.createElement("div");
  host.id = ROOT_ID;
  document.documentElement.appendChild(host);

  const shadowRoot = host.attachShadow({ mode: "open" });
  const mount = document.createElement("div");
  shadowRoot.appendChild(mount);

  root = createRoot(mount);
  root.render(<KuberOverlay context={collectPageContext()} onClose={hideOverlay} />);
}

function hideOverlay() {
  root?.unmount();
  root = null;
  host?.remove();
  host = null;
}

function toggleOverlay() {
  if (host) {
    hideOverlay();
    return;
  }

  showOverlay();
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "INVESTIQ_TOGGLE_OVERLAY") {
    toggleOverlay();
  }
});

const styles = {
  panel: {
    position: "fixed",
    top: "24px",
    right: "24px",
    zIndex: 2147483647,
    width: "380px",
    maxWidth: "calc(100vw - 32px)",
    maxHeight: "calc(100vh - 48px)",
    minHeight: "520px",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: "18px",
    padding: "22px",
    border: `1px solid ${colors.border}`,
    borderRadius: radii.lg,
    background: colors.cardBg,
    color: colors.text,
    boxShadow: shadows.popover,
    fontFamily: typography.sans
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px"
  },
  kicker: {
    color: colors.textMuted,
    fontSize: "12px",
    lineHeight: "16px"
  },
  title: {
    margin: 0,
    color: colors.text,
    fontFamily: typography.serif,
    fontSize: "34px",
    lineHeight: "38px",
    fontWeight: 400
  },
  closeButton: {
    width: "36px",
    height: "36px",
    border: `1px solid ${colors.border}`,
    borderRadius: radii.pill,
    background: colors.background,
    color: colors.text,
    cursor: "pointer",
    fontSize: "18px",
    lineHeight: "18px"
  },
  contextCard: {
    padding: "14px",
    border: `1px solid ${colors.cardBorder}`,
    borderRadius: radii.md,
    background: colors.background
  },
  contextMeta: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    marginBottom: "6px"
  },
  contextLabel: {
    color: colors.textMuted,
    fontSize: "12px",
    lineHeight: "16px"
  },
  demoBadge: {
    padding: "3px 8px",
    borderRadius: radii.pill,
    background: colors.accent,
    color: colors.cardBg,
    fontSize: "11px",
    lineHeight: "14px",
    fontWeight: 700
  },
  liveBadge: {
    padding: "3px 8px",
    borderRadius: radii.pill,
    background: colors.cardBg,
    color: colors.textMuted,
    border: `1px solid ${colors.border}`,
    fontSize: "11px",
    lineHeight: "14px",
    fontWeight: 700
  },
  contextTitle: {
    color: colors.text,
    fontSize: "15px",
    lineHeight: "20px",
    fontWeight: 600
  },
  chatArea: {
    display: "grid",
    gridTemplateColumns: "40px 1fr",
    gap: "12px",
    alignItems: "start"
  },
  userChatArea: {
    display: "grid",
    gridTemplateColumns: "1fr 40px",
    gap: "12px",
    alignItems: "start"
  },
  messages: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    overflowY: "auto",
    paddingRight: "2px"
  },
  avatar: {
    width: "40px",
    height: "40px",
    display: "grid",
    placeItems: "center",
    borderRadius: radii.pill,
    background: colors.accent,
    color: colors.cardBg,
    fontWeight: 700
  },
  userAvatar: {
    width: "40px",
    height: "40px",
    display: "grid",
    placeItems: "center",
    gridColumn: 2,
    borderRadius: radii.pill,
    background: colors.background,
    color: colors.accent,
    border: `1px solid ${colors.border}`,
    fontWeight: 700
  },
  message: {
    margin: 0,
    padding: "14px",
    borderRadius: radii.md,
    background: colors.background,
    color: colors.text,
    fontSize: "15px",
    lineHeight: "23px"
  },
  userMessage: {
    gridColumn: 1,
    gridRow: 1,
    margin: 0,
    padding: "12px 14px",
    borderRadius: radii.md,
    background: colors.accent,
    color: colors.cardBg,
    fontSize: "15px",
    lineHeight: "22px"
  },
  actions: {
    display: "flex",
    gap: "10px",
    marginTop: "auto"
  },
  primaryButton: {
    flex: 1,
    minHeight: "42px",
    border: "0",
    borderRadius: radii.pill,
    background: colors.accent,
    color: colors.cardBg,
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 700
  },
  secondaryButton: {
    flex: 1,
    minHeight: "42px",
    border: `1px solid ${colors.border}`,
    borderRadius: radii.pill,
    background: colors.cardBg,
    color: colors.text,
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 700
  },
  askForm: {
    display: "grid",
    gridTemplateColumns: "1fr 58px",
    gap: "8px"
  },
  askInput: {
    minWidth: 0,
    height: "40px",
    boxSizing: "border-box",
    border: `1px solid ${colors.border}`,
    borderRadius: radii.pill,
    background: colors.cardBg,
    color: colors.text,
    fontFamily: typography.sans,
    fontSize: "14px",
    outline: "none",
    padding: "0 14px"
  },
  sendButton: {
    height: "40px",
    border: "0",
    borderRadius: radii.pill,
    background: colors.text,
    color: colors.cardBg,
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 700
  },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    paddingTop: "2px"
  },
  footerText: {
    color: colors.textMuted,
    fontSize: "12px",
    lineHeight: "16px"
  },
  appLink: {
    color: colors.accent,
    fontSize: "13px",
    lineHeight: "18px",
    fontWeight: 700,
    textDecoration: "none"
  }
} satisfies Record<string, React.CSSProperties>;

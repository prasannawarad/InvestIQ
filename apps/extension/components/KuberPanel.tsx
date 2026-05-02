import { KUBER_CUE_GROUPS, KUBER_EXTENSION_PAGE_CUES } from "@investiq/kuber";
import { type Dispatch, type FormEvent, type SetStateAction, useEffect, useRef, useState } from "react";
import type { PageContext } from "../lib/page-context";
import { panelStyles as styles } from "../lib/panel-styles";

export type PanelChatMessage = {
  id: string;
  speaker: "kuber" | "user";
  text: string;
};

const demoExplanation =
  "Sure. When rates stay steady, bond funds usually avoid the pressure they feel when rates rise quickly. Your portfolio has a small bond fund position, so this helps smooth out the ride, but it is not a reason to trade. Bottom line: you do not need to do anything.";

const cueGroupsBundled = [
  ...KUBER_CUE_GROUPS,
  {
    label: KUBER_EXTENSION_PAGE_CUES.label,
    chips: [...KUBER_EXTENSION_PAGE_CUES.chips],
  },
];

type KuberPanelProps = {
  context: PageContext;
  messages: PanelChatMessage[];
  setMessages: Dispatch<SetStateAction<PanelChatMessage[]>>;
  onCollapse: () => void;
  onSpeak: (text: string) => void;
  canSpeak: boolean;
  appUrl: string;
  isSending: boolean;
  /** False until Storage + snapshot hydrate so SPA race cannot overwrite sends. */
  interactionDisabled?: boolean;
  onAsk: (trimmedQuestion: string) => Promise<void>;
};

export function KuberPanel({
  context,
  messages,
  setMessages,
  onCollapse,
  onSpeak,
  canSpeak,
  appUrl,
  isSending,
  interactionDisabled = false,
  onAsk,
}: KuberPanelProps) {
  const [question, setQuestion] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const hasExplained = messages.some((message) => message.id === "explanation");

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onCollapse();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onCollapse]);

  function explain() {
    if (hasExplained) return;
    setMessages((currentMessages) => [
      ...currentMessages,
      { id: "yes", speaker: "user", text: "Yes, walk me through it." },
      { id: "explanation", speaker: "kuber", text: demoExplanation },
    ]);
  }

  const uiLocked = interactionDisabled || isSending;

  async function submitAsk(event: FormEvent) {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || uiLocked) return;
    setQuestion("");
    await onAsk(trimmedQuestion);
  }

  async function askFromCue(cueText: string) {
    const trimmedQuestion = cueText.trim();
    if (!trimmedQuestion || uiLocked) return;
    await onAsk(trimmedQuestion);
  }

  const badgeIsDemoStyle = context.classified.isDemoHeuristic;

  return (
    <aside style={{ ...styles.panel, pointerEvents: "auto" }} aria-label="InvestIQ Kuber chat">
      <header style={styles.headerAccent}>
        <div style={styles.headerLead}>
          <div style={styles.orb} aria-hidden>
            K
          </div>
          <div style={styles.headerTitles}>
            <div id="investiq-extension-kuber-title" style={styles.titleRow}>
              Kuber
            </div>
            <div style={styles.subtitleRow}>Reading with you · guidance layer</div>
          </div>
        </div>
        <button type="button" aria-label="Close Kuber overlay" onClick={onCollapse} style={styles.closeButton}>
          ×
        </button>
      </header>

      <div style={styles.bodyScroll}>
        <section style={styles.contextStrip}>
          <div style={styles.contextMeta}>
            <span style={styles.contextLabel}>Reading now</span>
            <span style={badgeIsDemoStyle ? styles.demoBadge : styles.contextualBadge}>{context.classified.badgeLabel}</span>
          </div>
          <div style={styles.contextTitle}>{context.title}</div>
        </section>

        <section style={styles.messages} aria-live="polite" aria-labelledby="investiq-extension-kuber-title">
          {messages.map((message) =>
            message.speaker === "kuber" ? (
              <div key={message.id} style={styles.messageRowLeft}>
                <div style={{ maxWidth: "100%", minWidth: 0 }}>
                  <div style={styles.bubbleKuber}>{message.text}</div>
                  {canSpeak ? (
                    <div style={styles.kuberBubbleFooter}>
                      <button
                        type="button"
                        style={styles.speakBtn}
                        aria-label="Read aloud"
                        title="Prefer ElevenLabs when your InvestIQ backend has API keys configured; falls back to the browser voice if not."
                        onClick={() => onSpeak(message.text)}
                      >
                        Speak
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div key={message.id} style={styles.messageRowRight}>
                <div style={styles.bubbleUser}>{message.text}</div>
              </div>
            )
          )}
          <div ref={messagesEndRef} />
        </section>

        <section style={styles.cueSection} aria-label="Suggested questions">
          {cueGroupsBundled.map((group) => (
            <div key={group.label} style={styles.cueGroup}>
              <div style={styles.cueGroupLabel}>{group.label}</div>
              <div style={styles.cueChipWrap}>
                {group.chips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    style={styles.cueChip}
                    disabled={uiLocked}
                    title="Ask Kuber"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      void askFromCue(chip);
                    }}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>

        <div style={styles.actions}>
          {context.classified.isDemoHeuristic ? (
            <button
              type="button"
              style={styles.primaryButton}
              onClick={explain}
              disabled={hasExplained || interactionDisabled}
              title="Day-1 scripted walkthrough when the page reads like rates / RBI / bonds news"
            >
              {hasExplained ? "Demo explained" : "Yes — walk me through (demo)"}
            </button>
          ) : null}
          <button
            type="button"
            style={
              context.classified.isDemoHeuristic ? styles.secondaryButton : { ...styles.secondaryButton, flex: 1 }
            }
            onClick={onCollapse}
          >
            Close
          </button>
        </div>
      </div>

      <div style={styles.composerBlock}>
        <form
          style={{ ...styles.askForm, pointerEvents: "auto" }}
          onSubmit={(event) => void submitAsk(event)}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <input
            aria-label="Ask Kuber about this page"
            name="kuber-question"
            id="investiq-kuber-question"
            placeholder="Ask Kuber anything…"
            value={question}
            onChange={(event) => setQuestion(event.currentTarget.value)}
            onPointerDown={(e) => e.stopPropagation()}
            disabled={interactionDisabled}
            style={{ ...styles.askInput, pointerEvents: "auto" }}
          />
          <button
            type="submit"
            style={styles.sendButton}
            disabled={uiLocked || !question.trim()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {isSending ? "…" : "→"}
          </button>
        </form>
      </div>

      <footer style={styles.footer}>
        <span style={styles.footerText}>
          {badgeIsDemoStyle ? "Rates demo + cues + Ask · " : "Same cue chips as InvestIQ · "}
          Ask hits your deployed API · Speak uses{" "}
          {canSpeak ? "ElevenLabs when backend keys exist, else browser fallback." : "muted in popup."}
        </span>
        <a href={`${appUrl}/home`} target="_blank" rel="noreferrer" style={styles.appLink}>
          Open InvestIQ
        </a>
      </footer>
    </aside>
  );
}

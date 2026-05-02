"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Mic, Send, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { colors, radii, shadows, typography } from "@investiq/ui/tokens";
import { FLOATING_KUBER_VISIBILITY, type FloatingKuberVisibilityDetail } from "../../lib/floatingKuberEvents";
import { KUBER_CUE_GROUPS, KUBER_EXTENSION_PAGE_CUES, readKuberChatResponse } from "@investiq/kuber";
import { investiqFieldStyle, investiqFilterChipStyle } from "../../lib/investiqUi";
import { useAuth } from "./auth/AuthProvider";

type ChatRow = { id: string; role: "kuber" | "user"; content: string };

function getFirstName(fullName: string | null | undefined): string {
  const name = fullName?.trim();
  if (!name) return "there";
  return name.split(/\s+/)[0] ?? "there";
}

const panelTransition = {
  duration: 0.18,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

/** Isolate portal layers above app chrome (Sidebar z-40). */
const Z_BACKDROP = 2147483640;
const Z_PANEL = 2147483641;
const Z_FAB = 2147483639;

function subscribeToClientMount() {
  return () => {};
}

function mountedOnClient() {
  return true;
}

function notMountedServer() {
  return false;
}

function excerptFromDom(): string {
  if (typeof document === "undefined") return "";
  const articleText =
    document.querySelector("article")?.textContent ||
    document.querySelector("main")?.textContent ||
    document.body?.innerText ||
    "";
  return articleText.replace(/\s+/g, " ").trim().slice(0, 360);
}

function toApiTurns(rows: ChatRow[]): { role: "user" | "assistant"; content: string }[] {
  return rows
    .filter((r) => r.role === "user" || r.role === "kuber")
    .map((r) => ({
      role: r.role === "user" ? ("user" as const) : ("assistant" as const),
      content: r.content,
    }))
    .slice(-12);
}

const FLOATING_KUBER_CUE_GROUPS = [...KUBER_CUE_GROUPS, KUBER_EXTENSION_PAGE_CUES];

/** PROJECT_SPEC routing: scenario / drift language opens Rebalance instead of hallucinating trades in chat. */
function rebalanceHrefFromPrompt(prompt: string): string | null {
  const t = prompt.trim().toLowerCase();
  if (!t) return null;

  if (/market'?s?\s+(drop|fall|crash).{0,26}20|20\s*%/.test(t) || /^what if markets.*?20/.test(t)) {
    return "/rebalance?source=scenario&name=market-drop-20";
  }
  if (/need \$?5,?000|\$5,?000\s+soon|\bwithdrawal\b.*\$5,?000\b/.test(t)) {
    return "/rebalance?source=scenario&name=withdraw-20-percent";
  }
  if (/inflation.*(high|stays|sticky)/.test(t) || /\bsticky inflation\b/.test(t)) {
    return "/rebalance?source=scenario&name=inflation-stays-high";
  }
  if (/\brebalance\b|allocation\s+drift|drift\s+allocation|too\s+risky.*\bstock\b|too\s+much\b.*equity\b/.test(t)) {
    return "/rebalance?source=scenario";
  }
  if (/market'?s?\s+(drop|fall|crash).{0,26}30|30\s*%/.test(t)) {
    return "/rebalance?source=scenario&name=market-drop-30";
  }
  if (/lose.{0,8}job|emergency.?fund.?job\b/.test(t)) {
    return "/rebalance?source=scenario&name=lose-job-need-emergency";
  }
  return null;
}

export function FloatingKuber() {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [isOpen, setIsOpen] = useState(false);
  const mounted = useSyncExternalStore(subscribeToClientMount, mountedOnClient, notMountedServer);
  const [message, setMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatRow[]>([]);
  const [isSending, setIsSending] = useState(false);
  const chatRef = useRef<ChatRow[]>([]);
  const speakTeardownRef = useRef<(() => void) | null>(null);
  const chatScrollAnchorRef = useRef<HTMLDivElement | null>(null);
  const firstName = getFirstName(user?.user_metadata?.full_name);

  const overlayTransition = reduceMotion ? { duration: 0 } : panelTransition;

  const isHiddenRoute = useMemo(() => {
    const p = pathname.toLowerCase();
    if (p.startsWith("/kuber/preview")) return false;
    return p === "/kuber" || p.startsWith("/rebalance") || p === "/panic";
  }, [pathname]);

  /** Tell KuberOrb / other canvases to stop animating before the browser paints the overlay. */
  useLayoutEffect(() => {
    if (isHiddenRoute) return;
    window.dispatchEvent(
      new CustomEvent<FloatingKuberVisibilityDetail>(FLOATING_KUBER_VISIBILITY, { detail: { open: isOpen } })
    );
  }, [isOpen, isHiddenRoute]);

  useEffect(() => {
    if (!isHiddenRoute) return;
    window.dispatchEvent(
      new CustomEvent<FloatingKuberVisibilityDetail>(FLOATING_KUBER_VISIBILITY, { detail: { open: false } })
    );
  }, [isHiddenRoute]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  useEffect(() => {
    chatRef.current = chatMessages;
  }, [chatMessages]);

  useEffect(() => {
    chatScrollAnchorRef.current?.scrollIntoView({ block: "end" });
  }, [chatMessages]);

  useEffect(() => {
    const onOpen = (event: Event) => {
      const customEvent = event as CustomEvent<{ prompt?: string }>;
      const prompt = customEvent.detail?.prompt ?? "";
      setIsOpen(true);
      setMessage(prompt);
    };

    window.addEventListener("investiq:open-kuber", onOpen as EventListener);
    return () => window.removeEventListener("investiq:open-kuber", onOpen as EventListener);
  }, []);

  const stopSpeakPlayback = useCallback(() => {
    window.speechSynthesis?.cancel();
    speakTeardownRef.current?.();
    speakTeardownRef.current = null;
  }, []);

  useEffect(() => {
    return () => stopSpeakPlayback();
  }, [stopSpeakPlayback]);

  useEffect(() => {
    if (!isOpen) stopSpeakPlayback();
  }, [isOpen, stopSpeakPlayback]);

  const speakLine = useCallback(async (spokenText: string) => {
    if (typeof window === "undefined") return;
    stopSpeakPlayback();
    const clipped = spokenText.trim().slice(0, 4800);
    if (!clipped) return;

    try {
      const abort =
        typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
          ? AbortSignal.timeout(30_000)
          : undefined;
      const response = await fetch("/api/kuber/speak", {
        method: "POST",
        headers: { "content-type": "application/json" },
        ...(abort ? { signal: abort } : {}),
        body: JSON.stringify({ text: clipped }),
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio();
        audio.src = url;
        const teardown = () => {
          audio.pause();
          URL.revokeObjectURL(url);
          if (speakTeardownRef.current === teardown) speakTeardownRef.current = null;
        };
        audio.onended = teardown;
        audio.onerror = teardown;
        speakTeardownRef.current = teardown;
        await audio.play().catch(teardown);
        return;
      }
    } catch {
      // fallback below
    }

    const synth = window.speechSynthesis;
    if (!synth) return;
    const utterance = new SpeechSynthesisUtterance(clipped);
    utterance.rate = 1.02;
    const voices = synth.getVoices?.() ?? [];
    const voice = voices.find((v) => v.lang?.toLowerCase().startsWith("en")) ?? voices[0];
    if (voice) utterance.voice = voice;
    synth.speak(utterance);
  }, [stopSpeakPlayback]);

  const submitChat = useCallback(
    async (trimmedPrompt: string) => {
      const trimmed = trimmedPrompt.trim();
      if (!trimmed || isSending) return;

      const routed = rebalanceHrefFromPrompt(trimmed);
      if (routed) {
        const userRow: ChatRow = {
          id: `user-${Date.now()}`,
          role: "user",
          content: trimmed,
        };
        const assistantRow: ChatRow = {
          id: `route-${Date.now()}`,
          role: "kuber",
          content: "Let me walk you through that in Rebalance so the math stays deterministic — opening it now.",
        };
        const nextThread = [...chatRef.current, userRow, assistantRow];
        chatRef.current = nextThread;
        setChatMessages(nextThread);
        setMessage("");
        router.push(routed);
        return;
      }

      const userRow: ChatRow = {
        id: `user-${Date.now()}`,
        role: "user",
        content: trimmed,
      };
      const nextThread = [...chatRef.current, userRow];
      chatRef.current = nextThread;
      setChatMessages(nextThread);
      setMessage("");
      setIsSending(true);

      const abort =
        typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
          ? AbortSignal.timeout(45_000)
          : undefined;

      try {
        const response = await fetch("/api/kuber/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          ...(abort ? { signal: abort } : {}),
          body: JSON.stringify({
            mode: "floating",
            stream: true,
            messages: toApiTurns(nextThread),
            context: {
              title: typeof document !== "undefined" ? document.title : "InvestIQ",
              url: typeof window !== "undefined" ? window.location.href : "",
              excerpt: excerptFromDom(),
              classified: { badgeLabel: "In InvestIQ app" },
            },
          }),
        });

        if (!response.ok) {
          const errBody = await response.text();
          throw new Error(`${response.status}: ${errBody}`);
        }

        const answer = await readKuberChatResponse(response);
        setChatMessages((prev) => {
          const updated: ChatRow[] = [
            ...prev,
            { id: `kuber-${Date.now()}`, role: "kuber", content: answer },
          ];
          chatRef.current = updated;
          return updated;
        });
      } catch {
        setChatMessages((prev) => {
          const updated: ChatRow[] = [
            ...prev,
            {
              id: `fallback-${Date.now()}`,
              role: "kuber",
              content:
                "I could not reach the chat service. Check `GROQ_API_KEY` in `apps/web/.env` and that this page can call `/api/kuber/chat`.",
            },
          ];
          chatRef.current = updated;
          return updated;
        });
      } finally {
        setIsSending(false);
      }
    },
    [isSending, router],
  );

  const showCueChips = !chatMessages.some((message) => message.role === "user");

  const lastKuberReply = useMemo(() => {
    for (let i = chatMessages.length - 1; i >= 0; i--) {
      if (chatMessages[i]?.role === "kuber") return chatMessages[i]!.content;
    }
    return null;
  }, [chatMessages]);

  const sendFromComposer = () => {
    void submitChat(message);
  };

  if (isHiddenRoute) {
    return null;
  }

  const portalModal = mounted
    ? createPortal(
          <AnimatePresence>
            {isOpen ? (
              <>
                <motion.button
                  key="kuber-backdrop"
                  type="button"
                  aria-label="Close Kuber backdrop"
                  className="fixed inset-0 cursor-default bg-transparent"
                  style={{
                    backgroundColor: colors.overlay,
                    zIndex: Z_BACKDROP,
                    contain: "strict",
                  }}
                  initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
                  transition={overlayTransition}
                  onClick={() => setIsOpen(false)}
                />

                <motion.div
                  key="kuber-panel"
                  className="fixed bottom-6 right-6 flex h-[520px] max-h-[calc(100vh-3rem)] w-[min(100vw-1.75rem,26rem)] flex-col overflow-hidden ring-2"
                  style={{
                    zIndex: Z_PANEL,
                    borderRadius: radii.xl,
                    background: `linear-gradient(165deg, ${colors.cardBg} 0%, color-mix(in srgb, ${colors.surfaceElevated} 55%, ${colors.background}) 100%)`,
                    boxShadow: shadows.popover,
                    borderColor: `${colors.accent}33`,
                  }}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="floating-kuber-title"
                  initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
                  transition={overlayTransition}
                >
                  <div
                    className="flex items-center justify-between p-4"
                    style={{
                      background: `linear-gradient(90deg, ${colors.accent} 0%, color-mix(in srgb, ${colors.accent} 65%, ${colors.green}) 100%)`,
                      color: colors.onAccent,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg"
                        style={{
                          fontFamily: typography.serif,
                          background: `radial-gradient(circle at 30% 25%, ${colors.onAccent}22, transparent 55%)`,
                          border: `1px solid ${colors.onAccent}44`,
                        }}
                      >
                        K
                      </div>
                      <div>
                        <div id="floating-kuber-title" className="text-lg leading-tight">
                          Kuber
                        </div>
                        <div className="flex items-center gap-1 text-[11px] opacity-90">
                          <Sparkles className="h-3 w-3 shrink-0" />
                          <span>Guidance layer</span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-black/18"
                      aria-label="Close Kuber"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                    <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-3 pt-4">
                      <div className="space-y-4">
                        {chatMessages.length === 0 ? (
                          <div
                            className="text-center text-sm"
                            style={{ fontFamily: typography.serif, color: colors.text }}
                          >
                            Hi {firstName}. What can I help with?
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {chatMessages.map((chat) => (
                              <div
                                key={chat.id}
                                className={`flex ${chat.role === "user" ? "justify-end" : "justify-start"}`}
                              >
                                <div className="max-w-[88%] min-w-0">
                                  <div
                                    className="rounded-2xl px-4 py-2.5 text-sm shadow-sm"
                                    style={{
                                      backgroundColor: chat.role === "user" ? colors.accent : colors.surface,
                                      color: chat.role === "user" ? colors.onAccent : colors.text,
                                      border: chat.role === "user" ? "none" : `1px solid ${colors.border}`,
                                    }}
                                  >
                                    {chat.content}
                                  </div>
                                  {chat.role === "kuber" ? (
                                    <button
                                      type="button"
                                      className="mt-1.5 rounded-lg px-2.5 py-1 text-[12px] font-semibold ring-1 transition-colors hover:bg-white/[0.04]"
                                      style={{
                                        borderColor: colors.border,
                                        color: colors.accent,
                                      }}
                                      aria-label="Read this reply aloud"
                                      onClick={() => void speakLine(chat.content)}
                                    >
                                      Speak
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {showCueChips ? (
                          <div
                            className="border-t pt-4"
                            style={{ borderColor: colors.border }}
                          >
                            {FLOATING_KUBER_CUE_GROUPS.map((group) => (
                              <div key={group.label} className="mb-4 last:mb-0">
                                <div className="mb-2 text-xs uppercase tracking-wide" style={{ color: colors.textMuted }}>
                                  {group.label}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {group.chips.map((chip) => (
                                    <button
                                      key={chip}
                                      type="button"
                                      disabled={isSending}
                                      className="ring-1 transition-transform hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
                                      style={{
                                        ...investiqFilterChipStyle(false),
                                        fontSize: "12px",
                                        padding: "6px 12px",
                                        borderColor: colors.border,
                                      }}
                                      onClick={() => void submitChat(chip)}
                                    >
                                      {chip}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null}
                        <div ref={chatScrollAnchorRef} className="h-px shrink-0" aria-hidden />
                      </div>
                    </div>
                  </div>

                  <div
                    className="shrink-0 border-t px-4 pb-4 pt-3"
                    style={{
                      borderColor: colors.border,
                      backgroundColor: colors.background,
                      boxShadow: "0 -8px 28px rgba(0, 0, 0, 0.22)",
                    }}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <button
                        type="button"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1 disabled:cursor-not-allowed disabled:opacity-40"
                        style={{
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        }}
                        aria-label="Speak last Kuber reply"
                        title="Uses ElevenLabs when configured; otherwise browser voice"
                        disabled={!lastKuberReply || isSending}
                        onClick={() => lastKuberReply && void speakLine(lastKuberReply)}
                      >
                        <Mic className="h-4 w-4" style={{ color: colors.accent }} />
                      </button>
                      <input
                        type="text"
                        name="floating-kuber-message"
                        id="floating-kuber-message"
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        placeholder="Ask Kuber…"
                        className="flex-1 rounded-full outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-[var(--investiq-accent)]/40"
                        style={{
                          ...investiqFieldStyle(),
                          borderRadius: radii.pill,
                          flex: 1,
                          width: "auto",
                          minWidth: 0,
                        }}
                        disabled={isSending}
                        onKeyDown={(e) => {
                          if (e.key !== "Enter") return;
                          e.preventDefault();
                          sendFromComposer();
                        }}
                      />
                      <button
                        type="button"
                        className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full shadow-md transition-transform hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
                        style={{ backgroundColor: colors.accent }}
                        aria-label="Send message"
                        disabled={isSending || !message.trim()}
                        onClick={() => sendFromComposer()}
                      >
                        {isSending ? (
                          <span className="text-sm font-bold" style={{ color: colors.onAccent }}>
                            …
                          </span>
                        ) : (
                          <Send className="h-4 w-4" style={{ color: colors.onAccent }} />
                        )}
                      </button>
                    </div>
                    <Link
                      href="/Kuber"
                      className="inline-flex items-center gap-1 text-xs font-medium hover:underline"
                      style={{ color: colors.accent }}
                    >
                      Open full Kuber workspace →
                    </Link>
                  </div>
                </motion.div>
              </>
            ) : null}
          </AnimatePresence>,
          document.body
        )
      : null;

  return (
    <>
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 flex h-[3.65rem] w-[3.65rem] cursor-pointer items-center justify-center rounded-full ring-[3px] transition-[transform,opacity] duration-200 hover:brightness-105 active:scale-[0.97] motion-safe:hover:scale-[1.04]"
          aria-label="Open Kuber assistant"
          style={{
            zIndex: Z_FAB,
            background: `linear-gradient(145deg, ${colors.accent} 12%, ${colors.green} 130%)`,
            color: colors.onAccent,
            boxShadow: shadows.floatingButton,
            borderColor: `${colors.onAccent}55`,
          }}
        >
          <span className="text-2xl select-none" style={{ fontFamily: typography.serif }}>
            K
          </span>
        </button>
      ) : null}

      {portalModal}
    </>
  );
}

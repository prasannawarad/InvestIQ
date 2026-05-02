"use client";

import { useEffect, useLayoutEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mic, Send, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { colors, radii, shadows, typography } from "@investiq/ui/tokens";
import { FLOATING_KUBER_VISIBILITY, type FloatingKuberVisibilityDetail } from "../../lib/floatingKuberEvents";
import { investiqFieldStyle, investiqFilterChipStyle } from "../../lib/investiqUi";
import { useAuth } from "./auth/AuthProvider";

const chipGroups = [
  {
    label: "SCENARIOS",
    chips: [
      "What if markets drop 20%?",
      "What if I need $5,000 soon?",
      "What if inflation stays high?",
    ],
  },
  {
    label: "QUICK QUESTIONS",
    chips: ["Am I at risk?", "What should I know today?", "Why did my portfolio drop?"],
  },
  {
    label: "JARGON",
    chips: ["Explain P/E ratio", "What's an expense ratio?"],
  },
];

interface Message {
  role: "kuber" | "user";
  content: string;
}

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

export function FloatingKuber() {
  const { user } = useAuth();
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const [isOpen, setIsOpen] = useState(false);
  const mounted = useSyncExternalStore(subscribeToClientMount, mountedOnClient, notMountedServer);
  const [message, setMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const firstName = getFirstName(user?.user_metadata?.full_name);

  const overlayTransition = reduceMotion ? { duration: 0 } : panelTransition;

  const isHiddenRoute = useMemo(() => {
    return (
      pathname.startsWith("/Kuber") ||
      pathname.startsWith("/kuber") ||
      pathname.startsWith("/rebalance") ||
      pathname === "/panic"
    );
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
    const onOpen = (event: Event) => {
      const customEvent = event as CustomEvent<{ prompt?: string }>;
      const prompt = customEvent.detail?.prompt ?? "";
      setIsOpen(true);
      setMessage(prompt);
    };

    window.addEventListener("investiq:open-kuber", onOpen as EventListener);
    return () => window.removeEventListener("investiq:open-kuber", onOpen as EventListener);
  }, []);

  const appendExchange = () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    setChatMessages((prev) => [
      ...prev,
      { role: "user", content: trimmed },
      { role: "kuber", content: "Streaming Groq + voice is wired in Person 2 — Kuber hears you." },
    ]);
    setMessage("");
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
                    contain: "layout paint",
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

                  <div className="flex-1 overflow-y-auto overscroll-contain p-4">
                    {chatMessages.length === 0 ? (
                      <div className="space-y-4">
                        <div className="mb-6 text-center" style={{ fontFamily: typography.serif, color: colors.text }}>
                          Hi {firstName}. What can I help with?
                        </div>
                        {chipGroups.map((group) => (
                          <div key={group.label}>
                            <div className="mb-2 text-xs uppercase tracking-wide" style={{ color: colors.textMuted }}>
                              {group.label}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {group.chips.map((chip) => (
                                <button
                                  key={chip}
                                  type="button"
                                  className="ring-1 transition-transform hover:brightness-110 active:scale-[0.98]"
                                  style={{
                                    ...investiqFilterChipStyle(false),
                                    fontSize: "12px",
                                    padding: "6px 12px",
                                    borderColor: colors.border,
                                  }}
                                  onClick={() => setMessage(chip)}
                                >
                                  {chip}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {chatMessages.map((chat, index) => (
                          <div key={index} className={`flex ${chat.role === "user" ? "justify-end" : "justify-start"}`}>
                            <div
                              className="max-w-[88%] rounded-2xl px-4 py-2.5 text-sm shadow-sm"
                              style={{
                                backgroundColor: chat.role === "user" ? colors.accent : colors.surface,
                                color: chat.role === "user" ? colors.onAccent : colors.text,
                                border: chat.role === "user" ? "none" : `1px solid ${colors.border}`,
                              }}
                            >
                              {chat.content}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="p-4" style={{ borderTop: `1px solid ${colors.border}` }}>
                    <div className="mb-2 flex items-center gap-2">
                      <button
                        type="button"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1"
                        style={{
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        }}
                      >
                        <Mic className="h-4 w-4" style={{ color: colors.accent }} />
                      </button>
                      <input
                        type="text"
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
                        onKeyDown={(e) => {
                          if (e.key !== "Enter") return;
                          e.preventDefault();
                          appendExchange();
                        }}
                      />
                      <button
                        type="button"
                        className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full shadow-md transition-transform active:scale-95 hover:brightness-110"
                        style={{ backgroundColor: colors.accent }}
                        aria-label="Send message"
                        onClick={() => appendExchange()}
                      >
                        <Send className="h-4 w-4" style={{ color: colors.onAccent }} />
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

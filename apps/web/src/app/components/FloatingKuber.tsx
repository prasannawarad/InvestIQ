"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mic, Send, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { colors, radii, shadows, typography } from "@investiq/ui/tokens";
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

export function FloatingKuber() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const firstName = getFirstName(user?.user_metadata?.full_name);

  const isHiddenRoute = useMemo(() => {
    return (
      pathname.startsWith("/Kuber") ||
      pathname.startsWith("/kuber") ||
      pathname.startsWith("/rebalance") ||
      pathname === "/panic"
    );
  }, [pathname]);

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

  if (isHiddenRoute) {
    return null;
  }

  return (
    <AnimatePresence mode="sync">
      {isOpen ? (
        <>
          <motion.button
            type="button"
            aria-label="Close Kuber backdrop"
            className="fixed inset-0 z-40 backdrop-blur-[2px]"
            style={{ background: "rgba(26, 36, 56, 0.06)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
          />

          <motion.div
            className="fixed bottom-6 right-6 z-50 flex h-[520px] max-h-[calc(100vh-3rem)] w-[min(100vw-1.75rem,26rem)] flex-col overflow-hidden ring-2"
            style={{
              borderRadius: radii.xl,
              background: `linear-gradient(165deg, ${colors.cardBg} 0%, color-mix(in srgb, ${colors.backgroundPanic} 35%, white) 100%)`,
              boxShadow: shadows.popover,
              borderColor: `${colors.accent}33`,
            }}
            role="dialog"
            aria-labelledby="floating-kuber-title"
            initial={{ opacity: 0, y: 28, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
          >
            <div
              className="flex items-center justify-between p-4"
              style={{
                background: `linear-gradient(90deg, ${colors.accent} 0%, color-mix(in srgb, ${colors.accent} 65%, ${colors.green}) 100%)`,
                color: colors.cardBg,
              }}
            >
              <div className="flex items-center gap-3">
                <motion.div
                  className="flex h-10 w-10 items-center justify-center rounded-full text-lg"
                  style={{
                    fontFamily: typography.serif,
                    background: `radial-gradient(circle at 30% 25%, ${colors.cardBg}22, transparent 55%)`,
                    border: `1px solid ${colors.cardBg}44`,
                  }}
                  animate={{ rotate: [0, 2, -2, 0] }}
                  transition={{ duration: 5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                >
                  K
                </motion.div>
                <div>
                  <div id="floating-kuber-title" className="text-lg leading-tight">
                    Kuber
                  </div>
                  <div className="flex items-center gap-1 text-[11px] opacity-90">
                    <Sparkles className="h-3 w-3" />
                    <span>Guidance layer</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/15"
                aria-label="Close Kuber"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
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
                          <motion.button
                            key={chip}
                            type="button"
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.98 }}
                            className="rounded-full px-3 py-1.5 text-xs ring-1"
                            style={{
                              backgroundColor: colors.backgroundPanic,
                              color: colors.text,
                              borderColor: colors.border,
                            }}
                            onClick={() => setMessage(chip)}
                          >
                            {chip}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {chatMessages.map((chat, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: chat.role === "user" ? 12 : -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex ${chat.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className="max-w-[88%] rounded-2xl px-4 py-2.5 text-sm shadow-sm"
                        style={{
                          backgroundColor: chat.role === "user" ? colors.accent : colors.backgroundPanic,
                          color: chat.role === "user" ? colors.cardBg : colors.text,
                          border: chat.role === "user" ? "none" : `1px solid ${colors.border}`,
                        }}
                      >
                        {chat.content}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4" style={{ borderTop: `1px solid ${colors.border}` }}>
              <div className="mb-2 flex items-center gap-2">
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-full ring-1"
                  style={{
                    backgroundColor: colors.backgroundPanic,
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
                  className="flex-1 rounded-full border px-4 py-2 text-sm outline-none transition-shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--investiq-accent)]"
                  style={{
                    backgroundColor: colors.backgroundPanic,
                    color: colors.text,
                    borderColor: colors.border,
                    boxShadow: "none",
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    if (!message.trim()) return;
                    setChatMessages((prev) => [
                      ...prev,
                      { role: "user", content: message.trim() },
                      { role: "kuber", content: "Streaming Groq + voice is wired in Person 2 — Kuber hears you." },
                    ]);
                    setMessage("");
                  }}
                />
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex h-9 w-9 items-center justify-center rounded-full shadow-md"
                  style={{ backgroundColor: colors.accent }}
                  aria-label="Send message"
                  onClick={() => {
                    if (!message.trim()) return;
                    setChatMessages((prev) => [
                      ...prev,
                      { role: "user", content: message.trim() },
                      { role: "kuber", content: "Streaming Groq + voice is wired in Person 2 — Kuber hears you." },
                    ]);
                    setMessage("");
                  }}
                >
                  <Send className="h-4 w-4" style={{ color: colors.cardBg }} />
                </motion.button>
              </div>
              <Link href="/Kuber" className="inline-flex items-center gap-1 text-xs font-medium hover:underline" style={{ color: colors.accent }}>
                Open full Kuber workspace →
              </Link>
            </div>
          </motion.div>
        </>
      ) : (
        <motion.button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-[3.65rem] w-[3.65rem] items-center justify-center rounded-full ring-[3px]"
          aria-label="Open Kuber assistant"
          style={{
            background: `linear-gradient(145deg, ${colors.accent} 12%, ${colors.green} 130%)`,
            color: colors.cardBg,
            boxShadow: shadows.floatingButton,
            borderColor: `${colors.cardBg}88`,
          }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          initial={{ scale: 0.88, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 360, damping: 22 }}
        >
          <span className="text-2xl" style={{ fontFamily: typography.serif }}>
            K
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

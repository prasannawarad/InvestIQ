"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mic, Send, X } from "lucide-react";
import { colors, radii, shadows, typography } from "@investiq/ui/tokens";

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

export function FloatingKuber() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<Message[]>([]);

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

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full"
        style={{
          backgroundColor: colors.accent,
          color: colors.cardBg,
          boxShadow: shadows.floatingButton,
          animation: "pulse 5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        }}
      >
        <span className="text-xl" style={{ fontFamily: typography.serif }}>
          K
        </span>
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex h-[500px] w-96 flex-col overflow-hidden"
      style={{ borderRadius: radii.xl, boxShadow: shadows.popover, backgroundColor: colors.cardBg }}
    >
      <div
        className="flex items-center justify-between p-4"
        style={{ backgroundColor: colors.accent, color: colors.cardBg }}
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">Kuber</span>
          <span className="text-xs opacity-90">Listening</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="flex h-6 w-6 items-center justify-center rounded-full"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {chatMessages.length === 0 ? (
          <div className="space-y-4">
            <div className="mb-6 text-center" style={{ fontFamily: typography.serif, color: colors.text }}>
              Hi Priya. What can I help with?
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
                      className="rounded-full px-3 py-1.5 text-xs transition-colors"
                      style={{ backgroundColor: colors.backgroundPanic, color: colors.text }}
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
                  className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm"
                  style={{
                    backgroundColor: chat.role === "user" ? colors.accent : colors.backgroundPanic,
                    color: chat.role === "user" ? colors.cardBg : colors.text,
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
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{ backgroundColor: colors.backgroundPanic }}
          >
            <Mic className="h-4 w-4" style={{ color: colors.accent }} />
          </button>
          <input
            type="text"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Ask Kuber..."
            className="flex-1 rounded-full px-3 py-2 text-sm focus:outline-none focus:ring-2"
            style={{
              backgroundColor: colors.backgroundPanic,
              color: colors.text,
              border: `1px solid ${colors.border}`,
            }}
          />
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{ backgroundColor: colors.accent }}
            onClick={() => {
              if (!message.trim()) return;
              setChatMessages((prev) => [
                ...prev,
                { role: "user", content: message.trim() },
                { role: "kuber", content: "Streaming response is wired by Person 2 in the next step." },
              ]);
              setMessage("");
            }}
          >
            <Send className="h-4 w-4" style={{ color: colors.cardBg }} />
          </button>
        </div>
        <Link href="/Kuber" className="text-xs hover:underline" style={{ color: colors.accent }}>
          Open full Kuber →
        </Link>
      </div>
    </div>
  );
}

"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { colors } from "@investiq/ui/tokens";
import { FLOATING_KUBER_VISIBILITY, type FloatingKuberVisibilityDetail } from "../../../lib/floatingKuberEvents";

/** Static snapshot when floating chat is open — no blur / no JS animation drivers. */
function KuberOrbStatic({ size, dim }: { size: "sm" | "md" | "lg"; dim: number }) {
  const fontSize = size === "lg" ? "3.25rem" : size === "md" ? "2.25rem" : "1.5rem";
  return (
    <div className="relative shrink-0" style={{ width: dim, height: dim }}>
      <div
        className="absolute inset-2 rounded-full opacity-70"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${colors.accent}55, transparent 62%),
                      radial-gradient(circle at 70% 60%, ${colors.green}44, transparent 55%),
                      radial-gradient(circle at 50% 50%, ${colors.amber}33, transparent 50%)`,
        }}
      />
      <div
        className="absolute inset-0 rounded-full ring-2"
        style={{
          borderColor: `${colors.accent}55`,
          background: `linear-gradient(145deg, ${colors.cardBg}f8 0%, ${colors.backgroundPanic}ee 45%, ${colors.cardBg}f2 100%)`,
          boxShadow: "0 8px 32px rgba(61,122,111,0.16)",
        }}
      />
      <div
        className="absolute inset-3 flex items-center justify-center rounded-full"
        style={{
          fontFamily: "var(--investiq-font-serif), Georgia, serif",
          background: `linear-gradient(160deg, ${colors.accent} 0%, #2f5f56 55%, ${colors.green}aa 110%)`,
          color: colors.onAccent,
          fontSize,
        }}
      >
        K
      </div>
    </div>
  );
}

/** Futuristic halo + letter mark for Kuber (no “Sage” — product name is Kuber). */
export function KuberOrb({ size = "md", className = "" }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const dim = size === "lg" ? 160 : size === "md" ? 112 : 72;
  const [floatingChatOpen, setFloatingChatOpen] = useState(false);

  useEffect(() => {
    const onVis = (event: Event) => {
      const detail = (event as CustomEvent<FloatingKuberVisibilityDetail>).detail;
      setFloatingChatOpen(detail?.open ?? false);
    };
    window.addEventListener(FLOATING_KUBER_VISIBILITY, onVis as EventListener);
    return () => window.removeEventListener(FLOATING_KUBER_VISIBILITY, onVis as EventListener);
  }, []);

  if (floatingChatOpen) {
    return (
      <div className={`relative shrink-0 ${className}`} style={{ contain: "layout paint" }}>
        <KuberOrbStatic size={size} dim={dim} />
      </div>
    );
  }

  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: dim, height: dim, contain: "layout paint" }}>
      <motion.div
        className="absolute inset-2 rounded-full opacity-75 blur-xl"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${colors.accent}99, transparent 62%),
                      radial-gradient(circle at 70% 60%, ${colors.green}77, transparent 55%),
                      radial-gradient(circle at 50% 50%, ${colors.amber}55, transparent 50%)`,
        }}
        animate={{ scale: [1, 1.08, 1], rotate: [0, 4, -2, 0] }}
        transition={{ duration: 10, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-0 rounded-full ring-2"
        style={{
          borderColor: `${colors.accent}55`,
          background: `linear-gradient(145deg, ${colors.cardBg}f8 0%, ${colors.backgroundPanic}ee 45%, ${colors.cardBg}f2 100%)`,
          boxShadow: `inset 0 1px 0 ${colors.cardBg}, 0 8px 32px rgba(61,122,111,0.18)`,
        }}
        animate={{ boxShadow: ["0 8px 32px rgba(61,122,111,0.12)", "0 12px 40px rgba(61,122,111,0.22)", "0 8px 32px rgba(61,122,111,0.12)"] }}
        transition={{ duration: 4.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-3 flex items-center justify-center rounded-full text-2xl"
        style={{
          fontFamily: "var(--investiq-font-serif), Georgia, serif",
          background: `linear-gradient(160deg, ${colors.accent} 0%, #2f5f56 55%, ${colors.green}aa 110%)`,
          color: colors.onAccent,
          fontSize: size === "lg" ? "3.25rem" : size === "md" ? "2.25rem" : "1.5rem",
        }}
        animate={{ rotate: [-1.8, 1.8, -1.8] }}
        transition={{ duration: 6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      >
        K
      </motion.div>
    </div>
  );
}

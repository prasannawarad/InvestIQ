"use client";

import { motion } from "framer-motion";
import { colors } from "@investiq/ui/tokens";

/** Futuristic halo + letter mark for Kuber (no “Sage” — product name is Kuber). */
export function KuberOrb({ size = "md", className = "" }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const dim = size === "lg" ? 160 : size === "md" ? 112 : 72;
  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: dim, height: dim }}>
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
          color: colors.cardBg,
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

"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { colors } from "@investiq/ui/tokens";
import { FLOATING_KUBER_VISIBILITY, type FloatingKuberVisibilityDetail } from "../../../lib/floatingKuberEvents";

const ORB_HALO = `radial-gradient(circle at 30% 30%, rgba(45, 212, 191, 0.58), transparent 62%),
                  radial-gradient(circle at 70% 60%, rgba(74, 222, 147, 0.44), transparent 55%),
                  radial-gradient(circle at 50% 50%, rgba(232, 189, 92, 0.32), transparent 50%)`;

const ORB_SHELL = `linear-gradient(145deg, rgba(10,17,25,0.97) 0%, rgba(8,12,19,0.93) 45%, rgba(10,17,25,0.95) 100%)`;
const ORB_CORE = `linear-gradient(160deg, ${colors.accent} 0%, #2f5f56 55%, rgba(74, 222, 147, 0.66) 110%)`;

/** Static snapshot when floating chat is open — no blur / no JS animation drivers. */
function KuberOrbStatic({ size, dim }: { size: "sm" | "md" | "lg"; dim: number }) {
  const fontSize = size === "lg" ? "3.25rem" : size === "md" ? "2.25rem" : "1.5rem";
  return (
    <div className="relative shrink-0" style={{ width: dim, height: dim }}>
      <div
        className="absolute inset-2 rounded-full opacity-70"
        style={{
          background: ORB_HALO,
          filter: "blur(14px)",
        }}
      />
      <div
        className="absolute inset-0 rounded-full ring-2"
        style={{
          borderColor: "rgba(45, 212, 191, 0.33)",
          background: ORB_SHELL,
          boxShadow: "0 12px 38px rgba(61, 122, 111, 0.2)",
        }}
      />
      <div
        className="absolute inset-3 flex items-center justify-center rounded-full"
        style={{
          fontFamily: "var(--investiq-font-serif), Georgia, serif",
          background: ORB_CORE,
          color: "rgb(3, 16, 22)",
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
      <div className={`relative shrink-0 ${className}`} style={{ contain: "layout paint", borderRadius: "9999px" }}>
        <KuberOrbStatic size={size} dim={dim} />
      </div>
    );
  }

  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={{ width: dim, height: dim, contain: "layout paint", borderRadius: "9999px" }}
    >
      <motion.div
        className="absolute inset-2 rounded-full opacity-75 blur-xl"
        style={{
          background: ORB_HALO,
        }}
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-0 rounded-full ring-2"
        style={{
          borderColor: "rgba(45, 212, 191, 0.33)",
          background: ORB_SHELL,
          boxShadow: "0 12px 38px rgba(61, 122, 111, 0.2)",
        }}
        animate={{ boxShadow: ["0 10px 32px rgba(61,122,111,0.14)", "0 14px 42px rgba(61,122,111,0.24)", "0 10px 32px rgba(61,122,111,0.14)"] }}
        transition={{ duration: 5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-3 flex items-center justify-center rounded-full text-2xl"
        style={{
          fontFamily: "var(--investiq-font-serif), Georgia, serif",
          background: ORB_CORE,
          color: "rgb(3, 16, 22)",
          fontSize: size === "lg" ? "3.25rem" : size === "md" ? "2.25rem" : "1.5rem",
        }}
        animate={{ rotate: [-1.6, 1.6, -1.6] }}
        transition={{ duration: 8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      >
        K
      </motion.div>
    </div>
  );
}

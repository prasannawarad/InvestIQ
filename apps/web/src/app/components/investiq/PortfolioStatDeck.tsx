"use client";

import { CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { colors, typography } from "@investiq/ui/tokens";
import { investiqCardStyle } from "../../../lib/investiqUi";
import { AnimatedCounter } from "./AnimatedCounter";

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.06 * i, duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

interface PortfolioStatDeckProps {
  totalValueUsd: number;
  dayChangeAbsUsd: number;
  dayChangePercent: number;
  dayChangeType: "positive" | "negative" | "neutral";
  healthScore: number;
  healthVerdict: string;
}

function currency0(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function PortfolioStatDeck({
  totalValueUsd,
  dayChangeAbsUsd,
  dayChangePercent,
  dayChangeType,
  healthScore,
  healthVerdict,
}: PortfolioStatDeckProps) {
  const changeColor =
    dayChangeType === "positive" ? colors.green : dayChangeType === "negative" ? colors.coral : colors.textMuted;
  const prefix = dayChangeType === "positive" ? "+" : dayChangeType === "negative" ? "−" : "";

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
      <motion.div variants={cardVariants} custom={0} initial="hidden" animate="show">
        <div
          className="relative overflow-hidden p-6 ring-1"
          style={{
            ...investiqCardStyle(),
            borderColor: `${colors.border}cc`,
          }}
        >
          <div
            className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-25 blur-2xl"
            style={{ background: colors.accent }}
          />
          <div className="mb-1 text-sm" style={{ color: colors.textMuted }}>
            Total Value
          </div>
          <div className="text-3xl" style={{ fontFamily: typography.serif, color: colors.text }}>
            <AnimatedCounter value={totalValueUsd} format={(v) => currency0(v)} />
          </div>
          <motion.div className="mt-2 h-1 overflow-hidden rounded-full" style={{ backgroundColor: colors.surface }}>
            <motion.div
              className="h-full rounded-full"
              style={{
                background: `linear-gradient(90deg, ${colors.accent}88, ${colors.green})`,
                transformOrigin: "left",
              }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.35, duration: 1, ease: [0.22, 1, 0.36, 1] }}
            />
          </motion.div>
        </div>
      </motion.div>

      <motion.div variants={cardVariants} custom={1} initial="hidden" animate="show">
        <div
          className="relative overflow-hidden p-6 ring-1"
          style={{
            ...investiqCardStyle(),
            borderColor: `${colors.border}cc`,
          }}
        >
          <div className="mb-1 text-sm" style={{ color: colors.textMuted }}>
            Today&apos;s Change
          </div>
          <div className="text-3xl" style={{ fontFamily: typography.serif, color: colors.text }}>
            <span aria-hidden>{prefix}</span>
            <AnimatedCounter value={dayChangeAbsUsd} format={(v) => currency0(v)} />
          </div>
          <div className="mt-1 text-sm" style={{ color: changeColor }}>
            <AnimatedCounter value={Math.abs(dayChangePercent)} format={(v) => `${v.toFixed(2)}%`} />
          </div>
        </div>
      </motion.div>

      <motion.div variants={cardVariants} custom={2} initial="hidden" animate="show">
        <div
          className="relative overflow-hidden p-6 ring-1"
          style={{
            ...investiqCardStyle(),
            borderColor: `${colors.border}cc`,
          }}
        >
          <div className="mb-1 flex items-center justify-between text-sm">
            <span style={{ color: colors.textMuted }}>Health Score</span>
            <motion.div
              initial={{ rotate: -10, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ delay: 0.55, duration: 0.4 }}
            >
              <CheckCircle className="h-6 w-6" style={{ color: colors.green }} />
            </motion.div>
          </div>
          <div className="text-3xl" style={{ fontFamily: typography.serif, color: colors.text }}>
            {healthVerdict}{" "}
            <span className="tabular-nums" style={{ color: colors.textMuted }}>
              (
              <AnimatedCounter value={healthScore} />)
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

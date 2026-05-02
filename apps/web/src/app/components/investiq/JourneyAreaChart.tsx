"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { motion } from "framer-motion";
import { colors, radii } from "@investiq/ui/tokens";

type Point = { month: string; value: number };

interface JourneyAreaChartProps {
  data: Point[];
}

export function JourneyAreaChart({ data }: JourneyAreaChartProps) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.55, ease: "easeOut" }}>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="investiq-journey-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.accent} stopOpacity={0.35} />
              <stop offset="55%" stopColor={colors.green} stopOpacity={0.12} />
              <stop offset="100%" stopColor={colors.cardBg} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="investiq-journey-line" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={colors.accent} />
              <stop offset="100%" stopColor={colors.green} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 6" stroke={colors.border} vertical={false} />
          <XAxis dataKey="month" stroke={colors.textMuted} tick={{ fill: colors.textMuted, fontSize: 11 }} axisLine={{ stroke: colors.border }} tickLine={false} />
          <YAxis stroke={colors.textMuted} tick={{ fill: colors.textMuted, fontSize: 11 }} axisLine={{ stroke: colors.border }} tickLine={false} tickFormatter={(v) => `$${Math.round(Number(v) / 1000)}k`} width={42} />
          <Tooltip
            cursor={{ stroke: `${colors.accent}55`, strokeWidth: 1 }}
            contentStyle={{
              backgroundColor: colors.cardBg,
              border: `1px solid ${colors.border}`,
              borderRadius: radii.sm,
              boxShadow: "0 8px 28px rgba(26,36,56,0.12)",
              color: colors.text,
            }}
            formatter={(v) => [
              new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
                maximumFractionDigits: 0,
              }).format(Number(v ?? 0)),
              "Value",
            ]}
            labelStyle={{ color: colors.textMuted }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="url(#investiq-journey-line)"
            strokeWidth={2.5}
            fill="url(#investiq-journey-fill)"
            activeDot={{
              r: 5,
              fill: colors.cardBg,
              stroke: colors.accent,
              strokeWidth: 2,
            }}
            animationDuration={900}
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

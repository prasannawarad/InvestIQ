"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Pie, PieChart, Cell, ResponsiveContainer, Legend } from "recharts";
import { colors, radii, shadows, typography } from "@investiq/ui/tokens";

const beforeData = [
  { name: "Nifty 50", value: 12200, color: colors.accent },
  { name: "HDFC Bank", value: 4850, color: colors.green },
  { name: "ICICI Bluechip", value: 5250, color: colors.amber },
];

const afterData = [
  { name: "Nifty 50", value: 12200, color: colors.accent },
  { name: "HDFC Bank", value: 4850, color: colors.green },
  { name: "ICICI Bluechip", value: 5200, color: colors.amber },
  { name: "Bond Fund", value: 50, color: colors.coral },
];

const modes = ["Drift", "Scenario", "Panic"];

export default function RebalancePage() {
  const [mode, setMode] = useState("Drift");
  const [expanded, setExpanded] = useState<number | null>(null);

  const trades = [
    {
      title: "Trade 1: Sell $50 of ICICI Bluechip Fund",
      why: "Equity allocation drifted above target. This reduces drift while keeping long-term growth exposure.",
    },
    {
      title: "Trade 2: Buy $50 of HDFC Corporate Bond Fund",
      why: "Adds stability and restores your intended defensive cushion for short-term volatility.",
    },
  ];

  return (
    <main className="ml-60 px-8 py-12">
      <div className="mx-auto max-w-[1000px]">
        <header className="mb-8">
          <h1 className="mb-6 text-4xl" style={{ color: colors.text, fontFamily: typography.serif }}>
            Rebalance
          </h1>
          <div className="flex gap-3">
            {modes.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setMode(item)}
                className="px-6 py-2 text-sm"
                style={{
                  borderRadius: radii.pill,
                  backgroundColor: mode === item ? colors.accent : colors.cardBg,
                  color: mode === item ? colors.cardBg : colors.text,
                  boxShadow: mode === item ? "none" : shadows.card,
                }}
              >
                {item}
                {item === "Scenario" && mode === "Scenario" ? <ChevronDown className="ml-1 inline h-4 w-4" /> : null}
              </button>
            ))}
          </div>
        </header>

        <section className="mb-8 p-6" style={{ borderRadius: radii.xl, backgroundColor: colors.backgroundPanic }}>
          <div className="flex items-start gap-4">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center"
              style={{ borderRadius: radii.pill, backgroundColor: colors.accent, color: colors.cardBg }}
            >
              K
            </div>
            <p className="leading-relaxed" style={{ color: colors.text }}>
              Your portfolio drifted from 85/15 to 88/12 stocks to bonds. I recommend a small adjustment to get you back on track
              with minimal disruption.
            </p>
          </div>
        </section>

        <section className="p-8" style={{ borderRadius: radii.xl, boxShadow: shadows.card, backgroundColor: colors.cardBg }}>
          <h2 className="mb-8 text-2xl" style={{ color: colors.text, fontFamily: typography.serif }}>
            Recommended changes
          </h2>

          <div className="mb-12 grid grid-cols-2 gap-12">
            <div>
              <div className="mb-6 text-center">
                <div className="mb-2 text-sm" style={{ color: colors.textMuted }}>
                  Before
                </div>
                <div className="text-3xl" style={{ fontFamily: typography.serif }}>
                  $22,300
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={beforeData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value">
                    {beforeData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend formatter={(value) => <span style={{ color: colors.text }}>{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div>
              <div className="mb-6 text-center">
                <div className="mb-2 text-sm" style={{ color: colors.textMuted }}>
                  After
                </div>
                <div className="text-3xl" style={{ fontFamily: typography.serif }}>
                  $22,300
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={afterData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value">
                    {afterData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend formatter={(value) => <span style={{ color: colors.text }}>{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mb-8 space-y-4">
            {trades.map((trade, idx) => (
              <div key={trade.title} className="p-4" style={{ borderRadius: radii.lg, backgroundColor: colors.backgroundPanic }}>
                <button
                  type="button"
                  onClick={() => setExpanded(expanded === idx ? null : idx)}
                  className="flex w-full items-center justify-between text-left"
                >
                  <span style={{ color: colors.text }}>{trade.title}</span>
                  <ChevronDown
                    className={`h-5 w-5 transition-transform ${expanded === idx ? "rotate-180" : ""}`}
                    style={{ color: colors.accent }}
                  />
                </button>
                {expanded === idx ? (
                  <div className="mt-4 border-t pt-4 text-sm" style={{ borderColor: colors.border, color: colors.textMuted }}>
                    <div className="mb-2" style={{ color: colors.text }}>
                      Why this trade:
                    </div>
                    {trade.why}
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <div className="mb-8 border-t pt-6" style={{ borderColor: colors.border }}>
            <div className="mb-6 space-y-2 text-sm">
              <div className="flex justify-between">
                <span style={{ color: colors.textMuted }}>Tax cost</span>
                <span style={{ color: colors.text }}>$0</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: colors.textMuted }}>Trade fees</span>
                <span style={{ color: colors.text }}>$0</span>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span style={{ color: colors.textMuted }}>House deposit goal</span>
                <span style={{ color: colors.green }}>improves by 1 month</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: colors.textMuted }}>Retirement goal</span>
                <span style={{ color: colors.text }}>unchanged</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              className="flex-1 py-3 text-sm"
              style={{ borderRadius: radii.md, color: colors.cardBg, backgroundColor: colors.accent }}
            >
              Confirm changes
            </button>
            <button type="button" className="text-sm" style={{ color: colors.textMuted }}>
              Cancel
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

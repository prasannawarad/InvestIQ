"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Pie, PieChart, Cell, ResponsiveContainer, Legend } from "recharts";
import { colors, radii, shadows, typography } from "@investiq/ui/tokens";
import { useAuth } from "../components/auth/AuthProvider";
import { getDashboardData } from "../../lib/supabaseData";

type Mode = "Drift" | "Scenario" | "Panic";

type Slice = { name: string; value: number; color: string };

type RebalanceModel = {
  totalValue: number;
  currentEquity: number;
  currentDebt: number;
  targetEquity: number;
  targetDebt: number;
  beforeData: Slice[];
  afterData: Slice[];
  trades: { title: string; why: string }[];
  houseGoalName: string;
  retirementGoalName: string;
};

function toCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function RebalancePage() {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>("Drift");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [model, setModel] = useState<RebalanceModel | null>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      if (!user?.id) return;
      const data = await getDashboardData(user.id);
      if (!mounted) return;

      const summary = data.portfolio.summary as Record<string, number>;
      const allocation = data.portfolio.allocation as Record<string, Record<string, number> | number>;
      const byAsset = (allocation.by_asset_class ?? {}) as Record<string, number>;
      const target = (allocation.target_allocation ?? {}) as Record<string, number>;

      const topHoldings = [...data.holdings].sort((a, b) => b.current_value - a.current_value).slice(0, 3);

      const beforeData: Slice[] = topHoldings.map((holding, idx) => ({
        name: holding.name.replace(" Fund", ""),
        value: holding.current_value,
        color: [colors.accent, colors.green, colors.amber][idx] ?? colors.textMuted,
      }));

      const totalValue = Number(summary.total_value ?? 0);
      const currentEquity = Number(byAsset.equity ?? 0);
      const currentDebt = Number(byAsset.debt ?? 0);
      const targetEquity = Number(target.equity ?? 0);
      const targetDebt = Number(target.debt ?? 0);

      const driftPoints = Math.max(0, currentEquity - targetEquity);
      const rebalanceAmount = Math.round((totalValue * driftPoints) / 100);
      const sellAmount = Math.max(50, Math.min(rebalanceAmount, topHoldings[0]?.current_value ?? 50));
      const buyAmount = sellAmount;

      const first = topHoldings[0];
      const debtFund = data.holdings.find((h) => h.asset_class === "debt") ?? topHoldings[1] ?? topHoldings[0];

      const afterData: Slice[] = beforeData.map((slice) => {
        if (first && slice.name === first.name.replace(" Fund", "")) {
          return { ...slice, value: Math.max(0, slice.value - sellAmount) };
        }
        return slice;
      });

      const debtName = debtFund.name.replace(" Fund", "");
      const existingDebtIdx = afterData.findIndex((slice) => slice.name === debtName);
      if (existingDebtIdx >= 0) {
        afterData[existingDebtIdx] = { ...afterData[existingDebtIdx], value: afterData[existingDebtIdx].value + buyAmount };
      } else {
        afterData.push({ name: debtName, value: buyAmount, color: colors.coral });
      }

      const houseGoal = data.goals[0];
      const retirementGoal = data.goals[1] ?? data.goals[0];

      setModel({
        totalValue,
        currentEquity,
        currentDebt,
        targetEquity,
        targetDebt,
        beforeData,
        afterData,
        trades: [
          {
            title: `Trade 1: Sell ${toCurrency(sellAmount)} of ${first?.name ?? "equity holding"}`,
            why: `Your equity allocation is ${currentEquity}% while target is ${targetEquity}%. This trim reduces concentration without changing long-term plan.`,
          },
          {
            title: `Trade 2: Buy ${toCurrency(buyAmount)} of ${debtFund.name}`,
            why: `Raises your debt cushion toward ${targetDebt}% target so short-term volatility has less impact on your goals.`,
          },
        ],
        houseGoalName: houseGoal?.name ?? "House deposit goal",
        retirementGoalName: retirementGoal?.name ?? "Retirement goal",
      });
    }

    void init();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const narration = useMemo(() => {
    if (!model) return "Loading recommendation...";
    return `Your portfolio drifted from ${model.targetEquity}/${model.targetDebt} to ${model.currentEquity}/${model.currentDebt} stocks-to-debt. I recommend a small adjustment to return to target with minimal disruption.`;
  }, [model]);

  if (!model) {
    return (
      <main className="ml-60 px-8 py-12">
        <p style={{ color: colors.textMuted }}>Loading rebalance data...</p>
      </main>
    );
  }

  return (
    <main className="ml-60 px-8 py-12">
      <div className="mx-auto max-w-[1000px]">
        <header className="mb-8">
          <h1 className="mb-6 text-4xl" style={{ color: colors.text, fontFamily: typography.serif }}>
            Rebalance
          </h1>
          <div className="flex gap-3">
            {(["Drift", "Scenario", "Panic"] as const).map((item) => (
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
              {narration}
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
                  {toCurrency(model.totalValue)}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={model.beforeData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value">
                    {model.beforeData.map((entry) => (
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
                  {toCurrency(model.totalValue)}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={model.afterData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value">
                    {model.afterData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend formatter={(value) => <span style={{ color: colors.text }}>{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mb-8 space-y-4">
            {model.trades.map((trade, idx) => (
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
                <span style={{ color: colors.textMuted }}>{model.houseGoalName}</span>
                <span style={{ color: colors.green }}>improves by 1 month</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: colors.textMuted }}>{model.retirementGoalName}</span>
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

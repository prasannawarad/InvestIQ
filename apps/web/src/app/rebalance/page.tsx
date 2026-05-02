"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Pie, PieChart, Cell, ResponsiveContainer, Legend } from "recharts";
import { colors, radii, shadows, typography } from "@investiq/ui/tokens";
import type { RebalanceRecommendation } from "@investiq/data";
import type { RebalanceSource, ScenarioName, ScenarioResult } from "@investiq/engine";
import { useAuth } from "../components/auth/AuthProvider";
import { applyRebalanceCommit } from "../../lib/applyRebalanceCommit";
import { mapDashboardToPortfolio, mapDashboardToUserProfile } from "../../lib/engineAdapter";
import type { SupabaseDashboardData } from "../../lib/supabaseData";
import { getDashboardData } from "../../lib/supabaseData";

type Mode = "Drift" | "Scenario" | "Panic";

type Slice = { name: string; value: number; color: string };

type RebalanceModel = {
  totalBefore: number;
  totalAfter: number;
  currentEquity: number;
  currentDebt: number;
  targetEquity: number;
  targetDebt: number;
  beforeData: Slice[];
  afterData: Slice[];
  trades: RebalanceRecommendation["trades"];
  goalImpacts: RebalanceRecommendation["goal_impacts"];
  taxCost: number;
  fees: number;
  scenarioName?: ScenarioName;
  scenarioSummary?: string;
  scenarioProjectedTotal?: number;
  rationaleSummary: string;
};

function toCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function sourceFromMode(mode: Mode): RebalanceSource {
  if (mode === "Panic") return "panic";
  if (mode === "Scenario") return "scenario";
  return "drift";
}

function allocationPieData(
  allocation: Record<string, number>,
  totalValue: number
): Slice[] {
  const items: Array<{ key: string; label: string; color: string }> = [
    { key: "equity", label: "Equity", color: colors.accent },
    { key: "debt", label: "Debt", color: colors.green },
    { key: "gold", label: "Gold", color: colors.amber },
    { key: "cash", label: "Cash", color: colors.textMuted },
  ];

  return items.map((item) => ({
    name: item.label,
    value: (Number(allocation[item.key] ?? 0) / 100) * totalValue,
    color: item.color,
  }));
}

const scenarioOptions: Array<{ key: ScenarioName; label: string }> = [
  { key: "market-drop-20", label: "Market drop 20%" },
  { key: "market-drop-30", label: "Market drop 30%" },
  { key: "inflation-stays-high", label: "Inflation stays high" },
  { key: "withdraw-20-percent", label: "Withdraw 20%" },
  { key: "lose-job-need-emergency", label: "Job loss emergency" },
];

function scenarioLabel(name: ScenarioName): string {
  return scenarioOptions.find((option) => option.key === name)?.label ?? name;
}

function isScenarioName(value: string): value is ScenarioName {
  return scenarioOptions.some((option) => option.key === value);
}

/** Parses `name` query (e.g. `market-drop-20`) per PROJECT_SPEC deep links. */
function scenarioFromQuery(raw: string | null): ScenarioName | null {
  if (raw == null || raw.trim() === "") return null;
  try {
    const decoded = decodeURIComponent(raw.trim());
    return isScenarioName(decoded) ? decoded : null;
  } catch {
    return isScenarioName(raw.trim()) ? (raw.trim() as ScenarioName) : null;
  }
}

function resolveTargetAllocation(
  mode: Mode,
  scenario: ScenarioName,
  base: Record<string, number>
): Record<string, number> {
  if (mode === "Panic") {
    return { equity: 50, debt: 30, gold: 5, cash: 15 };
  }

  if (mode === "Scenario") {
    if (scenario === "market-drop-20") return { equity: 55, debt: 30, gold: 10, cash: 5 };
    if (scenario === "market-drop-30") return { equity: 45, debt: 32, gold: 13, cash: 10 };
    if (scenario === "inflation-stays-high") return { equity: 52, debt: 23, gold: 20, cash: 5 };
    if (scenario === "withdraw-20-percent") return { equity: 50, debt: 28, gold: 7, cash: 15 };
    return { equity: 40, debt: 30, gold: 5, cash: 25 };
  }

  return base;
}

function RebalancePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const dashboardRef = useRef<SupabaseDashboardData | null>(null);
  const recommendationRef = useRef<RebalanceRecommendation | null>(null);
  const targetAllocationRef = useRef<Record<string, number>>({
    equity: 0,
    debt: 0,
    gold: 0,
    cash: 0,
  });

  const [mode, setMode] = useState<Mode>("Drift");
  const [selectedScenario, setSelectedScenario] = useState<ScenarioName>("market-drop-20");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [model, setModel] = useState<RebalanceModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [committing, setCommitting] = useState(false);

  useEffect(() => {
    if (!searchParams.has("source") && !searchParams.has("name")) return;

    const sourceRaw = searchParams.get("source");
    const source = sourceRaw?.toLowerCase().trim() ?? "";
    const namedScenario = scenarioFromQuery(searchParams.get("name"));

    startTransition(() => {
      if (source === "panic") {
        setMode("Panic");
        setExpanded(null);
        return;
      }

      if (source === "scenario") {
        if (namedScenario) setSelectedScenario(namedScenario);
        setMode("Scenario");
        setExpanded(null);
        return;
      }

      if (namedScenario) {
        setSelectedScenario(namedScenario);
        setMode("Scenario");
        setExpanded(null);
      }
    });
  }, [searchParams]);

  useEffect(() => {
    let mounted = true;

    async function init() {
      if (!user?.id) return;

      try {
        const data = await getDashboardData(user.id);
        const portfolio = mapDashboardToPortfolio(data);
        const userProfile = mapDashboardToUserProfile(data);
        const source = sourceFromMode(mode);

        const baseTarget = portfolio.allocation.target_allocation as Record<string, number>;
        const targetAllocation = resolveTargetAllocation(mode, selectedScenario, baseTarget);

        const rebalanceResponse = await fetch("/api/engine/rebalance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            portfolio,
            source,
            target: targetAllocation,
          }),
        });

        if (!rebalanceResponse.ok) {
          throw new Error("Failed to get rebalance recommendation");
        }

        const rebalanceJson = (await rebalanceResponse.json()) as { recommendation: RebalanceRecommendation };
        const recommendation = rebalanceJson.recommendation;

        let scenario: ScenarioResult | null = null;
        if (mode === "Scenario") {
          const scenarioResponse = await fetch("/api/engine/scenario", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              portfolio,
              goals: userProfile.goals,
              scenario: selectedScenario,
            }),
          });
          if (!scenarioResponse.ok) {
            throw new Error("Failed to run scenario simulation");
          }
          const scenarioJson = (await scenarioResponse.json()) as { scenario: ScenarioResult };
          scenario = scenarioJson.scenario;
        }

        const beforeTotal = Number(portfolio.summary.total_value ?? 0);
        const netTradeDelta = recommendation.trades.reduce(
          (sum, trade) => sum + (trade.action === "buy" ? trade.amount_usd : -trade.amount_usd),
          0
        );
        const afterTotal = Math.max(0, beforeTotal + netTradeDelta - recommendation.tax_cost_usd - recommendation.fees_usd);

        const nextModel: RebalanceModel = {
          totalBefore: beforeTotal,
          totalAfter: afterTotal,
          currentEquity: Number(recommendation.before_allocation.equity ?? 0),
          currentDebt: Number(recommendation.before_allocation.debt ?? 0),
          targetEquity: Number(targetAllocation.equity ?? 0),
          targetDebt: Number(targetAllocation.debt ?? 0),
          beforeData: allocationPieData(recommendation.before_allocation, beforeTotal),
          afterData: allocationPieData(recommendation.after_allocation, afterTotal),
          trades: recommendation.trades,
          goalImpacts: recommendation.goal_impacts,
          taxCost: recommendation.tax_cost_usd,
          fees: recommendation.fees_usd,
          scenarioName: mode === "Scenario" ? selectedScenario : undefined,
          scenarioSummary: scenario?.human_summary,
          scenarioProjectedTotal: scenario?.projected_total_value,
          rationaleSummary: recommendation.rationale_summary,
        };

        if (mounted) {
          dashboardRef.current = data;
          recommendationRef.current = recommendation;
          targetAllocationRef.current = targetAllocation;
          setModel(nextModel);
          setError(null);
          setCommitError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load rebalance model");
          setModel(null);
        }
      }
    }

    void init();
    return () => {
      mounted = false;
    };
  }, [user?.id, mode, selectedScenario]);

  const narration = useMemo(() => {
    if (!model) return "Loading recommendation...";
    if (mode === "Scenario" && model.scenarioSummary) {
      return `${model.scenarioSummary} ${model.rationaleSummary}`;
    }
    if (mode === "Panic") {
      return `You are in panic mode. We keep moves smaller: from ${model.currentEquity}/${model.currentDebt} toward ${model.targetEquity}/${model.targetDebt}, prioritizing stability over aggressive shifts.`;
    }
    return `Your portfolio drifted from ${model.targetEquity}/${model.targetDebt} to ${model.currentEquity}/${model.currentDebt} stocks-to-debt. ${model.rationaleSummary}`;
  }, [mode, model]);

  const hasTrades = (model?.trades.length ?? 0) > 0;

  async function handleConfirmChanges() {
    if (
      !(model?.trades.length ?? 0) ||
      !dashboardRef.current ||
      !recommendationRef.current ||
      !user?.id
    ) {
      return;
    }
    setCommitting(true);
    setCommitError(null);
    try {
      await applyRebalanceCommit(
        dashboardRef.current,
        recommendationRef.current,
        mode === "Drift" ? null : targetAllocationRef.current
      );
      router.push("/home");
    } catch (err) {
      setCommitError(err instanceof Error ? err.message : "Failed to save portfolio");
    } finally {
      setCommitting(false);
    }
  }

  if (!model) {
    return (
      <main className="ml-60 px-8 py-12">
        <p style={{ color: error ? colors.coral : colors.textMuted }}>
          {error ?? "Loading rebalance data..."}
        </p>
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
                onClick={() => {
                  setExpanded(null);
                  setMode(item);
                }}
                className="px-6 py-2 text-sm"
                style={{
                  borderRadius: radii.pill,
                  backgroundColor: mode === item ? colors.accent : colors.cardBg,
                  color: mode === item ? colors.cardBg : colors.text,
                  boxShadow: mode === item ? "none" : shadows.card,
                }}
              >
                {item}
                {item === "Scenario" ? <ChevronDown className="ml-1 inline h-4 w-4" /> : null}
              </button>
            ))}
          </div>
          {mode === "Scenario" ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {scenarioOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => {
                    setExpanded(null);
                    setSelectedScenario(option.key);
                  }}
                  className="px-4 py-2 text-xs"
                  style={{
                    borderRadius: radii.pill,
                    backgroundColor: selectedScenario === option.key ? colors.accent : colors.cardBg,
                    color: selectedScenario === option.key ? colors.cardBg : colors.text,
                    boxShadow: selectedScenario === option.key ? "none" : shadows.card,
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}
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
          {mode === "Scenario" && model.scenarioProjectedTotal != null && model.scenarioName ? (
            <div className="mt-4 text-sm" style={{ color: colors.textMuted }}>
              {`${scenarioLabel(model.scenarioName)} (no action): ${toCurrency(model.scenarioProjectedTotal)}. Recommendation below shows the rebalance plan after that stress.`}
            </div>
          ) : null}
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
                  {toCurrency(model.totalBefore)}
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
                  {toCurrency(model.totalAfter)}
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
            {hasTrades ? model.trades.map((trade, idx) => (
              <div key={`${trade.action}-${trade.symbol}-${idx}`} className="p-4" style={{ borderRadius: radii.lg, backgroundColor: colors.backgroundPanic }}>
                <button
                  type="button"
                  onClick={() => setExpanded(expanded === idx ? null : idx)}
                  className="flex w-full items-center justify-between text-left"
                >
                  <span style={{ color: colors.text }}>
                    {`Trade ${idx + 1}: ${trade.action === "buy" ? "Buy" : "Sell"} ${toCurrency(trade.amount_usd)} of ${trade.name}`}
                  </span>
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
                    {trade.reason}
                  </div>
                ) : null}
              </div>
            )) : (
              <div className="p-4 text-sm" style={{ borderRadius: radii.lg, backgroundColor: colors.backgroundPanic, color: colors.textMuted }}>
                No trade needed right now. Your allocation is close enough to target.
              </div>
            )}
          </div>

          <div className="mb-8 border-t pt-6" style={{ borderColor: colors.border }}>
            <div className="mb-6 space-y-2 text-sm">
              <div className="flex justify-between">
                <span style={{ color: colors.textMuted }}>Tax cost</span>
                <span style={{ color: colors.text }}>{toCurrency(model.taxCost)}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: colors.textMuted }}>Trade fees</span>
                <span style={{ color: colors.text }}>{toCurrency(model.fees)}</span>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              {model.goalImpacts.map((impact) => (
                <div className="flex justify-between" key={impact.goal_id}>
                  <span style={{ color: colors.textMuted }}>{impact.goal_name}</span>
                  <span
                    style={{
                      color:
                        impact.delta_months < 0
                          ? colors.green
                          : impact.delta_months > 0
                            ? colors.amber
                            : colors.text,
                    }}
                  >
                    {impact.delta_months === 0
                      ? "unchanged"
                      : impact.delta_months < 0
                        ? `improves by ${Math.abs(impact.delta_months)} month`
                        : `delays by ${impact.delta_months} month`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {commitError ? (
            <p className="mb-4 text-sm" style={{ color: colors.coral }}>
              {commitError}
            </p>
          ) : null}
          <div className="flex items-center gap-4">
            <button
              type="button"
              disabled={!hasTrades || committing}
              onClick={() => void handleConfirmChanges()}
              className="flex-1 py-3 text-sm disabled:opacity-50"
              style={{ borderRadius: radii.md, color: colors.cardBg, backgroundColor: colors.accent }}
            >
              {committing ? "Saving..." : "Confirm changes"}
            </button>
            <button
              type="button"
              className="text-sm"
              style={{ color: colors.textMuted }}
              onClick={() => router.back()}
            >
              Cancel
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function RebalancePage() {
  return (
    <Suspense
      fallback={
        <main className="ml-60 px-8 py-12">
          <p style={{ color: colors.textMuted }}>Loading rebalance…</p>
        </main>
      }
    >
      <RebalancePageContent />
    </Suspense>
  );
}

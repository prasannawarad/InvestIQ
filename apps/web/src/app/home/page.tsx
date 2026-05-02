"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle, Sun } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { colors, radii, shadows, typography } from "@investiq/ui/tokens";
import { HoldingCard } from "../components/HoldingCard";
import { StatCard } from "../components/StatCard";
import { useAuth } from "../components/auth/AuthProvider";
import { getDashboardData, type HoldingRow } from "../../lib/supabaseData";

const askKuberQuestions = [
  "Am I at risk?",
  "What should I know today?",
  "Why did my portfolio drop?",
  "Should I worry about the news?",
];

const periods = ["1M", "3M", "YTD", "1Y", "All"];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function summarizeHoldingType(subcategory: string): string {
  const map: Record<string, string> = {
    large_cap: "Big established company",
    index_fund: "Broad market fund",
    large_cap_active: "Large cap mutual fund",
    bond_etf: "Bond ETF",
    gold_etf: "Gold ETF",
    money_market: "Cash equivalent",
  };
  return map[subcategory] ?? "Diversified holding";
}

function buildJourneyData(totalValue: number) {
  const points = [0.81, 0.83, 0.85, 0.87, 0.86, 0.84, 0.9, 0.94, 0.97, 0.985, 1, 0.992];
  const months = ["Jun 25", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan 26", "Feb", "Mar", "Apr", "May"];
  return months.map((month, index) => ({ month, value: Math.round(totalValue * points[index]) }));
}

type HomeModel = {
  profileName: string;
  totalValue: string;
  dayChangeValue: string;
  dayChangePercent: string;
  dayChangeType: "positive" | "negative" | "neutral";
  healthScore: number;
  healthVerdict: string;
  chartData: { month: string; value: number }[];
  holdings: {
    id: string;
    name: string;
    type: string;
    value: string;
    fitScore: number;
    logo: string;
    percentage: string;
  }[];
  marketCards: {
    headline: string;
    summary: string;
    connector: string;
    borderColor: string;
  }[];
};

function fitFromHolding(holding: HoldingRow): number {
  if (holding.symbol === "ICICIPRUBLU") return 78;
  if (holding.asset_class === "debt") return 83;
  if (holding.asset_class === "gold") return 76;
  if (holding.asset_class === "cash") return 82;
  return 85;
}

export default function HomePage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState("1Y");
  const [model, setModel] = useState<HomeModel | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      if (!user?.id) return;

      try {
        const data = await getDashboardData(user.id);
        const summary = data.portfolio.summary as Record<string, number>;
        const dayChangePercent = Number(summary.day_change_percent ?? 0);

        const dayChangeType: "positive" | "negative" | "neutral" =
          dayChangePercent > 0 ? "positive" : dayChangePercent <= -2 ? "negative" : "neutral";

        const healthScore = Number(summary.health_score ?? 0);
        const healthVerdict = healthScore >= 80 ? "Strong" : healthScore >= 70 ? "Good" : "Needs attention";

        const topHoldings = data.holdings.slice(0, 3).map((holding) => ({
          id: holding.symbol,
          name: holding.name,
          type: summarizeHoldingType(holding.subcategory),
          value: formatCurrency(Number(holding.current_value ?? 0)),
          fitScore: fitFromHolding(holding),
          logo: holding.name
            .split(" ")
            .slice(0, 2)
            .map((part) => part[0])
            .join("")
            .toUpperCase(),
          percentage: `${Math.round(Number(holding.weight_in_portfolio ?? 0))}%`,
        }));

        const cards = data.marketEvents.slice(0, 2).map((event, index) => ({
          headline: event.headline,
          summary: event.plain_summary,
          connector:
            index === 0
              ? "This directly relates to your diversified equity + debt mix today."
              : "This is a watch item; your current allocation already cushions shocks.",
          borderColor: index === 0 ? colors.accent : colors.amber,
        }));

        while (cards.length < 2) {
          cards.push({
            headline: "Markets remain range-bound",
            summary: "No major structural change today; normal short-term volatility is expected.",
            connector: "Your current portfolio mix remains aligned to your goals.",
            borderColor: cards.length === 0 ? colors.accent : colors.amber,
          });
        }

        const nextModel: HomeModel = {
          profileName: data.profile.name,
          totalValue: formatCurrency(Number(summary.total_value ?? 0)),
          dayChangeValue: formatCurrency(Math.abs(Number(summary.day_change_value ?? 0))),
          dayChangePercent: `${Math.abs(dayChangePercent).toFixed(2)}%`,
          dayChangeType,
          healthScore,
          healthVerdict,
          chartData: buildJourneyData(Number(summary.total_value ?? 0)),
          holdings: topHoldings,
          marketCards: cards,
        };

        if (mounted) {
          setModel(nextModel);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load home data");
        }
      }
    }

    void init();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const dayChangeLabel = useMemo(() => {
    if (!model) return "-";
    const sign = model.dayChangeType === "positive" ? "+" : "-";
    return `${sign}${model.dayChangeValue}`;
  }, [model]);

  if (error) {
    return (
      <main className="ml-60 px-8 py-12">
        <div className="text-sm" style={{ color: colors.coral }}>
          {error}
        </div>
      </main>
    );
  }

  if (!model) {
    return (
      <main className="ml-60 px-8 py-12">
        <div className="text-sm" style={{ color: colors.textMuted }}>
          Loading your portfolio...
        </div>
      </main>
    );
  }

  return (
    <main className="ml-60 px-8 py-12">
      <div className="max-w-[1200px]">
        <section className="mb-12">
          <div className="mb-8 flex items-center gap-3">
            <Sun className="h-8 w-8" style={{ color: colors.amber }} />
            <h1 className="text-4xl" style={{ fontFamily: typography.serif }}>
              Your portfolio is healthy.
            </h1>
          </div>
          <div className="mb-6 grid grid-cols-3 gap-6">
            <StatCard label="Total Value" value={model.totalValue} />
            <StatCard
              label="Today's Change"
              value={dayChangeLabel}
              change={model.dayChangePercent}
              changeType={model.dayChangeType}
            />
            <StatCard
              label="Health Score"
              value={`${model.healthVerdict} (${model.healthScore})`}
              icon={<CheckCircle className="h-6 w-6" style={{ color: colors.green }} />}
            />
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/panic"
              className="inline-flex rounded-2xl px-6 py-3 text-sm transition-opacity hover:opacity-95"
              style={{ backgroundColor: colors.coral, color: colors.cardBg }}
            >
              I&apos;m freaking out
            </Link>
            <Link
              href="/rebalance"
              className="inline-flex rounded-2xl border px-6 py-3 text-sm"
              style={{ borderColor: colors.accent, color: colors.accent }}
            >
              Run a scenario
            </Link>
          </div>
        </section>

        <section
          className="mb-8 p-8"
          style={{ borderRadius: radii.xl, boxShadow: shadows.card, backgroundColor: colors.cardBg }}
        >
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl">Journey</h2>
            <div className="flex gap-2">
              {periods.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPeriod(item)}
                  className="rounded-full px-4 py-2 text-sm"
                  style={{
                    backgroundColor: period === item ? colors.accent : colors.backgroundPanic,
                    color: period === item ? colors.cardBg : colors.text,
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={model.chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
              <XAxis dataKey="month" stroke={colors.textMuted} style={{ fontSize: "12px" }} />
              <YAxis stroke={colors.textMuted} style={{ fontSize: "12px" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: colors.cardBg,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radii.sm,
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={colors.accent}
                strokeWidth={2}
                dot={{ fill: colors.accent, r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </section>

        <section
          className="mb-8 p-8"
          style={{ borderRadius: radii.xl, boxShadow: shadows.card, backgroundColor: colors.cardBg }}
        >
          <h2 className="mb-4 text-xl">Ask Kuber</h2>
          <div className="grid grid-cols-2 gap-3">
            {askKuberQuestions.map((question) => (
              <button
                key={question}
                type="button"
                className="rounded-full px-4 py-3 text-center text-sm"
                style={{ backgroundColor: colors.backgroundPanic, color: colors.text }}
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent("investiq:open-kuber", {
                      detail: { prompt: question },
                    })
                  )
                }
              >
                {question}
              </button>
            ))}
          </div>
        </section>

        <section
          className="mb-8 p-8"
          style={{ borderRadius: radii.xl, boxShadow: shadows.card, backgroundColor: colors.cardBg }}
        >
          <h2 className="mb-4 text-xl">What you should know today</h2>
          <div className="space-y-4">
            {model.marketCards.map((card) => (
              <article key={card.headline} className="pl-4" style={{ borderLeft: `4px solid ${card.borderColor}` }}>
                <div className="mb-2" style={{ color: colors.text }}>
                  {card.headline}
                </div>
                <div className="mb-2 text-sm" style={{ color: colors.textMuted }}>
                  {card.summary}
                </div>
                <div className="text-sm" style={{ color: colors.accent }}>
                  → {card.connector}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section
          className="p-8"
          style={{ borderRadius: radii.xl, boxShadow: shadows.card, backgroundColor: colors.cardBg }}
        >
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl">Your holdings</h2>
            <Link href="/current" className="flex items-center gap-1 text-sm hover:underline" style={{ color: colors.accent }}>
              See all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {model.holdings.map((holding) => (
              <HoldingCard key={holding.id} {...holding} />
            ))}
          </div>

          <div className="mt-6">
            <Link href="/Kuber" className="text-sm hover:underline" style={{ color: colors.accent }}>
              Looking to invest more?
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

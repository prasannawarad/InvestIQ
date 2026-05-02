"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { colors, typography } from "@investiq/ui/tokens";
import { investiqButtonStyle, investiqCardStyle, investiqFilterChipStyle, investiqOutlineCtaStyle } from "../../lib/investiqUi";
import { HoldingCard } from "../components/HoldingCard";
import { JourneyAreaChart } from "../components/investiq/JourneyAreaChart";
import { KuberOrb } from "../components/investiq/KuberOrb";
import { PortfolioStatDeck } from "../components/investiq/PortfolioStatDeck";
import { useAuth } from "../components/auth/AuthProvider";
import { supabase } from "../../lib/supabase";
import { getDashboardData, type HoldingRow } from "../../lib/supabaseData";
import { mapDashboardToPortfolio, mapDashboardToUserProfile } from "../../lib/engineAdapter";
import { computePortfolioHealth } from "@investiq/engine";

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

function getTimeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getDynamicMessage(
  dayChangeType: "positive" | "negative" | "neutral",
  healthVerdict: string,
): string {
  if (dayChangeType === "positive" && healthVerdict === "Strong")
    return "You're up today and your allocation is well-balanced. Keep holding steady.";
  if (dayChangeType === "positive") return "Small gains today. Your portfolio is on track.";
  if (dayChangeType === "negative" && healthVerdict !== "Needs attention")
    return "Markets pulled back slightly. No cause for concern — your fundamentals are solid.";
  if (dayChangeType === "negative")
    return "Worth reviewing your allocation. Kuber sees an opportunity to rebalance.";
  if (healthVerdict === "Strong")
    return "No major moves today. Your foundations are solid — Kuber is watching.";
  return "Quiet day. Kuber's keeping an eye on your goals.";
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

function buildJourneyDataForPeriod(totalValue: number, period: string): { month: string; value: number }[] {
  switch (period) {
    case "1M": {
      const ratios = [0.974, 0.981, 0.986, 0.992, 0.996, 1.0];
      const labels = ["Apr 7", "Apr 11", "Apr 15", "Apr 21", "Apr 28", "May 2"];
      return labels.map((month, i) => ({ month, value: Math.round(totalValue * ratios[i]) }));
    }
    case "3M": {
      const ratios = [0.952, 0.961, 0.969, 0.974, 0.979, 0.983, 0.986, 0.990, 0.993, 0.996, 0.998, 1.0];
      const labels = ["Feb 3", "Feb 10", "Feb 17", "Feb 24", "Mar 3", "Mar 10", "Mar 17", "Mar 24", "Apr 7", "Apr 14", "Apr 21", "May 2"];
      return labels.map((month, i) => ({ month, value: Math.round(totalValue * ratios[i]) }));
    }
    case "YTD": {
      const ratios = [0.931, 0.958, 0.972, 0.986, 1.0];
      const labels = ["Jan", "Feb", "Mar", "Apr", "May"];
      return labels.map((month, i) => ({ month, value: Math.round(totalValue * ratios[i]) }));
    }
    case "All": {
      const ratios = [0.58, 0.61, 0.64, 0.68, 0.73, 0.76, 0.79, 0.81, 0.83, 0.87, 0.84, 0.9, 0.94, 0.97, 0.985, 1.0, 0.992];
      const labels = ["Jan 24", "Mar", "May", "Jul", "Sep", "Nov", "Jan 25", "Mar", "May", "Jul", "Sep", "Nov", "Jan 26", "Feb", "Mar", "Apr", "May"];
      return labels.map((month, i) => ({ month, value: Math.round(totalValue * ratios[i]) }));
    }
    default: {
      // 1Y
      const ratios = [0.81, 0.83, 0.85, 0.87, 0.86, 0.84, 0.9, 0.94, 0.97, 0.985, 1.0, 0.992];
      const labels = ["Jun 25", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan 26", "Feb", "Mar", "Apr", "May"];
      return labels.map((month, i) => ({ month, value: Math.round(totalValue * ratios[i]) }));
    }
  }
}

function periodGainLabel(totalValue: number, period: string): { amount: string; percent: string; positive: boolean } {
  const firstRatios: Record<string, number> = { "1M": 0.974, "3M": 0.952, YTD: 0.931, "1Y": 0.81, All: 0.58 };
  const firstRatio = firstRatios[period] ?? 0.81;
  const startValue = Math.round(totalValue * firstRatio);
  const gain = totalValue - startValue;
  const pct = ((gain / startValue) * 100).toFixed(2);
  const abs = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Math.abs(gain));
  return { amount: `${gain >= 0 ? "+" : "-"}${abs}`, percent: `${gain >= 0 ? "+" : ""}${pct}%`, positive: gain >= 0 };
}

type HomeModel = {
  profileName: string;
  totalValueUsd: number;
  dayChangeAbsUsd: number;
  dayChangePercent: number;
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
        const data = await getDashboardData(supabase, user.id);
        const summary = data.portfolio.summary as Record<string, number>;
        const dayChangePercent = Number(summary.day_change_percent ?? 0);

        const dayChangeType: "positive" | "negative" | "neutral" =
          dayChangePercent > 0 ? "positive" : dayChangePercent <= -2 ? "negative" : "neutral";

        const enginePortfolio = mapDashboardToPortfolio(data);
        const engineProfile = mapDashboardToUserProfile(data);
        const health = computePortfolioHealth(enginePortfolio, engineProfile);
        const healthScore = health.score;
        const healthVerdict = health.verdict;

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
          totalValueUsd: Number(summary.total_value ?? 0),
          dayChangeAbsUsd: Math.abs(Number(summary.day_change_value ?? 0)),
          dayChangePercent: dayChangePercent,
          dayChangeType,
          healthScore,
          healthVerdict,
          chartData: buildJourneyDataForPeriod(Number(summary.total_value ?? 0), "1Y"),
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

  useEffect(() => {
    if (!model || !user?.id) return;
    try {
      const key = "investiq-home-celebrate";
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
      toast.success("You're in", {
        description: `Kuber synced your portfolio — welcome back, ${model.profileName.split(/\s+/)[0] ?? "there"}.`,
      });
    } catch {
      /* sessionStorage unavailable */
    }
  }, [model, user?.id]);

  if (error) {
    return (
      <main className="px-4 py-10 md:ml-60 md:px-8 md:py-12">
        <div className="text-sm" style={{ color: colors.coral }}>
          {error}
        </div>
      </main>
    );
  }

  if (!model) {
    return (
      <main className="px-4 py-10 md:ml-60 md:px-8 md:py-12">
        <div className="text-sm" style={{ color: colors.textMuted }}>
          Loading your portfolio...
        </div>
      </main>
    );
  }

  const firstName = model.profileName.split(/\s+/)[0] ?? "there";
  const greeting = getTimeGreeting();
  const dynamicMessage = getDynamicMessage(model.dayChangeType, model.healthVerdict);

  return (
    <main className="px-4 py-10 sm:px-6 md:ml-60 md:px-8 md:py-12">
      <div className="max-w-[1200px]">
        <section className="mb-12">
          <div className="relative mb-8 flex items-start justify-between gap-6">
            <div
              className="pointer-events-none absolute -left-4 -top-6 h-52 w-52 rounded-full opacity-[0.06] blur-3xl"
              style={{ background: colors.accent }}
            />
            <motion.div
              className="relative"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="mb-3 flex items-center gap-2">
                <motion.span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: colors.accent }}
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 2.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                />
                <span className="text-xs uppercase tracking-[0.14em]" style={{ color: colors.textMuted }}>
                  Kuber is live
                </span>
              </div>
              <h1
                className="text-[2.5rem] leading-[1.1] sm:text-[3rem]"
                style={{ fontFamily: typography.serif, color: colors.text }}
              >
                {greeting}, {firstName}.
              </h1>
              <p className="mt-2 max-w-[440px] text-sm leading-relaxed" style={{ color: colors.textMuted }}>
                {dynamicMessage}
              </p>
            </motion.div>
            <KuberOrb size="sm" className="hidden shrink-0 sm:block" />
          </div>
          <PortfolioStatDeck
            totalValueUsd={model.totalValueUsd}
            dayChangeAbsUsd={model.dayChangeAbsUsd}
            dayChangePercent={model.dayChangePercent}
            dayChangeType={model.dayChangeType}
            healthScore={model.healthScore}
            healthVerdict={model.healthVerdict}
          />

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/panic"
              className="transition-opacity hover:opacity-95"
              style={{ ...investiqButtonStyle("coral"), textDecoration: "none" }}
            >
              I&apos;m freaking out
            </Link>
            <Link href="/rebalance" className="hover:opacity-95" style={{ ...investiqOutlineCtaStyle(), textDecoration: "none" }}>
              Run a scenario
            </Link>
          </div>
        </section>

        <section className="mb-8 p-8" style={investiqCardStyle()}>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-2xl font-semibold" style={{ color: colors.text, fontFamily: typography.serif }}>
                {formatCurrency(model.totalValueUsd)}
              </div>
              {(() => {
                const gain = periodGainLabel(model.totalValueUsd, period);
                return (
                  <div className="mt-0.5 text-sm" style={{ color: gain.positive ? colors.green : colors.coral }}>
                    {gain.amount} ({gain.percent})
                  </div>
                );
              })()}
            </div>
            <div className="flex flex-wrap gap-2">
              {periods.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPeriod(item)}
                  style={investiqFilterChipStyle(period === item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <JourneyAreaChart data={buildJourneyDataForPeriod(model.totalValueUsd, period)} />
        </section>

        <section className="mb-8 p-8" style={investiqCardStyle()}>
          <h2 className="mb-4 text-xl">Ask Kuber</h2>
          <div className="grid grid-cols-2 gap-3">
            {askKuberQuestions.map((question) => (
              <button
                key={question}
                type="button"
                className="w-full text-center"
                style={{ ...investiqFilterChipStyle(false), padding: "12px 16px", color: colors.text }}
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

        <section className="mb-8 p-8" style={investiqCardStyle()}>
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

        <section className="p-8" style={investiqCardStyle()}>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl">Your holdings</h2>
            <Link href="/current" className="flex items-center gap-1 text-sm hover:underline" style={{ color: colors.accent }}>
              See all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
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

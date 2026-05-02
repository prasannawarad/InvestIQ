"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Info, Volume2 } from "lucide-react";
import { colors, typography } from "@investiq/ui/tokens";
import { investiqButtonStyle, investiqCardStyle } from "../../../lib/investiqUi";
import { computeFitScore } from "@investiq/engine";
import { useAuth } from "../../components/auth/AuthProvider";
import { supabase } from "../../../lib/supabase";
import { getDashboardData } from "../../../lib/supabaseData";
import { mapDashboardToPortfolio, mapDashboardToUserProfile } from "../../../lib/engineAdapter";
import { useKuberVoice } from "../../../lib/useKuberVoice";

type StatKey = "P/E ratio" | "Market cap" | "Dividend yield" | "Beta";

const statDefinitions: Record<StatKey, string> = {
  "P/E ratio": "How expensive this holding is relative to its earnings.",
  "Market cap": "The total value of the company in the market.",
  "Dividend yield": "How much cash payout this holding gives each year.",
  Beta: "How much it tends to move compared to the overall market.",
};

function toCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function HoldingDetailPage() {
  const { user } = useAuth();
  const params = useParams<{ symbol: string }>();
  const symbol = String(params.symbol ?? "");
  const [activeInfo, setActiveInfo] = useState<StatKey | null>(null);
  const [llmExplain, setLlmExplain] = useState<{ term: StatKey; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { isSpeaking, speak: speakKuberText, stop: stopKuberVoice } = useKuberVoice();
  const [model, setModel] = useState<{
    symbol: string;
    name: string;
    sizeLabel: string;
    boughtAgo: string;
    fitScore: number;
    value: number;
    weight: number;
    avgBuyPrice: number;
    currentPrice: number;
  } | null>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      if (!user?.id) return;

      try {
        const data = await getDashboardData(supabase, user.id);
        const found = data.holdings.find((item) => item.symbol.toLowerCase() === symbol.toLowerCase());
        if (!found || !mounted) return;
        const portfolio = mapDashboardToPortfolio(data);
        const userProfile = mapDashboardToUserProfile(data);
        const matchingHolding = portfolio.holdings.find((holding) => holding.symbol === found.symbol);

        const metadata = (found.metadata ?? {}) as Record<string, unknown>;
        const purchaseDate = typeof metadata.purchase_date === "string" ? metadata.purchase_date : null;
        const boughtAgo = purchaseDate ? `${Math.max(1, Math.round((Date.now() - new Date(purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 30)))} months ago` : "recently";

        setModel({
          symbol: found.symbol,
          name: found.name,
          sizeLabel:
            found.subcategory === "large_cap" || found.subcategory === "large_cap_active"
              ? "Big established"
              : found.subcategory === "index_fund"
                ? "Broad market fund"
                : "Diversified holding",
          boughtAgo,
          fitScore: matchingHolding ? computeFitScore(matchingHolding, userProfile) : 70,
          value: found.current_value,
          weight: found.weight_in_portfolio,
          avgBuyPrice: found.avg_buy_price,
          currentPrice: found.current_price,
        });
        setError(null);
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load holding detail");
        }
      }
    }

    void init();
    return () => {
      mounted = false;
    };
  }, [user?.id, symbol]);

  const pnlPercent = useMemo(() => {
    if (!model) return 0;
    if (model.avgBuyPrice <= 0) return 0;
    return ((model.currentPrice - model.avgBuyPrice) / model.avgBuyPrice) * 100;
  }, [model]);

  useEffect(() => {
    const termStat = activeInfo;
    const hold = model;
    if (!termStat || !hold) {
      return;
    }

    const termKey: StatKey = termStat;
    const { name: holdingName, symbol: holdingSymbol } = hold;
    let cancelled = false;

    async function jargonFetch() {
      try {
        const response = await fetch("/api/kuber/jargon", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            term: `${termKey} for ${holdingName} (${holdingSymbol})`,
          }),
        });
        const payload = (await response.json()) as { message?: string };
        const text =
          typeof payload.message === "string" && payload.message.trim()
            ? payload.message.trim()
            : null;
        if (!cancelled && text) {
          setLlmExplain({ term: termKey, text });
        }
      } catch {
        if (!cancelled) setLlmExplain(null);
      }
    }

    void jargonFetch();
    return () => {
      cancelled = true;
    };
  }, [activeInfo, model]);

  if (error) {
    return (
      <main className="ml-60 px-8 py-12">
        <p style={{ color: colors.coral }}>{error}</p>
      </main>
    );
  }

  if (!model) {
    return (
      <main className="ml-60 px-8 py-12">
        <p style={{ color: colors.textMuted }}>Loading holding details...</p>
      </main>
    );
  }

  const statRows: { label: StatKey; value: string }[] = [
    { label: "P/E ratio", value: "24.7" },
    { label: "Market cap", value: "$98B" },
    { label: "Dividend yield", value: "1.8%" },
    { label: "Beta", value: "0.93" },
  ];

  return (
    <main className="ml-60 px-8 py-12">
      <div className="mx-auto max-w-[1100px]">
        <Link href="/current" className="text-sm" style={{ color: colors.textMuted }}>
          ← Back to Current
        </Link>

        <header className="mt-6 mb-8 flex items-start justify-between gap-6">
          <div>
            <h1 className="text-4xl" style={{ color: colors.text, fontFamily: typography.serif }}>
              {model.name}
            </h1>
            <p className="mt-2 text-sm" style={{ color: colors.textMuted }}>
              {model.sizeLabel} · Bought {model.boughtAgo}
            </p>
          </div>

          <div className="min-w-[240px] p-5" style={investiqCardStyle()}>
            <div className="text-sm" style={{ color: colors.textMuted }}>
              Fit score
            </div>
            <div className="mt-1 text-3xl" style={{ color: model.fitScore >= 80 ? colors.green : colors.amber, fontFamily: typography.serif }}>
              {model.fitScore}%
            </div>
            <div className="mt-3 text-xs" style={{ color: colors.textMuted }}>
              Why this fits you: diversified exposure, moderate volatility, supports long-term goals.
            </div>
          </div>
        </header>

        <section className="mb-8 p-6" style={investiqCardStyle()}>
          <h2 className="mb-4 text-xl" style={{ color: colors.text }}>
            How this fits your portfolio
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div style={{ color: colors.textMuted }}>Position size</div>
              <div style={{ color: colors.text }}>{model.weight.toFixed(1)}% of your portfolio</div>
            </div>
            <div>
              <div style={{ color: colors.textMuted }}>Current value</div>
              <div style={{ color: colors.text }}>{toCurrency(model.value)}</div>
            </div>
            <div>
              <div style={{ color: colors.textMuted }}>Cost basis</div>
              <div style={{ color: colors.text }}>
                Bought at {toCurrency(model.avgBuyPrice)} avg, up {pnlPercent.toFixed(1)}%
              </div>
            </div>
            <div>
              <div style={{ color: colors.textMuted }}>Tax context</div>
              <div style={{ color: colors.text }}>Selling now would create about $85 in long-term gains</div>
            </div>
            <div className="col-span-2">
              <div style={{ color: colors.textMuted }}>Goal connection</div>
              <div style={{ color: colors.text }}>
                30% of this position is earmarked for retirement; a full exit could set the timeline back around 2 months.
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8 grid grid-cols-2 gap-4">
          <article className="p-5" style={investiqCardStyle()}>
            <h3 className="mb-2" style={{ color: colors.text }}>Bulls say</h3>
            <p className="text-sm" style={{ color: colors.textMuted }}>
              Strong operating history, resilient cash flows, and long-term compounding potential if you stay allocated.
            </p>
          </article>
          <article className="p-5" style={investiqCardStyle()}>
            <h3 className="mb-2" style={{ color: colors.text }}>Bears say</h3>
            <p className="text-sm" style={{ color: colors.textMuted }}>
              Valuation can compress during risk-off periods, and near-term returns may lag if rates remain elevated.
            </p>
          </article>
        </section>

        <section className="mb-8 p-6" style={investiqCardStyle()}>
          <h2 className="mb-4 text-xl" style={{ color: colors.text }}>
            Key stats in plain language
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {statRows.map((row) => (
              <div key={row.label} className="rounded-lg border p-4" style={{ borderColor: colors.border }}>
                <div className="mb-1 flex items-center justify-between text-sm" style={{ color: colors.textMuted }}>
                  <span>{row.label}</span>
                  <button
                    type="button"
                    onClick={() => setActiveInfo(activeInfo === row.label ? null : row.label)}
                    style={{ color: colors.accent }}
                  >
                    <Info className="h-4 w-4" />
                  </button>
                </div>
                <div style={{ color: colors.text }}>{row.value}</div>
                {activeInfo === row.label ? (
                  <div className="mt-2 text-xs" style={{ color: colors.textMuted }}>
                    {(llmExplain?.term === row.label ? llmExplain.text : null) ??
                      statDefinitions[row.label]}
                    {" "}
                    {llmExplain?.term === row.label ? (
                      <button
                        type="button"
                        className="mr-2 inline-flex items-center gap-1"
                        style={{ color: colors.accent }}
                        onClick={() => {
                          if (isSpeaking) {
                            stopKuberVoice();
                            return;
                          }
                          void speakKuberText(llmExplain.text);
                        }}
                      >
                        <Volume2 className="h-3.5 w-3.5" />
                        {isSpeaking ? "Stop voice" : "Speak explanation"}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      style={{ color: colors.accent }}
                      onClick={() => {
                        window.dispatchEvent(
                          new CustomEvent("investiq:open-kuber", { detail: { prompt: `Explain ${row.label} for ${model.name}` } })
                        );
                      }}
                    >
                      Ask Kuber more
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <button
          type="button"
          style={investiqButtonStyle("primary")}
          onClick={() => {
            window.dispatchEvent(new CustomEvent("investiq:open-kuber", { detail: { prompt: `Tell me about ${model.name}` } }));
          }}
        >
          Ask Kuber about {model.symbol}
        </button>
      </div>
    </main>
  );
}

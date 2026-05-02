"use client";

import type { Holding, UserProfile } from "@investiq/data";
import type { UniverseCandidate } from "@investiq/engine";
import { computeFitScore, getUniverseCandidateBySymbol } from "@investiq/engine";
import { Info, Volume2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { colors, typography } from "@investiq/ui/tokens";
import { mapDashboardToUserProfile } from "../../../../lib/engineAdapter";
import { supabase } from "../../../../lib/supabase";
import { getDashboardData } from "../../../../lib/supabaseData";
import { investiqButtonStyle, investiqCardStyle } from "../../../../lib/investiqUi";
import { useKuberVoice } from "../../../../lib/useKuberVoice";
import { useAuth } from "../../../components/auth/AuthProvider";

type StatKey = "P/E ratio" | "Market cap" | "Dividend yield" | "Beta";

const statDefinitions: Record<StatKey, string> = {
  "P/E ratio": "How expensive this pick is versus mock earnings — illustrative only for demo discovery names.",
  "Market cap": "Illustrative size band for this discovery candidate in the hackathon universe.",
  "Dividend yield": "What cash payout might look like for income-oriented sleeves — demo placeholder.",
  Beta: "How jumpy we model this sleeve versus broader markets — not live market beta.",
};

function hashSeed(symbol: string): number {
  const s = symbol.toUpperCase();
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function deterministicStats(symbol: string): Record<StatKey, string> {
  const h = hashSeed(symbol);
  const pe = 11 + (h % 38);
  const mcapBillions = ((h >>> 8) % 180) + 4;
  const divTenths = ((h >>> 16) % 35) / 10;
  const beta = ((55 + (h % 72)) / 100).toFixed(2);
  return {
    "P/E ratio": `${pe}.${(h >>> 4) % 9}`,
    "Market cap": `~$${mcapBillions}B (${symbol} mock sleeve)`,
    "Dividend yield": `${divTenths.toFixed(1)}%`,
    Beta: beta,
  };
}

function sizeLabel(candidate: UniverseCandidate): string {
  if (candidate.size === "large") return "Big established sleeve";
  if (candidate.size === "medium") return "Medium growth sleeve";
  return "Earlier-stage / nimble sleeve";
}

function candidateToSyntheticHolding(candidate: UniverseCandidate): Holding {
  const sub =
    candidate.size === "large" ? "large_cap" : candidate.size === "medium" ? "mid_cap" : "small_cap";
  return {
    holding_id: `discovery-preview-${candidate.symbol}`,
    symbol: candidate.symbol,
    name: candidate.name,
    asset_class: candidate.asset_class,
    subcategory: sub,
    sector: candidate.industry,
    quantity: 0,
    avg_buy_price: 1,
    current_price: 1,
    current_value: 0,
    unrealized_pnl: 0,
    unrealized_pnl_percent: 0,
    weight_in_portfolio: 5,
  };
}

function bullBearCopy(c: UniverseCandidate): { bull: string; bear: string } {
  const base = `${c.name} sits in ${c.asset_class} with ${c.risk} demo risk tagging.`;
  if (c.asset_class === "equity") {
    return {
      bull: `${base} Keywords like ${c.keywords.slice(0, 2).join(", ")} point to thematic demand — useful while you stay diversified.`,
      bear: `${c.industry}-leaning mocks can crater when liquidity tightens — size small until your rebalance checklist agrees.`,
    };
  }
  if (c.asset_class === "debt") {
    return {
      bull: `${base} Income sleeves aim to tame equity drama — textbook ballast inside a goals-first mix.`,
      bear: `${base} Spreads still bite on bad news — boring returns aren’t guaranteed losses.`,
    };
  }
  if (c.asset_class === "gold") {
    return {
      bull: `${base} Shines when fiat stress pings — diversification seasoning, not a lottery ticket.`,
      bear: `${base} No coupons forever; overstuffed sleeves drag compounding.`,
    };
  }
  return {
    bull: `${base} Holds dry powder near-term without forcing heroic equity timing.`,
    bear: `${base} Inflation nibbles silently — keep slices intentional.`,
  };
}

function headlinePack(c: UniverseCandidate): Array<{ headline: string; badge: string; summary: string }> {
  const tag = toTitleCase(c.industry.replace(/_/g, " "));
  return [
    {
      headline: `${c.keywords[0] ? toTitleCase(c.keywords[0]) : tag} chatter bubbling`,
      badge: "Sector skim",
      summary: `${c.name} aligns with motifs around ${c.keywords.slice(0, 3).join(", ") || tag}. Synthetic copy — not a live wire.`,
    },
    {
      headline: c.location === "domestic" ? "Local flows on watch" : "Global sleeve minding FX",
      badge: "Geography",
      summary:
        c.location === "domestic"
          ? "Domestic mock books still care about policy tone."
          : "International sleeves tolerate currency chatter — patience built in.",
    },
    {
      headline: `${c.asset_class.toUpperCase()} checklist`,
      badge: "Mock pulse",
      summary: `${c.risk}-risk tagging in universe data. Sanity-check allocations on /current before purchasing.`,
    },
  ];
}

function toTitleCase(value: string): string {
  return value.replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export default function PreviewDetail({ symbol }: { symbol: string }) {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const queryScoreRaw = searchParams.get("score");
  const queryScore = queryScoreRaw != null ? Number(queryScoreRaw) : NaN;

  const candidate = useMemo(() => getUniverseCandidateBySymbol(symbol), [symbol]);

  const stats = useMemo(() => deterministicStats(symbol), [symbol]);
  const pack = candidate ? headlinePack(candidate) : [];
  const bb = candidate ? bullBearCopy(candidate) : { bull: "", bear: "" };

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeInfo, setActiveInfo] = useState<StatKey | null>(null);
  const [llmExplain, setLlmExplain] = useState<{ term: StatKey; text: string } | null>(null);
  const { isSpeaking, speak: speakKuberText, stop: stopKuberVoice } = useKuberVoice();

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!user?.id || !candidate) {
        setUserProfile(null);
        return;
      }
      try {
        const data = await getDashboardData(supabase, user.id);
        if (!mounted) return;
        setUserProfile(mapDashboardToUserProfile(data));
      } catch {
        setUserProfile(null);
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, [user?.id, candidate]);

  const syntheticHolding = useMemo(() => (candidate ? candidateToSyntheticHolding(candidate) : null), [candidate]);

  const fitScore = useMemo(() => {
    if (!Number.isFinite(queryScore)) {
      if (syntheticHolding && userProfile) return computeFitScore(syntheticHolding, userProfile);
      return null;
    }
    return Math.max(0, Math.min(100, Math.round(queryScore)));
  }, [queryScore, syntheticHolding, userProfile]);

  useEffect(() => {
    const termStat = activeInfo;
    const holdName = candidate?.name;
    const holdSymbol = candidate?.symbol;
    let cancelled = false;
    async function jargonFetch() {
      if (!termStat || !holdName || !holdSymbol) {
        if (!cancelled) setLlmExplain(null);
        return;
      }
      const termKey: StatKey = termStat;
      try {
        const response = await fetch("/api/kuber/jargon", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            term: `${termKey} for discovery pick ${holdName} (${holdSymbol}) — not necessarily purchased yet`,
          }),
        });
        const payload = (await response.json()) as { message?: string };
        const text =
          typeof payload.message === "string" && payload.message.trim()
            ? payload.message.trim()
            : null;
        if (!cancelled && text) setLlmExplain({ term: termKey, text });
      } catch {
        if (!cancelled) setLlmExplain(null);
      }
    }
    void jargonFetch();
    return () => {
      cancelled = true;
    };
  }, [activeInfo, candidate?.name, candidate?.symbol]);

  if (!candidate) {
    return (
      <main className="px-4 py-10 sm:px-6 md:ml-60 md:px-8 md:py-12">
        <div className="mx-auto max-w-[1100px]">
          <Link href="/Kuber" className="text-sm" style={{ color: colors.textMuted }}>
            ← Back to discovery
          </Link>
          <p className="mt-6" style={{ color: colors.coral }}>
            Unknown discovery code &quot;{symbol.toUpperCase()}&quot;. Refresh matches from /Kuber.
          </p>
        </div>
      </main>
    );
  }

  const statRows: { label: StatKey; value: string }[] = [
    { label: "P/E ratio", value: stats["P/E ratio"] },
    { label: "Market cap", value: stats["Market cap"] },
    { label: "Dividend yield", value: stats["Dividend yield"] },
    { label: "Beta", value: stats.Beta },
  ];

  const scoreDisplay = fitScore != null ? `${fitScore}%` : "—";

  return (
    <main className="px-4 py-10 sm:px-6 md:ml-60 md:px-8 md:py-12">
      <div className="mx-auto max-w-[1100px]">
        <Link href="/Kuber" className="text-sm" style={{ color: colors.textMuted }}>
          ← Back to discovery
        </Link>

        <header className="mt-6 mb-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-5">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center text-lg font-semibold"
              style={{
                borderRadius: 999,
                backgroundColor: colors.surfaceElevated,
                color: colors.text,
              }}
              aria-hidden
            >
              {candidate.logo}
            </div>
            <div className="min-w-0">
              <h1 className="text-4xl" style={{ color: colors.text, fontFamily: typography.serif }}>
                {candidate.name}
              </h1>
              <p className="mt-2 text-sm" style={{ color: colors.textMuted }}>
                {symbol.toUpperCase()} · {sizeLabel(candidate)} · {toTitleCase(candidate.location)} ({candidate.asset_class}) ·
                illustrative mock bundle
              </p>
              <p className="mt-3 text-xs" style={{ color: colors.amber }}>
                Parity vibe with /current/[symbol]: static stats + mocks — Kubers jargon still hits Groq.
              </p>
            </div>
          </div>

          <div className="w-full p-5 lg:min-w-[240px] lg:max-w-[360px]" style={investiqCardStyle()}>
            <div className="text-sm" style={{ color: colors.textMuted }}>
              Match score {Number.isFinite(queryScore) ? "(from grid)" : "(modeled)"}
            </div>
            <div
              className="mt-1 text-3xl"
              style={{
                color: fitScore != null && fitScore >= 80 ? colors.green : colors.amber,
                fontFamily: typography.serif,
              }}
            >
              {scoreDisplay}
            </div>
            <div className="mt-3 text-xs" style={{ color: colors.textMuted }}>
              Surfaced via {candidate.asset_class} sleeve, {candidate.risk} risk posture, keywords {candidate.keywords.join(", ")}.
            </div>
          </div>
        </header>

        <section className="mb-8 p-6" style={investiqCardStyle()}>
          <h2 className="mb-4 text-xl" style={{ color: colors.text }}>
            Sleeve storyboard
          </h2>
          <div className="grid gap-4 text-sm sm:grid-cols-2">
            <div className="col-span-2">
              <div style={{ color: colors.textMuted }}>Themes</div>
              <div style={{ color: colors.text }}>{candidate.keywords.join(" · ") || "Universe tagging"}</div>
            </div>
            <div>
              <div style={{ color: colors.textMuted }}>Industry framing</div>
              <div style={{ color: colors.text }}>{toTitleCase(candidate.industry.replace(/_/g, " "))}</div>
            </div>
            <div>
              <div style={{ color: colors.textMuted }}>Liquidity intuition</div>
              <div style={{ color: colors.text }}>
                {candidate.asset_class === "equity"
                  ? "Tradable mocks — still respect basket caps before confirming."
                  : candidate.asset_class === "debt"
                    ? "Smoothing cousin to stocks — durations still sting sometimes."
                    : candidate.asset_class === "gold"
                      ? "Insurance coloring when macro rattles nerves."
                      : "Near-term float for bills and calm nerves."}
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8 grid gap-4 md:grid-cols-2">
          <article className="p-5" style={investiqCardStyle()}>
            <h3 className="mb-2" style={{ color: colors.text }}>
              Bulls say
            </h3>
            <p className="text-sm" style={{ color: colors.textMuted }}>
              {bb.bull}
            </p>
          </article>
          <article className="p-5" style={investiqCardStyle()}>
            <h3 className="mb-2" style={{ color: colors.text }}>
              Bears say
            </h3>
            <p className="text-sm" style={{ color: colors.textMuted }}>
              {bb.bear}
            </p>
          </article>
        </section>

        <section className="mb-8 p-6" style={investiqCardStyle()}>
          <h2 className="mb-4 text-xl" style={{ color: colors.text }}>
            Signals & headlines (mock)
          </h2>
          <ul className="space-y-4">
            {pack.map((row) => (
              <li
                key={row.headline}
                className="rounded-lg border p-4 text-sm"
                style={{ borderColor: colors.border, color: colors.textMuted }}
              >
                <span
                  className="mr-2 inline-block rounded px-2 py-0.5 text-xs font-semibold"
                  style={{ backgroundColor: `${colors.accent}22`, color: colors.accent }}
                >
                  {row.badge}
                </span>
                <span className="font-medium" style={{ color: colors.text }}>
                  {row.headline}
                </span>
                <p className="mt-2">{row.summary}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-8 p-6" style={investiqCardStyle()}>
          <h2 className="mb-4 text-xl" style={{ color: colors.text }}>
            Key stats in plain language
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {statRows.map((row) => (
              <div key={row.label} className="rounded-lg border p-4" style={{ borderColor: colors.border }}>
                <div className="mb-1 flex items-center justify-between text-sm" style={{ color: colors.textMuted }}>
                  <span>{row.label}</span>
                  <button
                    type="button"
                    onClick={() => setActiveInfo(activeInfo === row.label ? null : row.label)}
                    style={{ color: colors.accent }}
                    aria-label={`More on ${row.label}`}
                  >
                    <Info className="h-4 w-4" />
                  </button>
                </div>
                <div style={{ color: colors.text }}>{row.value}</div>
                {activeInfo === row.label ? (
                  <div className="mt-2 text-xs" style={{ color: colors.textMuted }}>
                    {(llmExplain?.term === row.label ? llmExplain.text : null) ?? statDefinitions[row.label]}
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
                          new CustomEvent("investiq:open-kuber", {
                            detail: { prompt: `Explain ${row.label} for discovery pick ${candidate.name}` },
                          }),
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

        <div className="flex flex-wrap gap-3">
          <Link href="/Kuber" style={{ ...investiqButtonStyle("secondary") }}>
            Return to discovery
          </Link>
          <button
            type="button"
            style={investiqButtonStyle("primary")}
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent("investiq:open-kuber", {
                  detail: {
                    prompt: `${user?.id ? "I'm" : "If I were"} signed in, how would ${candidate.name} (${candidate.symbol}) fit responsibly?`,
                  },
                }),
              );
            }}
          >
            Ask Kuber about {candidate.symbol}
          </button>
        </div>
      </div>
    </main>
  );
}

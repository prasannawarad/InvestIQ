"use client";

import type { DiscoveryFilters, MatchCandidate } from "@investiq/engine";
import { ChevronDown, Play, Plus, Settings, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { colors, radii, shadows, typography } from "@investiq/ui/tokens";
import { applyDiscoveryCommit } from "../../lib/applyDiscoveryCommit";
import { getDashboardData } from "../../lib/supabaseData";
import { supabase } from "../../lib/supabase";
import {
  investiqButtonStyle,
  investiqFieldStyle,
  investiqFilterChipStyle,
  investiqCardStyle,
  investiqOnAccentSolidCtaStyle,
  investiqOnAccentToolbarStyle,
  investiqTabStyle,
} from "../../lib/investiqUi";
import { mapDashboardToPortfolio, mapDashboardToUserProfile } from "../../lib/engineAdapter";
import { useAuth } from "../components/auth/AuthProvider";

type Status = "standby" | "running";

type RiskLevel = "low" | "medium" | "high";

type Match = {
  id: string;
  name: string;
  logo: string;
  industry: string;
  size: string;
  location: string;
  score: number;
  why: string[];
};

type BasketLine = { id: string; name: string; logo: string; amount: number };

const INDUSTRY_OPTIONS: { label: string; slug: string }[] = [
  { label: "Tech", slug: "technology" },
  { label: "Finance", slug: "financials" },
  { label: "Healthcare", slug: "healthcare" },
  { label: "Energy", slug: "energy" },
  { label: "Consumer", slug: "consumer" },
  { label: "Agri", slug: "agriculture" },
  { label: "Infra", slug: "infrastructure" },
  { label: "Industrials", slug: "industrials" },
  { label: "Bonds", slug: "fixed_income" },
  { label: "Commodities", slug: "commodities" },
  { label: "Cash funds", slug: "money_market" },
];

const SIZE_SLUGS = ["small", "medium", "large"] as const;
const SIZE_OPTIONS: { label: string; slug: (typeof SIZE_SLUGS)[number] }[] = [
  { label: "Small", slug: "small" },
  { label: "Medium", slug: "medium" },
  { label: "Large", slug: "large" },
];

const GEO_OPTIONS: { label: string; slug: "domestic" | "international" }[] = [
  { label: "Domestic", slug: "domestic" },
  { label: "International", slug: "international" },
];

const ASSET_OPTIONS: { label: string; slug: "equity" | "debt" | "gold" | "cash" }[] = [
  { label: "Stocks", slug: "equity" },
  { label: "Bonds", slug: "debt" },
  { label: "Gold", slug: "gold" },
  { label: "Cash", slug: "cash" },
];

const KEYWORD_OPTIONS = [
  { label: "Quality", slug: "quality" },
  { label: "Defensive", slug: "defensive" },
  { label: "Diversified", slug: "diversified" },
];

function getFirstName(fullName: string | null | undefined): string {
  const name = fullName?.trim();
  if (!name) return "there";
  return name.split(/\s+/)[0] ?? "there";
}

function toDisplaySize(value: string): string {
  if (value === "large") return "Big established";
  if (value === "medium") return "Medium growing";
  return "Early growth";
}

function toTitleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function toggleSetMember<T extends string>(set: Set<T>, key: T): Set<T> {
  const next = new Set(set);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}

function buildFiltersForApi(input: {
  budget: number;
  risk: RiskLevel;
  industries: Set<string>;
  sizes: Set<(typeof SIZE_SLUGS)[number]>;
  geo: Set<"domestic" | "international">;
  assets: Set<"equity" | "debt" | "gold" | "cash">;
  keywords: Set<string>;
}): DiscoveryFilters {
  return {
    money_to_invest: input.budget,
    per_position_cap: Math.max(100, Math.round(input.budget / 3)),
    industries: [...input.industries],
    sizes: input.sizes.size ? [...input.sizes] : [],
    risk: input.risk,
    asset_classes: input.assets.size ? [...input.assets] : [],
    geography: input.geo.size ? [...input.geo] : [],
    keywords: [...input.keywords],
  };
}

export default function KuberPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<Status>("standby");
  const [showFilters, setShowFilters] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [basket, setBasket] = useState<BasketLine[]>([]);
  const [budget, setBudget] = useState(500);
  const [profileName, setProfileName] = useState(getFirstName(user?.user_metadata?.full_name));
  const [equityShare, setEquityShare] = useState(65);
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesError, setMatchesError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const [selectedIndustries, setSelectedIndustries] = useState(() => new Set<string>());
  const [selectedSizes, setSelectedSizes] = useState(
    () => new Set<(typeof SIZE_SLUGS)[number]>(["small", "medium", "large"]),
  );
  const [selectedGeo, setSelectedGeo] = useState(
    () => new Set<"domestic" | "international">(["domestic", "international"]),
  );
  const [selectedAssets, setSelectedAssets] = useState(
    () => new Set<"equity" | "debt" | "gold" | "cash">(["equity", "debt", "gold", "cash"]),
  );
  const [selectedKeywords, setSelectedKeywords] = useState(
    () => new Set<string>(["defensive", "diversified", "quality"]),
  );
  const [riskMode, setRiskMode] = useState<"profile" | RiskLevel>("profile");

  useEffect(() => {
    let mounted = true;

    async function init() {
      if (!user?.id) return;
      const data = await getDashboardData(supabase, user.id);
      if (!mounted) return;
      const byAsset = (data.portfolio.allocation as Record<string, unknown>).by_asset_class as Record<string, number>;
      const monthlySavings = Number((data.profile.financial_context as Record<string, unknown>).monthly_savings_capacity ?? 500);
      setProfileName(getFirstName(data.profile.name));
      setBudget(Math.max(300, Math.min(2000, Math.round(monthlySavings * 0.02))));
      setEquityShare(Math.round(Number(byAsset?.equity ?? 65)));
    }

    void init();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const startDiscovery = useCallback(async () => {
    if (!user?.id) {
      toast.error("Sign in to run discovery.");
      return;
    }
    setStatus("running");
    setMatchesLoading(true);
    setMatchesError(null);

    try {
      const data = await getDashboardData(supabase, user.id);
      const portfolio = mapDashboardToPortfolio(data);
      const userProfile = mapDashboardToUserProfile(data);
      const risk: RiskLevel =
        riskMode === "profile" ? userProfile.risk_profile.risk_tolerance : riskMode;

      const filters = buildFiltersForApi({
        budget,
        risk,
        industries: selectedIndustries,
        sizes: selectedSizes,
        geo: selectedGeo,
        assets: selectedAssets,
        keywords: selectedKeywords,
      });

      const response = await fetch("/api/engine/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filters,
          userProfile,
          portfolio,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate matches");
      }

      const json = (await response.json()) as { matches: MatchCandidate[] };
      const mapped = json.matches.map((match) => ({
        id: match.symbol,
        name: match.name,
        logo: match.logo,
        industry: toTitleCase(match.industry),
        size: toDisplaySize(match.size),
        location: toTitleCase(match.location),
        score: match.match_score,
        why: match.why_match,
      }));
      setMatches(mapped);
    } catch (err) {
      setMatchesError(err instanceof Error ? err.message : "Failed to generate matches");
      setMatches([]);
    } finally {
      setMatchesLoading(false);
    }
  }, [
    user?.id,
    budget,
    riskMode,
    selectedIndustries,
    selectedSizes,
    selectedGeo,
    selectedAssets,
    selectedKeywords,
  ]);

  async function confirmDiscovery() {
    if (!user?.id) {
      toast.error("Sign in to save holdings.");
      return;
    }
    if (basket.length === 0) {
      toast.error("Add at least one discovery position first.");
      return;
    }
    setConfirming(true);
    try {
      const dash = await getDashboardData(supabase, user.id);
      await applyDiscoveryCommit(
        dash,
        basket.map((b) => ({ symbol: b.id, amount_usd: b.amount })),
      );
      toast.success("Discovery saved to your portfolio.", { description: "Supabase holdings updated — Kubers pulls them on refresh." });
      setBasket([]);
      setMatches([]);
      setStatus("standby");
      router.push("/home");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save discovery.");
    } finally {
      setConfirming(false);
    }
  }

  const used = useMemo(() => basket.reduce((sum, item) => sum + item.amount, 0), [basket]);
  const remaining = Math.max(0, budget - used);

  return (
    <main className="ml-60 min-h-screen">
      <div
        className="sticky top-0 z-30 flex items-center justify-between border-b px-8 py-3"
        style={{
          backgroundColor: status === "standby" ? colors.surfaceElevated : colors.accent,
          borderColor: colors.border,
        }}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold" style={{ color: status === "standby" ? colors.text : colors.onAccent }}>
              {status === "standby" ? "Standby" : "Running"}
            </span>
            {status === "standby" ? (
              <span className="truncate text-sm" style={{ color: colors.textMuted }}>
                · Rankings from @investiq/engine (mock universe) — not Groq
              </span>
            ) : (
              <span className="truncate text-sm" style={{ color: `${colors.onAccent}e6` }}>
                · {basket.length} line{basket.length === 1 ? "" : "s"} · ${used} / ${budget} · ${remaining} left
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFilters(true)}
            disabled={!user?.id}
            className="flex items-center gap-2"
            style={status === "standby" ? investiqButtonStyle("secondary", { size: "sm" }) : investiqOnAccentToolbarStyle()}
          >
            <Settings className="h-4 w-4" />
            Filters
          </button>
          <button
            type="button"
            onClick={() => void startDiscovery()}
            disabled={!user?.id || matchesLoading}
            className="flex items-center gap-2 disabled:opacity-50"
            style={status === "standby" ? investiqButtonStyle("primary", { size: "sm" }) : investiqOnAccentSolidCtaStyle()}
          >
            <Play className="h-4 w-4" />
            Start
          </button>
        </div>
      </div>

      {!user?.id ? (
        <p className="mx-8 mt-6 text-sm" style={{ color: colors.coral }}>
          Sign in — discovery reads your allocations and persists new holdings to Supabase after confirm.
        </p>
      ) : (
        <p className="mx-8 mt-4 text-xs" style={{ color: colors.textMuted }}>
          Matches = deterministic <code>generateMatches</code> inside <code>@investiq/engine</code>. Kubers <em>dialogue</em> still runs on Groq
          elsewhere; this surface only consumes engine JSON plus your filters.
        </p>
      )}

      <div className="flex gap-8 px-8 py-8">
        <section className="w-[40%]">
          {basket.length === 0 ? (
            <div className="p-8" style={investiqCardStyle()}>
              <h2 className="mb-4 text-2xl" style={{ color: colors.text, fontFamily: typography.serif }}>
                Hi {profileName}. Let&apos;s find new investments.
              </h2>
              <p className="mb-6 text-sm" style={{ color: colors.textMuted }}>
                You are currently around {equityShare}% in equities. Open filters (industries, sizes, geography, sleeve), set budget,
                Start — then add mock-universe picks; Review & Confirm writes rows to Postgres.
              </p>
              <button type="button" onClick={() => setShowFilters(true)} disabled={!user?.id} className="w-full disabled:opacity-50" style={investiqButtonStyle("primary", { fullWidth: true })}>
                Open Filters
              </button>
            </div>
          ) : (
            <div className="sticky top-24 p-6" style={investiqCardStyle()}>
              <h3 className="mb-4 text-lg" style={{ color: colors.text }}>
                Pending basket (not invested until confirm)
              </h3>
              <div className="mb-6 space-y-3">
                {basket.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3"
                    style={{ borderRadius: radii.md, backgroundColor: colors.surface, border: `1px solid ${colors.borderSubtle}` }}
                  >
                    <div
                      className="flex h-8 w-8 items-center justify-center text-xs"
                      style={{ borderRadius: radii.pill, backgroundColor: colors.surfaceElevated }}
                    >
                      {item.logo}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm" style={{ color: colors.text }}>
                        {item.name}
                      </div>
                      <div className="text-xs font-mono" style={{ color: colors.textMuted }}>
                        {item.id} · ${item.amount}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="w-full disabled:opacity-60"
                style={investiqButtonStyle("primary", { fullWidth: true })}
                disabled={confirming || !user?.id}
                onClick={() => void confirmDiscovery()}
              >
                {confirming ? "Saving…" : "Review & Confirm"}
              </button>
            </div>
          )}
        </section>

        <section className="w-[60%]">
          <h3 className="mb-6 text-xl" style={{ color: colors.text }}>
            Top matches
          </h3>
          {status === "standby" ? (
            <div className="py-20 text-center" style={{ color: colors.textMuted }}>
              Set filters and Start — payloads now include industries, sleeves, geography, keywords, risk.
            </div>
          ) : matchesLoading ? (
            <div className="py-20 text-center" style={{ color: colors.textMuted }}>
              Ranking mock universe candidates…
            </div>
          ) : matchesError ? (
            <div className="py-20 text-center" style={{ color: colors.coral }}>
              {matchesError}
            </div>
          ) : matches.length === 0 ? (
            <div className="py-20 text-center" style={{ color: colors.textMuted }}>
              No matches for current filters — loosen industries or sizing.
            </div>
          ) : (
            <div className="space-y-6">
              {matches.map((match) => (
                <article key={match.id} className="p-6" style={investiqCardStyle()}>
                  <Link
                    href={`/Kuber/preview/${encodeURIComponent(match.id)}?score=${match.score}`}
                    className="mb-4 flex items-start justify-between gap-4 rounded-xl outline-none transition hover:brightness-[1.08] focus-visible:ring-2 focus-visible:ring-[var(--investiq-accent)]/40"
                    style={{ color: "inherit", textDecoration: "none" }}
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-4">
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center text-sm"
                        style={{ borderRadius: radii.pill, backgroundColor: colors.surfaceElevated }}
                      >
                        {match.logo}
                      </div>
                      <div className="min-w-0">
                        <h4 className="mb-1 text-xl" style={{ color: colors.text, fontFamily: typography.serif }}>
                          {match.name}
                        </h4>
                        <div className="text-sm font-mono" style={{ color: colors.textMuted }}>
                          {match.id} · {match.industry} · {match.size} · {match.location}
                        </div>
                        <div className="mt-2 text-xs" style={{ color: colors.accent }}>
                          Tap for research desk →
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 rounded-full px-3 py-1 text-sm" style={{ color: colors.green, backgroundColor: `${colors.green}22` }}>
                      {match.score}%
                    </div>
                  </Link>

                  <button
                    type="button"
                    onClick={() => setExpanded(expanded === match.id ? null : match.id)}
                    className="mb-3 flex items-center gap-1 text-sm"
                    style={{ color: colors.accent }}
                  >
                    Why this match
                    <ChevronDown className={`h-4 w-4 transition-transform ${expanded === match.id ? "rotate-180" : ""}`} />
                  </button>

                  {expanded === match.id ? (
                    <ul className="mb-4 space-y-1 pl-4 text-sm" style={{ color: colors.textMuted }}>
                      {match.why.map((reason) => (
                        <li key={reason}>• {reason}</li>
                      ))}
                    </ul>
                  ) : null}

                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={remaining <= 0 || !user?.id}
                      onClick={() => {
                        if (remaining <= 0 || !user?.id) return;
                        const amount = Math.min(100, remaining);
                        setBasket((prev) => {
                          const idx = prev.findIndex((p) => p.id === match.id);
                          if (idx >= 0) {
                            const copy = [...prev];
                            copy[idx] = { ...copy[idx], amount: copy[idx].amount + amount };
                            return copy;
                          }
                          return [...prev, { id: match.id, name: match.name, logo: match.logo, amount }];
                        });
                      }}
                      className="flex items-center gap-1 disabled:opacity-50"
                      style={investiqButtonStyle("primary", { size: "sm" })}
                    >
                      <Plus className="h-4 w-4" />
                      Add $100 slice
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {showFilters ? (
        <>
          <div className="fixed inset-0 z-40 backdrop-blur-[2px]" style={{ backgroundColor: colors.overlay }} onClick={() => setShowFilters(false)} />
          <aside
            className="fixed top-0 right-0 bottom-0 z-50 w-[400px] overflow-y-auto"
            style={{ backgroundColor: colors.cardBg, boxShadow: shadows.popover }}
          >
            <div className="sticky top-0 flex items-center justify-between p-6" style={{ borderBottom: `1px solid ${colors.border}` }}>
              <h3 className="text-xl" style={{ color: colors.text }}>
                Filters
              </h3>
              <button type="button" aria-label="Close filters" onClick={() => setShowFilters(false)}>
                <X className="h-5 w-5" style={{ color: colors.textMuted }} />
              </button>
            </div>

            <div className="space-y-8 p-6">
              <div>
                <label className="mb-2 block text-sm" style={{ color: colors.text }}>
                  Money to invest (guides per-position sizing)
                </label>
                <input
                  type="number"
                  min={300}
                  max={200000}
                  value={budget}
                  onChange={(event) => setBudget(Number(event.target.value || 0))}
                  className="outline-none focus-visible:ring-2 focus-visible:ring-[var(--investiq-accent)]/35"
                  style={investiqFieldStyle()}
                />
              </div>

              <div>
                <label className="mb-3 block text-sm" style={{ color: colors.text }}>
                  Risk lens for rankings
                </label>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ["profile", "Match my profile"] as const,
                      ["low", "Cautious"] as const,
                      ["medium", "Balanced"] as const,
                      ["high", "Bold"] as const,
                    ]
                  ).map(([key, label]) => {
                    const active = riskMode === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() =>
                          key === "profile" ? setRiskMode("profile") : setRiskMode(key as RiskLevel)
                        }
                        style={investiqTabStyle(active)}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-3 block text-sm" style={{ color: colors.text }}>
                  Industries (empty = no industry filter — neutral score)
                </label>
                <div className="flex flex-wrap gap-2">
                  {INDUSTRY_OPTIONS.map(({ label, slug }) => {
                    const active = selectedIndustries.has(slug);
                    return (
                      <button
                        key={slug}
                        type="button"
                        onClick={() => setSelectedIndustries(toggleSetMember(selectedIndustries, slug))}
                        style={investiqFilterChipStyle(active)}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-3 block text-sm" style={{ color: colors.text }}>
                  Company size
                </label>
                <div className="flex flex-wrap gap-2">
                  {SIZE_OPTIONS.map(({ label, slug }) => {
                    const active = selectedSizes.has(slug);
                    return (
                      <button
                        key={slug}
                        type="button"
                        onClick={() => setSelectedSizes(toggleSetMember(selectedSizes, slug))}
                        style={investiqFilterChipStyle(active)}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-3 block text-sm" style={{ color: colors.text }}>
                  Geography
                </label>
                <div className="flex flex-wrap gap-2">
                  {GEO_OPTIONS.map(({ label, slug }) => {
                    const active = selectedGeo.has(slug);
                    return (
                      <button key={slug} type="button" onClick={() => setSelectedGeo(toggleSetMember(selectedGeo, slug))} style={investiqFilterChipStyle(active)}>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-3 block text-sm" style={{ color: colors.text }}>
                  Sleeves allowed
                </label>
                <div className="flex flex-wrap gap-2">
                  {ASSET_OPTIONS.map(({ label, slug }) => {
                    const active = selectedAssets.has(slug);
                    return (
                      <button
                        key={slug}
                        type="button"
                        onClick={() => setSelectedAssets(toggleSetMember(selectedAssets, slug))}
                        style={investiqFilterChipStyle(active)}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-3 block text-sm" style={{ color: colors.text }}>
                  Style keywords
                </label>
                <div className="flex flex-wrap gap-2">
                  {KEYWORD_OPTIONS.map(({ label, slug }) => {
                    const active = selectedKeywords.has(slug);
                    return (
                      <button
                        key={slug}
                        type="button"
                        onClick={() => setSelectedKeywords(toggleSetMember(selectedKeywords, slug))}
                        style={investiqFilterChipStyle(active)}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div
              className="sticky bottom-0 flex items-center justify-between border-t p-6"
              style={{ borderColor: colors.border, backgroundColor: colors.cardBg }}
            >
              <button type="button" onClick={() => setShowFilters(false)} style={investiqButtonStyle("ghost", { size: "sm" })}>
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowFilters(false);
                  void startDiscovery();
                }}
                style={investiqButtonStyle("primary")}
              >
                Apply & Start
              </button>
            </div>
          </aside>
        </>
      ) : null}
    </main>
  );
}

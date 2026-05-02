"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Play, Plus, Settings, X } from "lucide-react";
import { colors, radii, shadows, typography } from "@investiq/ui/tokens";
import {
  investiqButtonStyle,
  investiqFieldStyle,
  investiqFilterChipStyle,
  investiqCardStyle,
  investiqOnAccentSolidCtaStyle,
  investiqOnAccentToolbarStyle,
} from "../../lib/investiqUi";
import type { MatchCandidate } from "@investiq/engine";
import { useAuth } from "../components/auth/AuthProvider";
import { supabase } from "../../lib/supabase";
import { getDashboardData } from "../../lib/supabaseData";
import { mapDashboardToPortfolio, mapDashboardToUserProfile } from "../../lib/engineAdapter";

type Status = "standby" | "running";

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

export default function KuberPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<Status>("standby");
  const [showFilters, setShowFilters] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [basket, setBasket] = useState<{ id: string; name: string; logo: string; amount: number }[]>([]);
  const [budget, setBudget] = useState(500);
  const [profileName, setProfileName] = useState(getFirstName(user?.user_metadata?.full_name));
  const [equityShare, setEquityShare] = useState(65);
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesError, setMatchesError] = useState<string | null>(null);

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

  async function startDiscovery() {
    if (!user?.id) return;
    setStatus("running");
    setMatchesLoading(true);
    setMatchesError(null);

    try {
      const data = await getDashboardData(supabase, user.id);
      const portfolio = mapDashboardToPortfolio(data);
      const userProfile = mapDashboardToUserProfile(data);

      const response = await fetch("/api/engine/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filters: {
            money_to_invest: budget,
            per_position_cap: Math.max(100, Math.round(budget / 3)),
            industries: ["technology", "financials", "healthcare", "energy", "consumer"],
            sizes: ["medium", "large"],
            risk: userProfile.risk_profile.risk_tolerance,
            asset_classes: ["equity", "debt", "gold"],
            geography: ["domestic", "international"],
            keywords: ["defensive", "diversified", "quality"],
          },
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
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="text-sm font-semibold" style={{ color: status === "standby" ? colors.text : colors.onAccent }}>
            {status === "standby" ? "Standby" : "Running"}
          </span>
          {status === "standby" ? (
            <span className="truncate text-sm" style={{ color: colors.textMuted }}>
              · Configure your filters to start
            </span>
          ) : (
            <span className="truncate text-sm" style={{ color: `${colors.onAccent}e6` }}>
              · {basket.length} holdings · ${used} of ${budget} used · ${remaining} left
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFilters(true)}
            className="flex items-center gap-2"
            style={status === "standby" ? investiqButtonStyle("secondary", { size: "sm" }) : investiqOnAccentToolbarStyle()}
          >
            <Settings className="h-4 w-4" />
            Filters
          </button>
          <button
            type="button"
            onClick={() => {
              void startDiscovery();
            }}
            className="flex items-center gap-2"
            style={status === "standby" ? investiqButtonStyle("primary", { size: "sm" }) : investiqOnAccentSolidCtaStyle()}
          >
            <Play className="h-4 w-4" />
            Start
          </button>
        </div>
      </div>

      <div className="flex gap-8 px-8 py-8">
        <section className="w-[40%]">
          {basket.length === 0 ? (
            <div className="p-8" style={investiqCardStyle()}>
              <h2 className="mb-4 text-2xl" style={{ color: colors.text, fontFamily: typography.serif }}>
                Hi {profileName}. Let&apos;s find new investments.
              </h2>
              <p className="mb-6 text-sm" style={{ color: colors.textMuted }}>
                You are currently around {equityShare}% in equities. Open Filters, set your budget and preferences, then start discovery.
              </p>
              <button type="button" onClick={() => setShowFilters(true)} className="w-full" style={investiqButtonStyle("primary", { fullWidth: true })}>
                Open Filters
              </button>
            </div>
          ) : (
            <div className="sticky top-24 p-6" style={investiqCardStyle()}>
              <h3 className="mb-4 text-lg" style={{ color: colors.text }}>
                Holdings in your basket
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
                      <div className="text-xs" style={{ color: colors.textMuted }}>
                        ${item.amount}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" className="w-full" style={investiqButtonStyle("primary", { fullWidth: true })}>
                Review & Confirm
              </button>
            </div>
          )}
        </section>

        <section className="w-[60%]">
          <h3 className="mb-6 text-xl" style={{ color: colors.text }}>
            Top Matches
          </h3>
          {status === "standby" ? (
            <div className="py-20 text-center" style={{ color: colors.textMuted }}>
              Set your filters and click Start.
            </div>
          ) : matchesLoading ? (
            <div className="py-20 text-center" style={{ color: colors.textMuted }}>
              Generating matches...
            </div>
          ) : matchesError ? (
            <div className="py-20 text-center" style={{ color: colors.coral }}>
              {matchesError}
            </div>
          ) : matches.length === 0 ? (
            <div className="py-20 text-center" style={{ color: colors.textMuted }}>
              No matches for current filters.
            </div>
          ) : (
            <div className="space-y-6">
              {matches.map((match) => (
                <article
                  key={match.id}
                  className="p-6"
                  style={investiqCardStyle()}
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        className="flex h-12 w-12 items-center justify-center text-sm"
                        style={{ borderRadius: radii.pill, backgroundColor: colors.surfaceElevated }}
                      >
                        {match.logo}
                      </div>
                      <div>
                        <h4 className="mb-1 text-xl" style={{ color: colors.text, fontFamily: typography.serif }}>
                          {match.name}
                        </h4>
                        <div className="text-sm" style={{ color: colors.textMuted }}>
                          {match.industry} · {match.size} · {match.location}
                        </div>
                      </div>
                    </div>
                    <div
                      className="rounded-full px-3 py-1 text-sm"
                      style={{ color: colors.green, backgroundColor: `${colors.green}22` }}
                    >
                      {match.score}%
                    </div>
                  </div>

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
                      onClick={() => {
                        if (remaining <= 0) return;
                        const amount = Math.min(100, remaining);
                        setBasket((prev) => [...prev, { id: match.id, name: match.name, logo: match.logo, amount }]);
                      }}
                      className="flex items-center gap-1"
                      style={investiqButtonStyle("primary", { size: "sm" })}
                    >
                      <Plus className="h-4 w-4" />
                      Add
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
            className="fixed right-0 top-0 bottom-0 z-50 w-[400px] overflow-y-auto"
            style={{ backgroundColor: colors.cardBg, boxShadow: shadows.popover }}
          >
            <div className="sticky top-0 flex items-center justify-between p-6" style={{ borderBottom: `1px solid ${colors.border}` }}>
              <h3 className="text-xl" style={{ color: colors.text }}>
                Filters
              </h3>
              <button type="button" onClick={() => setShowFilters(false)}>
                <X className="h-5 w-5" style={{ color: colors.textMuted }} />
              </button>
            </div>

            <div className="space-y-6 p-6">
              <div>
                <label className="mb-2 block text-sm" style={{ color: colors.text }}>
                  Money to invest
                </label>
                <input
                  type="number"
                  value={budget}
                  onChange={(event) => setBudget(Number(event.target.value || 0))}
                  className="outline-none focus-visible:ring-2 focus-visible:ring-[var(--investiq-accent)]/35"
                  style={investiqFieldStyle()}
                />
              </div>

              <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: "24px" }}>
                <label className="mb-3 block text-sm" style={{ color: colors.text }}>
                  Industry / Sector
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Tech",
                    "Finance",
                    "Healthcare",
                    "Energy",
                    "Consumer",
                    "Real Estate",
                    "Industrials",
                  ].map((label) => (
                    <button
                      key={label}
                      type="button"
                      style={{ ...investiqFilterChipStyle(false), fontSize: "13px", color: colors.text }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div
              className="sticky bottom-0 flex items-center justify-between p-6"
              style={{ borderTop: `1px solid ${colors.border}`, backgroundColor: colors.cardBg }}
            >
              <button type="button" onClick={() => setShowFilters(false)} style={investiqButtonStyle("ghost", { size: "sm" })}>
                Cancel
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

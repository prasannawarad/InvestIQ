"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Play, Plus, Settings, X } from "lucide-react";
import { colors, radii, shadows, typography } from "@investiq/ui/tokens";

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

const matches: Match[] = [
  {
    id: "m1",
    name: "TechFin Holdings",
    logo: "TF",
    industry: "Technology",
    size: "Big established",
    location: "Domestic",
    score: 91,
    why: [
      "Matches your balanced risk preference",
      "Improves diversification in large-cap tech",
      "Fits your 3+ year house goal horizon",
    ],
  },
  {
    id: "m2",
    name: "Bharat Energy Ltd",
    logo: "BE",
    industry: "Energy",
    size: "Medium growing",
    location: "Domestic",
    score: 84,
    why: [
      "Adds sector exposure you currently underweight",
      "Moderate volatility for long-term growth",
      "Works within your per-position cap",
    ],
  },
  {
    id: "m3",
    name: "Atlas Consumer Fund",
    logo: "AC",
    industry: "Consumer",
    size: "Big established",
    location: "International",
    score: 79,
    why: [
      "Defensive sector for drawdown protection",
      "Diversifies away from concentrated equity funds",
      "Complements your existing index exposure",
    ],
  },
];

export default function KuberPage() {
  const [status, setStatus] = useState<Status>("standby");
  const [showFilters, setShowFilters] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [basket, setBasket] = useState<{ id: string; name: string; logo: string; amount: number }[]>([]);
  const [budget, setBudget] = useState(500);

  const used = useMemo(() => basket.reduce((sum, item) => sum + item.amount, 0), [basket]);
  const remaining = Math.max(0, budget - used);

  return (
    <main className="ml-60 min-h-screen">
      <div
        className="sticky top-0 z-30 flex items-center justify-between px-8 py-3"
        style={{ backgroundColor: status === "standby" ? colors.textMuted : colors.accent }}
      >
        <div className="flex items-center gap-3" style={{ color: colors.cardBg }}>
          <span className="text-sm">{status === "standby" ? "Standby" : "Running"}</span>
          {status === "standby" ? (
            <span className="text-sm">· Configure your filters to start</span>
          ) : (
            <span className="text-sm">· {basket.length} holdings · ${used} of ${budget} used · ${remaining} left</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFilters(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm"
            style={{ borderRadius: radii.md, color: colors.cardBg, backgroundColor: `${colors.cardBg}22` }}
          >
            <Settings className="h-4 w-4" />
            Filters
          </button>
          <button
            type="button"
            onClick={() => setStatus("running")}
            className="flex items-center gap-2 px-4 py-2 text-sm"
            style={{ borderRadius: radii.md, backgroundColor: colors.cardBg, color: colors.accent }}
          >
            <Play className="h-4 w-4" />
            Start
          </button>
        </div>
      </div>

      <div className="flex gap-8 px-8 py-8">
        <section className="w-[40%]">
          {basket.length === 0 ? (
            <div className="p-8" style={{ borderRadius: radii.xl, boxShadow: shadows.card, backgroundColor: colors.cardBg }}>
              <h2 className="mb-4 text-2xl" style={{ color: colors.text, fontFamily: typography.serif }}>
                Hi Priya. Let&apos;s find new investments.
              </h2>
              <p className="mb-6 text-sm" style={{ color: colors.textMuted }}>
                Open Filters, set your budget and preferences, then start discovery.
              </p>
              <button
                type="button"
                onClick={() => setShowFilters(true)}
                className="w-full py-3 text-sm"
                style={{ borderRadius: radii.md, backgroundColor: colors.accent, color: colors.cardBg }}
              >
                Open Filters
              </button>
            </div>
          ) : (
            <div className="sticky top-24 p-6" style={{ borderRadius: radii.xl, boxShadow: shadows.card, backgroundColor: colors.cardBg }}>
              <h3 className="mb-4 text-lg" style={{ color: colors.text }}>
                Holdings in your basket
              </h3>
              <div className="mb-6 space-y-3">
                {basket.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3"
                    style={{ borderRadius: radii.md, backgroundColor: colors.backgroundPanic }}
                  >
                    <div
                      className="flex h-8 w-8 items-center justify-center text-xs"
                      style={{ borderRadius: radii.pill, backgroundColor: colors.cardBg }}
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
              <button
                type="button"
                className="w-full py-3 text-sm"
                style={{ borderRadius: radii.md, backgroundColor: colors.accent, color: colors.cardBg }}
              >
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
          ) : (
            <div className="space-y-6">
              {matches.map((match) => (
                <article
                  key={match.id}
                  className="p-6"
                  style={{ borderRadius: radii.xl, boxShadow: shadows.card, backgroundColor: colors.cardBg }}
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        className="flex h-12 w-12 items-center justify-center text-sm"
                        style={{ borderRadius: radii.pill, backgroundColor: colors.backgroundPanic }}
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
                      className="flex items-center gap-1 px-4 py-2 text-sm"
                      style={{ borderRadius: radii.md, color: colors.cardBg, backgroundColor: colors.accent }}
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
          <div
            className="fixed inset-0 z-40"
            style={{ backgroundColor: `${colors.text}66` }}
            onClick={() => setShowFilters(false)}
          />
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
                  className="w-full px-4 py-3 text-sm outline-none"
                  style={{
                    border: `1px solid ${colors.border}`,
                    borderRadius: radii.md,
                    backgroundColor: colors.cardBg,
                    color: colors.text,
                  }}
                />
              </div>

              <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: "24px" }}>
                <label className="mb-3 block text-sm" style={{ color: colors.text }}>
                  Industry / Sector
                </label>
                <div className="flex flex-wrap gap-2">
                  {["Tech", "Finance", "Healthcare", "Energy", "Consumer", "Real Estate", "Industrials"].map(
                    (label) => (
                      <button
                        key={label}
                        type="button"
                        className="px-3 py-1.5 text-sm"
                        style={{
                          borderRadius: radii.pill,
                          backgroundColor: colors.backgroundPanic,
                          color: colors.text,
                        }}
                      >
                        {label}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 flex items-center justify-between p-6" style={{ borderTop: `1px solid ${colors.border}`, backgroundColor: colors.cardBg }}>
              <button type="button" onClick={() => setShowFilters(false)} style={{ color: colors.textMuted }}>
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowFilters(false);
                  setStatus("running");
                }}
                className="px-6 py-3 text-sm"
                style={{ borderRadius: radii.md, color: colors.cardBg, backgroundColor: colors.accent }}
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

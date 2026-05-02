"use client";

import { useEffect, useState } from "react";
import { colors, radii, typography } from "@investiq/ui/tokens";
import { useAuth } from "../components/auth/AuthProvider";
import { getDashboardData, type SupabaseDashboardData } from "../../lib/supabaseData";

function toCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [data, setData] = useState<SupabaseDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      if (!user?.id) return;
      try {
        const next = await getDashboardData(user.id);
        if (mounted) {
          setData(next);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load profile data");
        }
      }
    }

    void init();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  if (error) {
    return (
      <main className="ml-60 px-8 py-12">
        <div style={{ color: colors.coral }}>{error}</div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="ml-60 px-8 py-12">
        <div style={{ color: colors.textMuted }}>Loading profile...</div>
      </main>
    );
  }

  const financial = data.profile.financial_context as Record<string, number>;
  const riskProfile = data.profile.risk_profile as Record<string, string>;

  return (
    <main className="ml-60 px-8 py-12">
      <div className="mx-auto max-w-[720px]">
        <h1 className="mb-8 text-4xl" style={{ color: colors.text, fontFamily: typography.serif }}>
          Profile
        </h1>

        <section className="mb-6 p-6" style={{ borderRadius: radii.lg, border: `1px solid ${colors.border}`, backgroundColor: colors.cardBg }}>
          <h2 className="mb-4 text-lg" style={{ color: colors.text }}>About me</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><div style={{ color: colors.textMuted }}>Name</div><div style={{ color: colors.text }}>{data.profile.name}</div></div>
            <div><div style={{ color: colors.textMuted }}>Age</div><div style={{ color: colors.text }}>{data.profile.age}</div></div>
            <div><div style={{ color: colors.textMuted }}>Occupation</div><div style={{ color: colors.text }}>{data.profile.occupation}</div></div>
            <div><div style={{ color: colors.textMuted }}>Location</div><div style={{ color: colors.text }}>{data.profile.location}</div></div>
          </div>
        </section>

        <section className="mb-6 p-6" style={{ borderRadius: radii.lg, border: `1px solid ${colors.border}`, backgroundColor: colors.cardBg }}>
          <h2 className="mb-4 text-lg" style={{ color: colors.text }}>Financial snapshot</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span style={{ color: colors.textMuted }}>Annual income</span><span style={{ color: colors.text }}>{toCurrency(Number(financial.annual_income ?? 0))}</span></div>
            <div className="flex justify-between"><span style={{ color: colors.textMuted }}>Monthly savings</span><span style={{ color: colors.text }}>{toCurrency(Number(financial.monthly_savings_capacity ?? 0))}</span></div>
            <div className="flex justify-between"><span style={{ color: colors.textMuted }}>Dependents</span><span style={{ color: colors.text }}>{Number(financial.dependents ?? 0)}</span></div>
            <div className="flex justify-between"><span style={{ color: colors.textMuted }}>Emergency fund months</span><span style={{ color: colors.text }}>{Number(financial.emergency_fund_months ?? 0)}</span></div>
          </div>
        </section>

        <section className="mb-6 p-6" style={{ borderRadius: radii.lg, border: `1px solid ${colors.border}`, backgroundColor: colors.cardBg }}>
          <h2 className="mb-4 text-lg" style={{ color: colors.text }}>Goals</h2>
          <div className="space-y-4">
            {data.goals.map((goal) => {
              const pct = Math.max(0, Math.min(100, (goal.current_progress / goal.target_amount) * 100));
              return (
                <article key={goal.id}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span style={{ color: colors.text }}>{goal.name}</span>
                    <span style={{ color: colors.textMuted }}>{toCurrency(goal.current_progress)} / {toCurrency(goal.target_amount)}</span>
                  </div>
                  <div className="h-2 overflow-hidden" style={{ borderRadius: radii.pill, backgroundColor: colors.backgroundPanic }}>
                    <div className="h-full" style={{ width: `${pct}%`, backgroundColor: colors.accent }} />
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="p-6" style={{ borderRadius: radii.lg, border: `1px solid ${colors.border}`, backgroundColor: colors.cardBg }}>
          <h2 className="mb-2 text-lg" style={{ color: colors.text }}>Risk profile summary</h2>
          <p className="text-sm" style={{ color: colors.textMuted }}>
            You&apos;re a {riskProfile.persona_label ?? "Balanced"} investor with {riskProfile.risk_tolerance ?? "medium"} risk tolerance.
          </p>
        </section>
      </div>
    </main>
  );
}

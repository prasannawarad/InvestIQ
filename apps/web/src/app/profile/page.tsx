"use client";

import { useEffect, useState } from "react";
import { loadDemoData } from "@investiq/data";
import { colors, radii, typography } from "@investiq/ui/tokens";

function toCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof loadDemoData>>["userProfile"] | null>(null);

  useEffect(() => {
    let mounted = true;
    loadDemoData().then((data) => {
      if (mounted) setProfile(data.userProfile);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!profile) {
    return (
      <main className="ml-60 px-8 py-12">
        <div style={{ color: colors.textMuted }}>Loading profile...</div>
      </main>
    );
  }

  return (
    <main className="ml-60 px-8 py-12">
      <div className="mx-auto max-w-[720px]">
        <h1 className="mb-8 text-4xl" style={{ color: colors.text, fontFamily: typography.serif }}>
          Profile
        </h1>

        <section className="mb-6 p-6" style={{ borderRadius: radii.lg, border: `1px solid ${colors.border}`, backgroundColor: colors.cardBg }}>
          <h2 className="mb-4 text-lg" style={{ color: colors.text }}>About me</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><div style={{ color: colors.textMuted }}>Name</div><div style={{ color: colors.text }}>{profile.identity.name}</div></div>
            <div><div style={{ color: colors.textMuted }}>Age</div><div style={{ color: colors.text }}>{profile.identity.age}</div></div>
            <div><div style={{ color: colors.textMuted }}>Occupation</div><div style={{ color: colors.text }}>{profile.identity.occupation}</div></div>
            <div><div style={{ color: colors.textMuted }}>Location</div><div style={{ color: colors.text }}>{profile.identity.location}</div></div>
          </div>
        </section>

        <section className="mb-6 p-6" style={{ borderRadius: radii.lg, border: `1px solid ${colors.border}`, backgroundColor: colors.cardBg }}>
          <h2 className="mb-4 text-lg" style={{ color: colors.text }}>Financial snapshot</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span style={{ color: colors.textMuted }}>Annual income</span><span style={{ color: colors.text }}>{toCurrency(profile.financial_context.annual_income)}</span></div>
            <div className="flex justify-between"><span style={{ color: colors.textMuted }}>Monthly savings</span><span style={{ color: colors.text }}>{toCurrency(profile.financial_context.monthly_savings_capacity)}</span></div>
            <div className="flex justify-between"><span style={{ color: colors.textMuted }}>Dependents</span><span style={{ color: colors.text }}>{profile.financial_context.dependents}</span></div>
            <div className="flex justify-between"><span style={{ color: colors.textMuted }}>Emergency fund months</span><span style={{ color: colors.text }}>{profile.financial_context.emergency_fund_months}</span></div>
          </div>
        </section>

        <section className="mb-6 p-6" style={{ borderRadius: radii.lg, border: `1px solid ${colors.border}`, backgroundColor: colors.cardBg }}>
          <h2 className="mb-4 text-lg" style={{ color: colors.text }}>Goals</h2>
          <div className="space-y-4">
            {profile.goals.map((goal) => {
              const pct = Math.max(0, Math.min(100, (goal.current_progress / goal.target_amount) * 100));
              return (
                <article key={goal.goal_id}>
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
            You&apos;re a {profile.risk_profile.persona_label} investor with {profile.risk_profile.risk_tolerance} risk tolerance.
          </p>
        </section>
      </div>
    </main>
  );
}

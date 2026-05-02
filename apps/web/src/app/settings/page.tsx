"use client";

import { useEffect, useState } from "react";
import { colors, radii, typography } from "@investiq/ui/tokens";
import { investiqFieldStyle } from "../../lib/investiqUi";
import { InvestiqButton } from "../components/investiq/InvestiqButton";
import { useAuth } from "../components/auth/AuthProvider";
import { getDashboardData } from "../../lib/supabaseData";

const toneOptions = ["Friendly and simple", "Direct and concise", "Detailed with explanations"] as const;
const frequencyOptions = ["Daily", "Weekly", "Only when something matters"] as const;

function mapTone(value?: string): (typeof toneOptions)[number] {
  if (value === "friendly_simple") return "Friendly and simple";
  if (value === "direct_concise") return "Direct and concise";
  if (value === "detailed_explanations") return "Detailed with explanations";
  return "Friendly and simple";
}

function mapFrequency(value?: string): (typeof frequencyOptions)[number] {
  if (value === "daily") return "Daily";
  if (value === "only_when_matter") return "Only when something matters";
  if (value === "weekly") return "Weekly";
  return "Weekly";
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [tone, setTone] = useState<(typeof toneOptions)[number]>("Friendly and simple");
  const [notifications, setNotifications] = useState<(typeof frequencyOptions)[number]>("Weekly");
  const [risk, setRisk] = useState(5);
  const [voice, setVoice] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function init() {
      if (!user?.id) return;
      const data = await getDashboardData(user.id);
      const prefs = data.profile.preferences as Record<string, string>;
      const riskProfile = data.profile.risk_profile as Record<string, number>;
      if (!mounted) return;
      setTone(mapTone(prefs.communication_tone));
      setNotifications(mapFrequency(prefs.notification_frequency));
      setRisk(Math.max(1, Math.min(10, Number(riskProfile.risk_score ?? 5))));
      setVoice(true);
    }

    void init();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  return (
    <main className="ml-60 px-8 py-12">
      <div className="mx-auto max-w-[720px]">
        <h1 className="mb-8 text-4xl" style={{ color: colors.text, fontFamily: typography.serif }}>
          Settings
        </h1>

        <div className="space-y-8">
          <section>
            <h2 className="mb-4 text-lg" style={{ color: colors.text }}>
              Communication tone
            </h2>
            <div className="space-y-3">
              {toneOptions.map((option) => (
                <label
                  key={option}
                  className="block p-4"
                  style={{
                    borderRadius: radii.lg,
                    border: `2px solid ${tone === option ? colors.accent : colors.border}`,
                    backgroundColor: tone === option ? `${colors.accent}14` : colors.cardBg,
                  }}
                >
                  <input type="radio" name="tone" checked={tone === option} onChange={() => setTone(option)} className="mr-2" />
                  <span style={{ color: colors.text }}>{option}</span>
                </label>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-lg" style={{ color: colors.text }}>
              Notification frequency
            </h2>
            <div className="space-y-3">
              {frequencyOptions.map((option) => (
                <label
                  key={option}
                  className="block p-4"
                  style={{
                    borderRadius: radii.lg,
                    border: `2px solid ${notifications === option ? colors.accent : colors.border}`,
                    backgroundColor: notifications === option ? `${colors.accent}14` : colors.cardBg,
                  }}
                >
                  <input
                    type="radio"
                    name="notifications"
                    checked={notifications === option}
                    onChange={() => setNotifications(option)}
                    className="mr-2"
                  />
                  <span style={{ color: colors.text }}>{option}</span>
                </label>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-lg" style={{ color: colors.text }}>
              Risk profile
            </h2>
            <div className="p-6" style={{ borderRadius: radii.lg, border: `1px solid ${colors.border}`, backgroundColor: colors.cardBg }}>
              <input
                type="range"
                min="1"
                max="10"
                value={risk}
                onChange={(event) => setRisk(Number(event.target.value))}
                className="investiq-range w-full"
              />
              <div className="mt-3 text-sm" style={{ color: colors.textMuted }}>
                {risk <= 3 ? "Cautious" : risk <= 7 ? "Balanced" : "Growth-focused"} ({risk}/10)
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-lg" style={{ color: colors.text }}>
              Voice
            </h2>
            <div className="flex items-center justify-between p-6" style={{ borderRadius: radii.lg, border: `1px solid ${colors.border}`, backgroundColor: colors.cardBg }}>
              <div>
                <div style={{ color: colors.text }}>Let Kuber speak out loud</div>
                <div className="text-sm" style={{ color: colors.textMuted }}>Voice preview available for demo.</div>
              </div>
              <input type="checkbox" checked={voice} onChange={(event) => setVoice(event.target.checked)} />
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-lg" style={{ color: colors.text }}>
              Currency
            </h2>
            <select
              disabled
              className="text-sm opacity-90"
              style={{ ...investiqFieldStyle(), color: colors.textMuted }}
            >
              <option>USD ($) - Locked for demo</option>
            </select>
          </section>

          <InvestiqButton type="button" variant="primary" fullWidth>
            Save
          </InvestiqButton>
        </div>
      </div>
    </main>
  );
}

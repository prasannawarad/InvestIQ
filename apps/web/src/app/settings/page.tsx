"use client";

import { useState } from "react";
import { colors, radii, typography } from "@investiq/ui/tokens";

export default function SettingsPage() {
  const [tone, setTone] = useState("Friendly and simple");
  const [notifications, setNotifications] = useState("Weekly");
  const [risk, setRisk] = useState(5);
  const [voice, setVoice] = useState(true);

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
              {["Friendly and simple", "Direct and concise", "Detailed with explanations"].map((option) => (
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
              {["Daily", "Weekly", "Only when something matters"].map((option) => (
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
                className="w-full"
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
              className="w-full px-4 py-3 text-sm"
              style={{ borderRadius: radii.md, border: `1px solid ${colors.border}`, backgroundColor: colors.backgroundPanic, color: colors.textMuted }}
            >
              <option>USD ($) - Locked for demo</option>
            </select>
          </section>

          <button
            type="button"
            className="w-full py-3 text-sm"
            style={{ borderRadius: radii.md, color: colors.cardBg, backgroundColor: colors.accent }}
          >
            Save
          </button>
        </div>
      </div>
    </main>
  );
}

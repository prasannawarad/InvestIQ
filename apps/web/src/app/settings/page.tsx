"use client";

import { colors, radii, typography } from "@investiq/ui/tokens";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import type { JsonRecord } from "../../lib/supabaseData";
import { getDashboardData } from "../../lib/supabaseData";
import { investiqFieldStyle } from "../../lib/investiqUi";
import { useAuth } from "../components/auth/AuthProvider";
import { InvestiqButton } from "../components/investiq/InvestiqButton";

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

function toneToApi(tone: (typeof toneOptions)[number]): string {
  if (tone === "Friendly and simple") return "friendly_simple";
  if (tone === "Direct and concise") return "direct_concise";
  return "detailed_explanations";
}

function freqToApi(freq: (typeof frequencyOptions)[number]): string {
  if (freq === "Daily") return "daily";
  if (freq === "Weekly") return "weekly";
  return "only_when_matter";
}

function explanationDepthForTone(apiTone: string): string {
  if (apiTone === "friendly_simple") return "beginner";
  if (apiTone === "direct_concise") return "intermediate";
  return "advanced";
}

function deriveRiskBands(score: number): {
  persona: string;
  persona_label: string;
  capacity: "low" | "medium" | "high";
  tolerance: "low" | "medium" | "high";
} {
  const s = Math.max(1, Math.min(10, score));
  if (s <= 3)
    return { persona: "cautious", persona_label: "Cautious", capacity: "low", tolerance: "low" };
  if (s <= 7)
    return { persona: "balanced", persona_label: "Balanced", capacity: "medium", tolerance: "medium" };
  return { persona: "growth", persona_label: "Growth-focused", capacity: "high", tolerance: "high" };
}

function prefsVoiceFromDb(prefs: JsonRecord): boolean {
  const v = prefs.kuber_voice_enabled;
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v !== "false" && v !== "0";
  return true;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const baselinePreferences = useRef<JsonRecord>({});
  const baselineRisk = useRef<JsonRecord>({});

  const [tone, setTone] = useState<(typeof toneOptions)[number]>("Friendly and simple");
  const [notifications, setNotifications] = useState<(typeof frequencyOptions)[number]>("Weekly");
  const [risk, setRisk] = useState(5);
  const [voice, setVoice] = useState(true);
  const [saving, setSaving] = useState(false);
  /** Last auth user whose settings we synced from Supabase — handles sign-in/sign-out swaps. */
  const loadedForUserRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    let mounted = true;

    async function syncFromDashboard(uid: string) {
      // Reset local UI when switching users so we never flash stale risk/tone briefly.
      if (loadedForUserRef.current !== undefined && loadedForUserRef.current !== uid) {
        setTone("Friendly and simple");
        setNotifications("Weekly");
        setRisk(5);
        setVoice(true);
      }

      baselinePreferences.current = {};
      baselineRisk.current = {};

      const data = await getDashboardData(supabase, uid);
      const prefs = (data.profile.preferences ?? {}) as JsonRecord;
      const riskProfile = (data.profile.risk_profile ?? {}) as JsonRecord;
      baselinePreferences.current = { ...prefs };
      baselineRisk.current = { ...riskProfile };

      if (!mounted) return;
      loadedForUserRef.current = uid;

      setTone(mapTone(typeof prefs.communication_tone === "string" ? prefs.communication_tone : undefined));
      setNotifications(mapFrequency(typeof prefs.notification_frequency === "string" ? prefs.notification_frequency : undefined));
      setRisk(Math.max(1, Math.min(10, Number(riskProfile.risk_score ?? 5))));
      setVoice(prefsVoiceFromDb(prefs));
    }

    async function run() {
      if (!user?.id) {
        loadedForUserRef.current = undefined;
        setTone("Friendly and simple");
        setNotifications("Weekly");
        setRisk(5);
        setVoice(true);
        return;
      }
      await syncFromDashboard(user.id);
    }

    void run().catch(() => {
      toast.error("Could not load settings.");
    });

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  async function handleSave() {
    const uid = user?.id;
    if (!uid) {
      toast.error("Sign in to save settings.");
      return;
    }
    setSaving(true);
    try {
      const toneApi = toneToApi(tone);
      const prefs: JsonRecord = {
        ...baselinePreferences.current,
        communication_tone: toneApi,
        explanation_depth: explanationDepthForTone(toneApi),
        notification_frequency: freqToApi(notifications),
        kuber_voice_enabled: voice,
      };
      const bands = deriveRiskBands(risk);
      const risk_payload: JsonRecord = {
        ...baselineRisk.current,
        risk_score: risk,
        persona: bands.persona,
        persona_label: bands.persona_label,
        risk_capacity: bands.capacity,
        risk_tolerance: bands.tolerance,
      };

      const { error } = await supabase.from("profiles").update({ preferences: prefs, risk_profile: risk_payload }).eq("id", uid);

      if (error) {
        toast.error(error.message);
        return;
      }

      baselinePreferences.current = prefs;
      baselineRisk.current = risk_payload;
      toast.success("Settings saved.", { description: "Kuber picks up tone and risk on your next message." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="px-4 py-10 sm:px-6 md:ml-60 md:px-8 md:py-12">
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
                <div className="text-sm" style={{ color: colors.textMuted }}>Stored with your Supabase profile for this demo.</div>
              </div>
              <input type="checkbox" checked={voice} onChange={(event) => setVoice(event.target.checked)} />
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-lg" style={{ color: colors.text }}>
              Currency
            </h2>
            <select disabled className="text-sm opacity-90" style={{ ...investiqFieldStyle(), color: colors.textMuted }}>
              <option>USD ($) - Locked for demo</option>
            </select>
          </section>

          <InvestiqButton type="button" variant="primary" fullWidth disabled={!user?.id || saving} onClick={() => void handleSave()}>
            {saving ? "Saving…" : "Save"}
          </InvestiqButton>
          {!user?.id ? <p className="text-center text-sm" style={{ color: colors.textMuted }}>Sign in to persist settings.</p> : null}
        </div>
      </div>
    </main>
  );
}

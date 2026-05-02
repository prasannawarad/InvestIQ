import Link from "next/link";
import { colors, radii, typography } from "@investiq/ui/tokens";

export default function ExtensionPage() {
  return (
    <main className="ml-60 px-8 py-12">
      <div className="mx-auto max-w-[980px]">
        <Link href="/home" className="text-sm" style={{ color: colors.textMuted }}>
          ← Back to Home
        </Link>

        <h1 className="mt-6 text-6xl" style={{ color: colors.text, fontFamily: typography.serif }}>
          Chrome Extension
        </h1>
        <p className="mt-4 text-lg" style={{ color: colors.textMuted }}>
          Kuber follows you across the web to answer money questions in context.
        </p>

        <div className="mt-10 grid grid-cols-3 gap-3">
          {["Apple.com Demo", "CNBC Article Demo", "Gmail Demo"].map((tab, idx) => (
            <div
              key={tab}
              className="px-4 py-3 text-sm"
              style={{
                borderRadius: radii.md,
                border: `1px solid ${idx === 1 ? colors.accent : colors.border}`,
                backgroundColor: idx === 1 ? `${colors.accent}14` : colors.cardBg,
                color: colors.text,
              }}
            >
              {tab}
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-6">
          <div className="h-[320px]" style={{ borderRadius: radii.lg, backgroundColor: colors.cardBg, border: `1px solid ${colors.border}` }} />
          <div className="h-[320px]" style={{ borderRadius: radii.lg, backgroundColor: colors.cardBg, border: `1px solid ${colors.border}` }} />
        </div>

        <button
          type="button"
          className="mt-8 px-6 py-3 text-sm"
          style={{ borderRadius: radii.md, backgroundColor: colors.accent, color: colors.cardBg }}
        >
          Install for Chrome
        </button>
      </div>
    </main>
  );
}

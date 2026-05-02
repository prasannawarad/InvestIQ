import Link from "next/link";
import { colors, radii, typography } from "@investiq/ui/tokens";

export default function PanicPage() {
  return (
    <main className="fixed inset-0 z-50" style={{ backgroundColor: colors.backgroundPanic }}>
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Link href="/home" className="text-sm hover:underline" style={{ color: colors.textMuted }}>
          ← Back to Home
        </Link>

        <div className="mt-20 text-center">
          <h1 className="mb-3 text-5xl" style={{ fontFamily: typography.serif }}>
            Take a breath.
          </h1>
          <p style={{ color: colors.textMuted }}>
            Most of the time, the right thing to do is nothing.
          </p>

          <div className="mx-auto mt-10 max-w-xl space-y-4 text-left">
            <Link
              href="/home"
              className="block border p-5 hover:opacity-95"
              style={{ borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.cardBg }}
            >
              Show me what&apos;s actually happening
            </Link>
            <Link
              href="/rebalance"
              className="block border p-5 hover:opacity-95"
              style={{ borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.cardBg }}
            >
              Run a scenario
            </Link>
            <Link
              href="/rebalance?source=panic"
              className="block border p-5 hover:opacity-95"
              style={{ borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.cardBg }}
            >
              I want to do something protective
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

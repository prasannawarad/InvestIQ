import Link from "next/link";
import { colors, typography } from "@investiq/ui/tokens";
import { investiqCardStyle } from "../../lib/investiqUi";

export default function PanicPage() {
  return (
    <main className="investiq-shell fixed inset-0 z-50 min-h-screen" style={{ backgroundColor: colors.background }}>
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
              className="block p-5 text-[color:var(--investiq-text)] no-underline transition-opacity hover:opacity-95"
              style={investiqCardStyle()}
            >
              Show me what&apos;s actually happening
            </Link>
            <Link
              href="/rebalance?source=scenario"
              className="block p-5 text-[color:var(--investiq-text)] no-underline transition-opacity hover:opacity-95"
              style={investiqCardStyle()}
            >
              Run a scenario
            </Link>
            <Link
              href="/rebalance?source=panic"
              className="block p-5 text-[color:var(--investiq-text)] no-underline transition-opacity hover:opacity-95"
              style={investiqCardStyle()}
            >
              I want to do something protective
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

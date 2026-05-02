"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { colors, typography } from "@investiq/ui/tokens";
import { investiqCardStyle } from "../../../lib/investiqUi";

export default function PreviewPage() {
  const params = useParams<{ symbol: string }>();
  const symbol = String(params.symbol ?? "").toUpperCase();

  return (
    <main className="ml-60 px-8 py-12">
      <div className="mx-auto max-w-[980px]">
        <Link href="/Kuber" className="text-sm" style={{ color: colors.textMuted }}>
          ← Back to Kuber Discovery
        </Link>

        <section className="mt-6 p-8" style={investiqCardStyle()}>
          <h1 className="text-4xl" style={{ color: colors.text, fontFamily: typography.serif }}>
            Preview: {symbol}
          </h1>
          <p className="mt-3 text-sm" style={{ color: colors.textMuted }}>
            Mock preview page for discovery candidates. Full engine-backed data wiring comes later.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-4 text-sm">
            <article className="rounded-lg p-4" style={{ border: `1px solid ${colors.border}` }}>
              <div style={{ color: colors.textMuted }}>Match score</div>
              <div className="mt-1 text-2xl" style={{ color: colors.green, fontFamily: typography.serif }}>
                84%
              </div>
            </article>
            <article className="rounded-lg p-4" style={{ border: `1px solid ${colors.border}` }}>
              <div style={{ color: colors.textMuted }}>Potential role</div>
              <div className="mt-1" style={{ color: colors.text }}>
                Adds diversified exposure without pushing risk beyond balanced profile.
              </div>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}

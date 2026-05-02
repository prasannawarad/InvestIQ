"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense } from "react";
import { colors, typography } from "@investiq/ui/tokens";
import PreviewDetail from "./PreviewDetail";

function LoadingShell({ rawSymbol }: { rawSymbol: string }) {
  return (
    <main className="ml-60 px-8 py-12">
      <div className="mx-auto max-w-[1100px]">
        <Link href="/Kuber" className="text-sm" style={{ color: colors.textMuted }}>
          ← Back to discovery
        </Link>
        <p className="mt-6" style={{ color: colors.textMuted, fontFamily: typography.sans }}>
          Loading research for {decodeURIComponent(rawSymbol).toUpperCase()}…
        </p>
      </div>
    </main>
  );
}

export default function KuberPreviewPage() {
  const params = useParams<{ symbol: string }>();
  const rawSymbol = String(params.symbol ?? "");

  return (
    <Suspense fallback={<LoadingShell rawSymbol={rawSymbol} />}>
      <PreviewDetail symbol={decodeURIComponent(rawSymbol)} />
    </Suspense>
  );
}

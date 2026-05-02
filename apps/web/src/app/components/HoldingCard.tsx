"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { colors, typography } from "@investiq/ui/tokens";
import { investiqCardStyle } from "../../lib/investiqUi";

interface HoldingCardProps {
  id: string;
  name: string;
  type: string;
  value: string;
  fitScore: number;
  logo: string;
  percentage: string;
}

export function HoldingCard({ id, name, type, value, fitScore, logo, percentage }: HoldingCardProps) {
  const fitColor = fitScore >= 80 ? colors.green : fitScore >= 60 ? colors.amber : colors.coral;
  const cardSurface = investiqCardStyle();
  const needsAttention = fitScore < 80;

  return (
    <Link
      href={`/current/${id}`}
      className="group block p-6 text-[color:var(--investiq-text)] no-underline transition-[transform,filter,box-shadow] duration-200 hover:brightness-[1.02] hover:drop-shadow-[0_18px_40px_rgba(0,0,0,0.35)] active:scale-[0.997]"
      style={{
        ...cardSurface,
        borderColor: needsAttention ? `color-mix(in srgb, ${fitColor} 38%, ${colors.cardBorder})` : (cardSurface.border as string).replace("1px solid ", ""),
        boxShadow: needsAttention
          ? `inset 0 1px 0 rgba(255,255,255,0.045), inset 0 -1px 0 rgba(0,0,0,0.35), 0 18px 46px rgba(0,0,0,0.42), 0 0 0 1px color-mix(in srgb, ${fitColor} 26%, transparent), 0 0 34px color-mix(in srgb, ${fitColor} 18%, transparent)`
          : cardSurface.boxShadow,
      }}
    >
      <div className="mb-4 flex items-start justify-between">
        <div className="min-w-0 flex items-start gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full text-sm"
            style={{ backgroundColor: colors.surfaceElevated, color: colors.text }}
          >
            {logo}
          </div>
          <div className="min-w-0">
            <div className="mb-1 truncate" title={name} style={{ color: colors.text }}>
              {name}
            </div>
            <div className="truncate text-sm" title={type} style={{ color: colors.textMuted }}>
              {type}
            </div>
          </div>
        </div>
        <div
          className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold tracking-wide"
          style={{
            backgroundColor: `color-mix(in srgb, ${fitColor} 18%, ${colors.surface})`,
            border: `1px solid color-mix(in srgb, ${fitColor} 30%, ${colors.border})`,
            color: fitColor,
          }}
        >
          {fitScore}% fit
        </div>
      </div>

      <div className="mb-3">
        <div className="text-2xl" style={{ fontFamily: typography.serif, color: colors.text }}>
          {value}
        </div>
        <div className="mt-1 text-sm" style={{ color: colors.textMuted }}>
          {percentage} of portfolio
        </div>
      </div>

      <button
        type="button"
        className="flex items-center gap-1 text-sm underline-offset-4 hover:underline"
        style={{ color: colors.accent }}
        onClick={(event) => {
          event.preventDefault();
          window.dispatchEvent(
            new CustomEvent("investiq:open-kuber", {
              detail: { prompt: `Tell me about ${name}` },
            })
          );
        }}
      >
        <MessageCircle className="h-4 w-4" />
        Ask Kuber
      </button>
    </Link>
  );
}

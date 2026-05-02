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

  return (
    <Link
      href={`/current/${id}`}
      className="block p-6 text-[color:var(--investiq-text)] no-underline transition-shadow hover:brightness-[1.02]"
      style={{
        ...cardSurface,
        border: fitScore < 80 ? `2px solid ${colors.amber}` : cardSurface.border,
      }}
    >
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full text-sm"
            style={{ backgroundColor: colors.surfaceElevated, color: colors.text }}
          >
            {logo}
          </div>
          <div>
            <div className="mb-1" style={{ color: colors.text }}>
              {name}
            </div>
            <div className="text-sm" style={{ color: colors.textMuted }}>
              {type}
            </div>
          </div>
        </div>
        <div
          className="rounded-full px-3 py-1 text-sm"
          style={{
            backgroundColor: `${fitColor}22`,
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
        className="flex items-center gap-1 text-sm hover:underline"
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

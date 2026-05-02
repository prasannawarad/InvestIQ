import type { ReactNode } from "react";
import { colors, radii, shadows, typography } from "@investiq/ui/tokens";

interface StatCardProps {
  label: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: ReactNode;
}

export function StatCard({ label, value, change, changeType, icon }: StatCardProps) {
  const changeColor =
    changeType === "positive"
      ? colors.green
      : changeType === "negative"
        ? colors.coral
        : colors.textMuted;

  return (
    <div
      className="p-6"
      style={{ borderRadius: radii.xl, boxShadow: shadows.card, backgroundColor: colors.cardBg }}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="mb-1 text-sm" style={{ color: colors.textMuted }}>
            {label}
          </div>
          <div className="text-3xl" style={{ fontFamily: typography.serif, color: colors.text }}>
            {value}
          </div>
          {change ? (
            <div className="mt-1 text-sm" style={{ color: changeColor }}>
              {change}
            </div>
          ) : null}
        </div>
        {icon ? <div style={{ color: colors.accent }}>{icon}</div> : null}
      </div>
    </div>
  );
}

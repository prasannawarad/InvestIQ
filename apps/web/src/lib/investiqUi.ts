import type { CSSProperties } from "react";
import { colors, radii, typography } from "@investiq/ui/tokens";

export type InvestiqButtonVariant = "primary" | "secondary" | "ghost" | "coral" | "dangerGhost";

const sizePad: Record<"sm" | "md" | "lg", { py: string; px: string; font: string }> = {
  sm: { py: "6px", px: "12px", font: "13px" },
  md: { py: "10px", px: "18px", font: "14px" },
  lg: { py: "12px", px: "22px", font: "15px" },
};

export function investiqButtonStyle(
  variant: InvestiqButtonVariant,
  options: { size?: "sm" | "md" | "lg"; fullWidth?: boolean } = {}
): CSSProperties {
  const { size = "md", fullWidth = false } = options;
  const s = sizePad[size];
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    borderRadius: radii.md,
    padding: `${s.py} ${s.px}`,
    fontSize: s.font,
    fontWeight: 600,
    fontFamily: typography.sans,
    border: "1px solid transparent",
    cursor: "pointer",
    width: fullWidth ? "100%" : undefined,
    boxSizing: "border-box",
    transition: "filter 120ms ease, transform 120ms ease, box-shadow 120ms ease, background-color 120ms ease",
  };

  switch (variant) {
    case "primary":
      return {
        ...base,
        backgroundColor: colors.accent,
        color: colors.onAccent,
        boxShadow: "0 4px 22px rgba(45,212,191,0.22)",
        borderColor: `${colors.accent}88`,
      };
    case "secondary":
      return {
        ...base,
        backgroundColor: colors.surfaceElevated,
        color: colors.text,
        borderColor: colors.border,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
      };
    case "ghost":
      return {
        ...base,
        backgroundColor: "transparent",
        color: colors.textMuted,
        borderColor: "transparent",
      };
    case "coral":
      return {
        ...base,
        backgroundColor: colors.coral,
        color: "#1a0503",
        borderColor: `${colors.coral}aa`,
        boxShadow: "0 4px 22px rgba(240,128,120,0.22)",
      };
    case "dangerGhost":
      return {
        ...base,
        backgroundColor: "transparent",
        color: colors.coral,
        borderColor: `${colors.coral}44`,
      };
    default:
      return base;
  }
}

export function investiqOutlineCtaStyle(size: "sm" | "md" | "lg" = "md"): CSSProperties {
  const s = sizePad[size];
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
    padding: `${s.py} ${s.px}`,
    fontSize: s.font,
    fontWeight: 600,
    border: `1px solid ${colors.accent}`,
    color: colors.accent,
    backgroundColor: "transparent",
    textDecoration: "none",
    cursor: "pointer",
    transition: "background-color 120ms ease, color 120ms ease",
  };
}

export function investiqFieldStyle(): CSSProperties {
  return {
    width: "100%",
    padding: "12px 16px",
    fontSize: "14px",
    borderRadius: radii.md,
    border: `1px solid ${colors.border}`,
    backgroundColor: colors.inputBg,
    color: colors.text,
    outline: "none",
    boxSizing: "border-box",
  };
}

export function investiqFilterChipStyle(active: boolean): CSSProperties {
  return {
    borderRadius: radii.pill,
    padding: "8px 18px",
    fontSize: "13px",
    fontWeight: 600,
    border: active ? `1px solid ${colors.accent}77` : `1px solid ${colors.border}`,
    backgroundColor: active ? `${colors.accent}26` : colors.surface,
    color: active ? colors.accent : colors.textMuted,
    cursor: "pointer",
    transition: "background-color 120ms ease, color 120ms ease, border-color 120ms ease",
  };
}

/** Larger segmented control chips (rebalance modes, periods). */
export function investiqTabStyle(active: boolean): CSSProperties {
  return {
    ...investiqFilterChipStyle(active),
    padding: "10px 22px",
    fontSize: "14px",
    fontWeight: 600,
  };
}

export function investiqCardStyle(): CSSProperties {
  return {
    borderRadius: radii.xl,
    backgroundColor: colors.cardBg,
    border: `1px solid ${colors.cardBorder}`,
    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.03), 0 20px 50px rgba(0,0,0,0.35)`,
  };
}

/** Muted control on an accent-colored bar (e.g. Kuber running header). */
export function investiqOnAccentToolbarStyle(): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    borderRadius: radii.md,
    padding: "8px 16px",
    fontSize: "14px",
    fontWeight: 600,
    fontFamily: typography.sans,
    backgroundColor: "rgba(3, 16, 22, 0.22)",
    color: colors.onAccent,
    border: "1px solid rgba(3, 16, 22, 0.28)",
    cursor: "pointer",
    boxSizing: "border-box",
  };
}

/** Solid CTA on accent bar — light fill, accent label. */
export function investiqOnAccentSolidCtaStyle(): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    borderRadius: radii.md,
    padding: "8px 16px",
    fontSize: "14px",
    fontWeight: 600,
    fontFamily: typography.sans,
    backgroundColor: colors.onAccent,
    color: colors.accent,
    border: `1px solid rgba(3, 16, 22, 0.2)`,
    cursor: "pointer",
    boxSizing: "border-box",
  };
}

// Design tokens for InvestIQ. Imported by web app and extension.
// Person 1 owns this file.

export const colors = {
  // Default palette
  background: "#FAF8F5",
  backgroundPanic: "#F5F2EC", // /panic only
  text: "#1A2438",
  textMuted: "#6B7B8C",

  // Accents
  accent: "#3D7A6F", // muted teal — primary CTAs, Kuber
  coral: "#E8836B", // warm coral — "I'm freaking out" button only
  green: "#7BA888", // soft green — healthy / positive
  amber: "#D4A574", // soft amber — caution

  // Neutrals
  border: "#E8E4DC",
  cardBg: "#FFFFFF",
  cardBorder: "#EFEBE3",
} as const;

export const typography = {
  serif: '"DM Serif Display", Georgia, serif',
  sans: 'Inter, -apple-system, system-ui, sans-serif',

  sizes: {
    hero: "48px",
    h1: "36px",
    h2: "24px",
    body: "16px",
    small: "14px",
    tiny: "12px",
  },
} as const;

export const spacing = {
  xs: "4px",
  sm: "8px",
  md: "16px",
  lg: "24px",
  xl: "32px",
  xxl: "48px",
} as const;

export const radii = {
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "24px",
  pill: "9999px",
} as const;

export const shadows = {
  card: "0 1px 3px rgba(26, 36, 56, 0.06), 0 1px 2px rgba(26, 36, 56, 0.04)",
  popover: "0 8px 24px rgba(26, 36, 56, 0.12)",
  floatingButton: "0 4px 12px rgba(26, 36, 56, 0.15)",
} as const;

// Semantic helpers — use these instead of hardcoding fit-score thresholds
export function fitScoreColor(score: number): string {
  if (score >= 80) return colors.green;
  if (score >= 60) return colors.amber;
  return colors.coral;
}

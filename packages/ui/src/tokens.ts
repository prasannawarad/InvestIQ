// Design tokens — dark-first unified system (defaults for web + extension).
// Keep surfaces cool-teal tinted; accents stay one family for cohesiveness.

export const colors = {
  background: "#06090f",
  backgroundPanic: "#080c13",
  /** Sidebar, sticky bars, recessed strips */
  surface: "#0b1018",
  surfaceElevated: "#101827",
  text: "#e8eef6",
  textMuted: "#7c8da3",

  accent: "#2dd4bf",
  accentMuted: "#1a9e8f",

  coral: "#f08078",
  green: "#4ade93",
  amber: "#e8bd5c",

  border: "#1e2d3f",
  borderSubtle: "#141e2d",

  cardBg: "#0a1119",
  cardBorder: "#1a2840",

  /** Inputs, nested wells */
  inputBg: "#060a10",
  /** Text/icons on accent-filled CTAs */
  onAccent: "#031016",
  /** Modal scrims */
  overlay: "rgba(5, 8, 14, 0.72)",
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
  card: "inset 0 1px 0 rgba(255,255,255,0.04), 0 12px 40px rgba(0,0,0,0.45)",
  popover: "0 28px 90px rgba(0,0,0,0.55)",
  floatingButton: "0 10px 36px rgba(45,212,191,0.28)",
} as const;

export function fitScoreColor(score: number): string {
  if (score >= 80) return colors.green;
  if (score >= 60) return colors.amber;
  return colors.coral;
}

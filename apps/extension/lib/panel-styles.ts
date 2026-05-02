import type { CSSProperties } from "react";
import { colors, radii, shadows, typography } from "@investiq/ui/tokens";

/** Matches FloatingKuber + homepage card language (elevated gradient shell, teal header band). */

export const panelStyles = {
  panel: {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    top: "auto",
    left: "auto",
    zIndex: 11,
    width: "min(calc(100vw - 28px), 26rem)",
    maxHeight: "min(520px, calc(100vh - 48px))",
    minHeight: "340px",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    borderRadius: radii.xl,
    background: `linear-gradient(165deg, ${colors.cardBg} 0%, color-mix(in srgb, ${colors.surfaceElevated} 55%, ${colors.background}) 100%)`,
    border: `1px solid ${colors.accent}33`,
    boxShadow: shadows.popover,
    fontFamily: typography.sans,
    color: colors.text,
  } as CSSProperties,

  headerAccent: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    padding: "14px 16px",
    flexShrink: 0,
    background: `linear-gradient(90deg, ${colors.accent} 0%, color-mix(in srgb, ${colors.accent} 65%, ${colors.green}) 100%)`,
    color: colors.onAccent,
    borderBottom: `1px solid color-mix(in srgb, ${colors.onAccent} 18%, transparent)`,
  } as CSSProperties,

  headerLead: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    minWidth: 0,
  } as CSSProperties,

  orb: {
    width: "40px",
    height: "40px",
    flexShrink: 0,
    display: "grid",
    placeItems: "center",
    borderRadius: radii.pill,
    fontFamily: typography.serif,
    fontSize: "17px",
    fontWeight: 600,
    background: `radial-gradient(circle at 30% 25%, ${colors.onAccent}22, transparent 55%)`,
    border: `1px solid ${colors.onAccent}44`,
    color: colors.onAccent,
  } as CSSProperties,

  headerTitles: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  } as CSSProperties,

  titleRow: {
    fontSize: "17px",
    fontWeight: 700,
    lineHeight: 1.25,
    letterSpacing: "-0.02em",
  } as CSSProperties,

  subtitleRow: {
    fontSize: "11px",
    opacity: 0.92,
    lineHeight: 1.35,
    fontWeight: 500,
  } as CSSProperties,

  closeButton: {
    width: "34px",
    height: "34px",
    flexShrink: 0,
    border: "none",
    borderRadius: radii.pill,
    backgroundColor: "rgba(3, 16, 22, 0.22)",
    color: colors.onAccent,
    cursor: "pointer",
    fontSize: "20px",
    lineHeight: 1,
    display: "grid",
    placeItems: "center",
  } as CSSProperties,

  /** Scrolls chat + cues; composer + footer sit below (avoid overlap). */
  bodyScroll: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    overscrollBehavior: "contain",
    WebkitOverflowScrolling: "touch",
    padding: "12px 16px 14px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  } as CSSProperties,

  composerBlock: {
    flexShrink: 0,
    padding: "12px 16px 14px",
    paddingTop: "10px",
    borderTop: `1px solid ${colors.border}`,
    backgroundColor: colors.background,
  } as CSSProperties,

  contextStrip: {
    padding: "10px 12px",
    borderRadius: radii.md,
    border: `1px solid ${colors.border}`,
    backgroundColor: colors.background,
  } as CSSProperties,

  contextMeta: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    marginBottom: "4px",
  } as CSSProperties,

  contextLabel: {
    color: colors.textMuted,
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    fontWeight: 600,
  } as CSSProperties,

  demoBadge: {
    padding: "2px 8px",
    borderRadius: radii.pill,
    background: colors.accent,
    color: colors.onAccent,
    fontSize: "11px",
    fontWeight: 700,
    lineHeight: 1.35,
  } as CSSProperties,

  contextualBadge: {
    padding: "2px 8px",
    borderRadius: radii.pill,
    backgroundColor: `${colors.accent}20`,
    color: colors.accent,
    border: `1px solid ${colors.accent}44`,
    fontSize: "11px",
    fontWeight: 700,
    lineHeight: 1.35,
  } as CSSProperties,

  contextTitle: {
    color: colors.text,
    fontSize: "14px",
    lineHeight: 1.38,
    fontWeight: 600,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  } as CSSProperties,

  messages: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    paddingRight: "2px",
    minWidth: 0,
  } as CSSProperties,

  messageRowRight: {
    display: "flex",
    justifyContent: "flex-end",
  } as CSSProperties,

  messageRowLeft: {
    display: "flex",
    justifyContent: "flex-start",
  } as CSSProperties,

  bubbleUser: {
    maxWidth: "88%",
    borderRadius: "18px",
    padding: "10px 14px",
    fontSize: "14px",
    lineHeight: "22px",
    backgroundColor: colors.accent,
    color: colors.onAccent,
    boxSizing: "border-box",
  } as CSSProperties,

  bubbleKuber: {
    maxWidth: "88%",
    borderRadius: "18px",
    padding: "10px 14px",
    fontSize: "14px",
    lineHeight: "22px",
    backgroundColor: colors.surface,
    color: colors.text,
    border: `1px solid ${colors.border}`,
    boxSizing: "border-box",
  } as CSSProperties,

  kuberBubbleFooter: {
    display: "flex",
    justifyContent: "flex-start",
    marginTop: "6px",
  } as CSSProperties,

  speakBtn: {
    borderRadius: radii.md,
    border: `1px solid ${colors.border}`,
    backgroundColor: `${colors.surfaceElevated}`,
    color: colors.accent,
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 600,
    padding: "5px 10px",
  } as CSSProperties,

  cueSection: {
    flexShrink: 0,
    paddingTop: "2px",
    borderTop: `1px solid ${colors.border}`,
    marginLeft: "-2px",
    marginRight: "-2px",
    paddingLeft: "2px",
    paddingRight: "2px",
    paddingBottom: "4px",
  } as CSSProperties,

  cueGroup: {
    marginBottom: "8px",
  } as CSSProperties,

  cueGroupLabel: {
    marginBottom: "6px",
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    fontWeight: 600,
    color: colors.textMuted,
  } as CSSProperties,

  cueChipWrap: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
  } as CSSProperties,

  cueChip: {
    borderRadius: radii.pill,
    padding: "6px 11px",
    fontSize: "12px",
    fontWeight: 600,
    border: `1px solid ${colors.border}`,
    backgroundColor: colors.surface,
    color: colors.text,
    cursor: "pointer",
    fontFamily: typography.sans,
    textAlign: "left",
    transition: "filter 110ms ease, transform 110ms ease",
  } as CSSProperties,

  actions: {
    display: "flex",
    gap: "8px",
    flexShrink: 0,
    paddingTop: "4px",
  } as CSSProperties,

  primaryButton: {
    flex: 1,
    minHeight: "40px",
    border: "none",
    borderRadius: radii.pill,
    background: colors.accent,
    color: colors.onAccent,
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 700,
    fontFamily: typography.sans,
  } as CSSProperties,

  secondaryButton: {
    flex: 1,
    minHeight: "40px",
    border: `1px solid ${colors.border}`,
    borderRadius: radii.pill,
    background: "transparent",
    color: colors.text,
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 700,
    fontFamily: typography.sans,
  } as CSSProperties,

  askForm: {
    display: "grid",
    gridTemplateColumns: "1fr 48px",
    gap: "8px",
  } as CSSProperties,

  askInput: {
    minWidth: 0,
    height: "40px",
    boxSizing: "border-box",
    border: `1px solid ${colors.border}`,
    borderRadius: radii.pill,
    backgroundColor: colors.inputBg,
    color: colors.text,
    fontFamily: typography.sans,
    fontSize: "14px",
    outline: "none",
    padding: "0 14px",
  } as CSSProperties,

  sendButton: {
    height: "40px",
    border: "none",
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    color: colors.onAccent,
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 700,
    display: "grid",
    placeItems: "center",
  } as CSSProperties,

  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    padding: "10px 16px 12px",
    flexShrink: 0,
    borderTop: `1px solid ${colors.border}`,
    backgroundColor: colors.background,
    boxShadow: `0 -6px 16px rgba(0, 0, 0, 0.12)`,
  } as CSSProperties,

  footerText: {
    color: colors.textMuted,
    fontSize: "11px",
    lineHeight: 1.4,
    maxWidth: "62%",
  } as CSSProperties,

  appLink: {
    color: colors.accent,
    fontSize: "12px",
    lineHeight: 1.3,
    fontWeight: 700,
    textDecoration: "none",
    whiteSpace: "nowrap",
  } as CSSProperties,
} satisfies Record<string, CSSProperties>;

import type { PointerEvent } from "react";
import { colors, radii, shadows, typography } from "@investiq/ui/tokens";

type KuberBubbleProps = {
  onClick: () => void;
  showUnreadDot: boolean;
  bottomPx: number;
  rightPx: number;
  onPointerDownDrag: (event: PointerEvent<HTMLButtonElement>) => void;
  hiddenVisual: boolean;
};

export function KuberBubble({
  onClick,
  showUnreadDot,
  bottomPx,
  rightPx,
  onPointerDownDrag,
  hiddenVisual,
}: KuberBubbleProps) {
  const size = 56;
  if (hiddenVisual) return null;

  return (
    <button
      type="button"
      aria-label={showUnreadDot ? "Kuber — new page detected" : "Open Kuber"}
      onClick={onClick}
      onPointerDown={onPointerDownDrag}
      style={{
        position: "fixed",
        right: `${rightPx}px`,
        bottom: `${bottomPx}px`,
        zIndex: 10,
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: radii.pill,
        border: `2px solid ${colors.accent}88`,
        boxShadow: shadows.floatingButton,
        cursor: "pointer",
        pointerEvents: "auto",
        padding: 0,
        margin: 0,
        background: `linear-gradient(145deg, ${colors.accent} 12%, ${colors.green} 140%)`,
        color: colors.onAccent,
        fontFamily: typography.serif,
        fontSize: "22px",
        fontWeight: 600,
        display: "grid",
        placeItems: "center",
        touchAction: "none",
      }}
    >
      <span style={{ pointerEvents: "none", position: "relative", lineHeight: 1 }} aria-hidden>
        K
        {showUnreadDot ? (
          <span
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              width: 10,
              height: 10,
              borderRadius: radii.pill,
              background: colors.accent,
              border: `2px solid ${colors.cardBg}`,
              boxSizing: "border-box",
            }}
          />
        ) : null}
      </span>
    </button>
  );
}

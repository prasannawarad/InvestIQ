import { type PointerEvent, useEffect, useState } from "react";
import { colors, radii, shadows, typography } from "@investiq/ui/tokens";

const HINT_MESSAGES = [
  "How's your portfolio today?",
  "Ask Kuber anything →",
  "See what changed today",
] as const;

const PULSE_CSS = `
@keyframes kuber-ping {
  0%   { transform: scale(1);    opacity: 0.55; }
  28%  { transform: scale(1.88); opacity: 0;    }
  100% { transform: scale(1.88); opacity: 0;    }
}
@keyframes kuber-ping-2 {
  0%   { transform: scale(1);    opacity: 0.38; }
  28%  { transform: scale(1.88); opacity: 0;    }
  100% { transform: scale(1.88); opacity: 0;    }
}
@keyframes kuber-glow {
  0%, 65%, 100% { box-shadow: 0 10px 36px rgba(45,212,191,0.28); }
  32%            { box-shadow: 0 10px 36px rgba(45,212,191,0.58), 0 0 0 6px rgba(45,212,191,0.12); }
}
@keyframes kuber-hint-in {
  from { opacity: 0; transform: translateX(6px) scale(0.94); }
  to   { opacity: 1; transform: translateX(0) scale(1); }
}
@keyframes kuber-hint-out {
  from { opacity: 1; transform: translateX(0) scale(1); }
  to   { opacity: 0; transform: translateX(4px) scale(0.96); }
}
`;

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
  const [showHint, setShowHint] = useState(false);
  const [hintIdx, setHintIdx] = useState(0);
  const [hintFading, setHintFading] = useState(false);

  useEffect(() => {
    if (hiddenVisual) return;

    let active = true;
    const timers: ReturnType<typeof setTimeout>[] = [];

    function schedule(delay: number, fn: () => void) {
      const t = setTimeout(() => {
        if (active) fn();
      }, delay);
      timers.push(t);
    }

    function cycle(idx: number) {
      setHintIdx(idx);
      setHintFading(false);
      setShowHint(true);
      schedule(1900, () => {
        setHintFading(true);
        schedule(300, () => {
          setShowHint(false);
          setHintFading(false);
          schedule(2500, () => cycle((idx + 1) % HINT_MESSAGES.length));
        });
      });
    }

    schedule(3000, () => cycle(0));

    return () => {
      active = false;
      for (const t of timers) clearTimeout(t);
    };
  }, [hiddenVisual]);

  if (hiddenVisual) return null;

  return (
    <>
      <style>{PULSE_CSS}</style>

      {/* Pulse ring 1 */}
      <div
        style={{
          position: "fixed",
          right: `${rightPx}px`,
          bottom: `${bottomPx}px`,
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: "50%",
          border: `2px solid ${colors.accent}`,
          pointerEvents: "none",
          zIndex: 9,
          boxSizing: "border-box",
          animation: "kuber-ping 3s cubic-bezier(0.4,0,0.6,1) infinite",
        }}
      />

      {/* Pulse ring 2 — staggered */}
      <div
        style={{
          position: "fixed",
          right: `${rightPx}px`,
          bottom: `${bottomPx}px`,
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: "50%",
          border: `2px solid ${colors.accent}`,
          pointerEvents: "none",
          zIndex: 9,
          boxSizing: "border-box",
          animation: "kuber-ping-2 3s cubic-bezier(0.4,0,0.6,1) 0.3s infinite",
        }}
      />

      {/* Hint speech bubble */}
      {showHint ? (
        <div
          style={{
            position: "fixed",
            right: `${rightPx + size + 12}px`,
            bottom: `${bottomPx + size / 2 - 20}px`,
            background: colors.cardBg,
            border: `1px solid ${colors.accent}55`,
            borderRadius: radii.lg,
            padding: "10px 14px",
            fontSize: "13px",
            fontFamily: typography.sans,
            color: colors.text,
            pointerEvents: "none",
            zIndex: 10,
            whiteSpace: "nowrap",
            boxShadow: shadows.popover,
            animation: hintFading
              ? "kuber-hint-out 0.28s ease-in forwards"
              : "kuber-hint-in 0.18s ease-out forwards",
          }}
        >
          {HINT_MESSAGES[hintIdx]}
          {/* Arrow pointing right toward button */}
          <div
            style={{
              position: "absolute",
              right: "-6px",
              top: "50%",
              transform: "translateY(-50%)",
              width: 0,
              height: 0,
              borderTop: "6px solid transparent",
              borderBottom: "6px solid transparent",
              borderLeft: `6px solid ${colors.accent}55`,
            }}
          />
        </div>
      ) : null}

      {/* Main button */}
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
          boxSizing: "border-box",
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
          animation: "kuber-glow 3s ease-in-out infinite",
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
                background: colors.coral,
                border: `2px solid ${colors.cardBg}`,
                boxSizing: "border-box",
              }}
            />
          ) : null}
        </span>
      </button>
    </>
  );
}

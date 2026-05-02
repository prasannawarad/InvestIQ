"use client";

import { animate } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface AnimatedCounterProps {
  value: number;
  format?: (v: number) => string;
  duration?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function AnimatedCounter({
  value,
  format = (v) => String(Math.round(v)),
  duration = 1.05,
  className,
  style,
}: AnimatedCounterProps) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef<number | null>(null);

  useEffect(() => {
    const prev = prevRef.current ?? 0;
    prevRef.current = value;
    const ctrl = animate(prev, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setDisplay(latest),
    });
    return () => ctrl.stop();
  }, [value, duration]);

  return (
    <span className={`tabular-nums ${className ?? ""}`} style={style}>
      {format(display)}
    </span>
  );
}

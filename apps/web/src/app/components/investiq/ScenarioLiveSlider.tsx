"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import type { ScenarioName } from "@investiq/engine";
import { colors, typography } from "@investiq/ui/tokens";

interface ScenarioLiveSliderProps {
  scenarioOrder: ScenarioName[];
  scenarios: Array<{ key: ScenarioName; label: string }>;
  selected: ScenarioName;
  portfolioTotalUsd: number;
  previewMoveToCashUsd: number;
  onSelect: (name: ScenarioName) => void;
}

export function ScenarioLiveSlider({
  scenarioOrder,
  scenarios,
  selected,
  portfolioTotalUsd,
  previewMoveToCashUsd,
  onSelect,
}: ScenarioLiveSliderProps) {
  let ix = scenarioOrder.indexOf(selected);
  if (ix === -1) ix = 0;
  const max = Math.max(1, scenarioOrder.length - 1);

  const labelSet = useMemo(() => new Map(scenarios.map((s) => [s.key, s.label])), [scenarios]);

  return (
    <div
      className="rounded-2xl p-6 ring-1"
      style={{
        background: `linear-gradient(135deg, ${colors.surface} 0%, ${colors.cardBg} 72%)`,
        borderColor: `${colors.accent}28`,
      }}
    >
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-widest" style={{ color: colors.textMuted }}>
            Scenario explorer
          </div>
          <div className="text-lg leading-tight" style={{ fontFamily: typography.serif, color: colors.text }}>
            {labelSet.get(selected) ?? selected}
          </div>
        </div>
        <motion.div
          key={`${selected}-${previewMoveToCashUsd}`}
          initial={{ opacity: 0.45, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          className="max-w-[14rem] text-right"
        >
          <div className="text-[11px] uppercase tracking-wide" style={{ color: colors.textMuted }}>
            Live cushion preview
          </div>
          <div className="text-sm font-medium tabular-nums" style={{ color: colors.accent }}>
            {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
              previewMoveToCashUsd,
            )}
            <span className="font-normal" style={{ color: colors.textMuted }}>
              {" "}
              illustrative shift
            </span>
          </div>
        </motion.div>
      </div>

      <input
        type="range"
        min={0}
        max={max}
        step={1}
        value={Math.min(ix, max)}
        className="investiq-range mb-4 w-full"
        aria-valuetext={labelSet.get(selected)}
        aria-label="Choose scenario severity"
        onChange={(e) => {
          const i = Number(e.target.value);
          const key = scenarioOrder[i];
          if (key) onSelect(key);
        }}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <PreviewStat label="Portfolio value (ref.)" formatted={usd(portfolioTotalUsd)} />
        <PreviewStat label="Scenario step" formatted={`${ix + 1} / ${scenarioOrder.length}`} />
      </div>
    </div>
  );
}

function usd(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function PreviewStat({ label, formatted }: { label: string; formatted: string }) {
  return (
    <motion.div layout className="rounded-xl px-4 py-3 ring-1" style={{ borderColor: colors.border, backgroundColor: colors.surfaceElevated }}>
      <div className="mb-1 text-xs" style={{ color: colors.textMuted }}>
        {label}
      </div>
      <div className="text-sm tabular-nums font-medium" style={{ color: colors.text }}>
        {formatted}
      </div>
    </motion.div>
  );
}

import type { MarketContext, Portfolio, UserProfile } from "@investiq/data";

/** Structured context block appended to Kuber's system message (adapted from `agent/user_context.py`). */
export function serializeKuberContext(parts: {
  userProfile: UserProfile;
  portfolio: Portfolio;
  marketContext: MarketContext;
}): string {
  const { userProfile, portfolio, marketContext } = parts;
  const id = userProfile.identity;
  const rp = userProfile.risk_profile;
  const fc = userProfile.financial_context;

  const lines: string[] = ["=== INVESTIQ USER & PORTFOLIO (AUTHORITATIVE) ==="];

  lines.push(
    `${id.name}, age ${id.age}, ${id.occupation} in ${id.location}. Currency: ${id.currency}.`,
  );
  lines.push(
    `${rp.persona_label} persona (risk score ${rp.risk_score}/10, capacity ${rp.risk_capacity}, tolerance ${rp.risk_tolerance}). Preferences: communication_tone="${userProfile.preferences.communication_tone}", explanation_depth="${userProfile.preferences.explanation_depth}".`,
  );
  lines.push(
    `KUBER VOICE LOCK-IN — adapt reply shape to tone without breaking global persona rules above: friendly_simple uses warm sibling cadence with light fillers (okay, hm, honestly); direct_concise uses shorter clauses and fewer asides; detailed_explanations favors crisp definitions and one extra clause when clarity needs it—but still obey sentence-cap rules in your system prompt.`,
  );
  lines.push(
    `Income USD ${fc.annual_income}/yr, saves ~USD ${fc.monthly_savings_capacity}/mo, ${fc.dependents} dependents, ${fc.emergency_fund_months} months emergency.`,
  );

  if (userProfile.goals?.length) {
    lines.push("Goals:");
    for (const g of userProfile.goals) {
      const pct = Math.min(999, Math.round((g.current_progress / Math.max(1, g.target_amount)) * 100));
      lines.push(`  • ${g.name}: ${g.current_progress} / ${g.target_amount} (${pct}%) target ${g.target_date} (${g.priority})`);
    }
  }

  const s = portfolio.summary;
  lines.push("");
  lines.push(`Portfolio (${portfolio.portfolio_id}), as-of ${portfolio.as_of}`);
  lines.push(`  Total value: USD ${Math.round(s.total_value)}`);
  lines.push(`  Invested / returns / day change %: ${s.total_invested} | ${s.total_returns} | ${s.day_change_percent}%`);
  lines.push(`  Health score: ${s.health_score}`);
  const a = portfolio.allocation.by_asset_class;
  lines.push(
    `  Current allocation equity/debt/gold/cash (%): ${a.equity}% / ${a.debt}% / ${a.gold}% / ${a.cash}%`,
  );
  const t = portfolio.allocation.target_allocation;
  lines.push(`  Targets: equity ${t.equity}% debt ${t.debt}% gold ${t.gold}% cash ${t.cash}%`);
  lines.push(`  Drift from target (engine metric): ${portfolio.allocation.drift_from_target}%`);

  lines.push("Holdings (name, symbol, asset class, weight %, USD value):");
  for (const h of portfolio.holdings.slice(0, 24)) {
    lines.push(
      `  • ${h.name} (${h.symbol}) [${h.asset_class}] weight ${Math.round(h.weight_in_portfolio * 1000) / 10}% · USD ${Math.round(h.current_value)}`,
    );
  }

  lines.push("");
  lines.push(`Market snapshot (${marketContext.as_of})`);
  lines.push(`  Sentiment / volatility regime: ${marketContext.market_snapshot.sentiment} / ${marketContext.market_snapshot.volatility_regime}`);
  lines.push(`  Macro interest rate / inflation: ${marketContext.macro_context.interest_rate}% / ${marketContext.macro_context.inflation_rate}%`);
  if (marketContext.recent_events?.length) {
    lines.push("Recent curated events:");
    for (const ev of marketContext.recent_events.slice(0, 6)) {
      lines.push(`  • (${ev.category}, ${ev.impact}) ${ev.headline}`);
      lines.push(`    → ${ev.plain_summary}`);
    }
  }

  lines.push("");
  lines.push(
    "When you reference numbers about this user’s portfolio or goals, use ONLY figures from this section. Quantitative projections for scenarios belong to InvestIQ Engine output if provided separately — never invent them.",
  );

  return lines.join("\n");
}

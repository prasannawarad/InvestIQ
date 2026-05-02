/**
 * Persist rebalance trades to Supabase. Only writes columns present in mock seed inserts.
 *
 * @see {@link ../../../../02_supabase_seed_mock_data.sql}
 *
 * **`portfolios`** (full row keys in seed: id, user_id, external_portfolio_id, version, as_of, currency,
 * summary, allocation, risk_metrics, extensions, created_at, updated_at) —
 * **UPDATE** payloads use only: `as_of`, `summary`, `allocation`, `updated_at`. Other keys stay untouched in DB.
 *
 * **`holdings`** (full row keys: id, portfolio_id, user_id, external_holding_id, symbol, name, asset_class,
 * subcategory, sector, quantity, avg_buy_price, current_price, current_value, unrealized_pnl,
 * unrealized_pnl_percent, weight_in_portfolio, metadata, created_at, updated_at) —
 * **UPDATE** uses only: `quantity`, `current_value`, `unrealized_pnl`, `unrealized_pnl_percent`,
 * `weight_in_portfolio`, `updated_at`.
 */
import type { RebalanceRecommendation } from "@investiq/data";
import { supabase } from "./supabase";
import type { HoldingRow, JsonRecord, SupabaseDashboardData } from "./supabaseData";

/** Patched columns only — aligns with `portfolios` list in `02_supabase_seed_mock_data.sql`. */
type PortfoliosRebalancePatch = {
  as_of: string;
  summary: JsonRecord;
  allocation: JsonRecord;
  updated_at: string;
};

/** Patched columns only — aligns with `holdings` list in `02_supabase_seed_mock_data.sql`. */
type HoldingsRebalancePatch = {
  quantity: number;
  current_value: number;
  unrealized_pnl: number;
  unrealized_pnl_percent: number;
  weight_in_portfolio: number;
  updated_at: string;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object") return value as Record<string, unknown>;
  return {};
}

function resolveHoldingsRow(
  holdings: HoldingRow[],
  symbol: string
): HoldingRow | undefined {
  const direct = holdings.find((h) => h.symbol === symbol);
  if (direct) return direct;
  const ac = symbol.includes("DEBT")
    ? "debt"
    : symbol.includes("GOLD")
      ? "gold"
      : symbol.includes("CASH")
        ? "cash"
        : "equity";
  const pool = holdings
    .filter((h) => h.asset_class === ac)
    .sort((a, b) => b.current_value - a.current_value);
  return pool[0];
}

function applyTradeToHolding(row: HoldingRow, action: "buy" | "sell", amountUsd: number): void {
  const price =
    row.current_price > 0 ? row.current_price : row.avg_buy_price > 0 ? row.avg_buy_price : 1;

  if (action === "sell") {
    const cap = Math.min(amountUsd, row.current_value);
    row.current_value = round2(Math.max(0, row.current_value - cap));
    row.quantity = round2(Math.max(0, row.quantity - cap / price));
  } else {
    row.current_value = round2(row.current_value + amountUsd);
    row.quantity = round2(row.quantity + amountUsd / price);
  }

  const costBasis = round2(row.quantity * row.avg_buy_price);
  row.unrealized_pnl = round2(row.current_value - costBasis);
  row.unrealized_pnl_percent =
    costBasis > 0 ? round2((row.unrealized_pnl / costBasis) * 100) : 0;
}

function spreadCostAcrossHoldings(holdings: HoldingRow[], costUsd: number): void {
  if (costUsd <= 0) return;
  const total = holdings.reduce((s, h) => s + Math.max(0, h.current_value), 0);
  if (total <= 0) return;
  const capped = Math.min(costUsd, total);
  const ratio = capped / total;
  for (const row of holdings) {
    if (row.current_value <= 0) continue;
    const cut = round2(row.current_value * ratio);
    if (cut <= 0) continue;
    const price =
      row.current_price > 0 ? row.current_price : row.avg_buy_price > 0 ? row.avg_buy_price : 1;
    row.current_value = round2(Math.max(0, row.current_value - cut));
    row.quantity = round2(Math.max(0, row.quantity - cut / price));
    const costBasis = round2(row.quantity * row.avg_buy_price);
    row.unrealized_pnl = round2(row.current_value - costBasis);
    row.unrealized_pnl_percent =
      costBasis > 0 ? round2((row.unrealized_pnl / costBasis) * 100) : 0;
  }
}

function recomputePortfolioAggregates(holdings: HoldingRow[]): {
  total_value: number;
  by_asset_class: Record<string, number>;
} {
  const total_value = round2(holdings.reduce((s, h) => s + Math.max(0, h.current_value), 0));
  if (total_value <= 0) {
    return { total_value: 0, by_asset_class: { equity: 0, debt: 0, gold: 0, cash: 0 } };
  }
  const sums: Record<string, number> = { equity: 0, debt: 0, gold: 0, cash: 0 };
  for (const h of holdings) {
    const k = sums[h.asset_class] != null ? h.asset_class : "equity";
    sums[k] = round2(sums[k] + Math.max(0, h.current_value));
  }
  const by_asset_class: Record<string, number> = {
    equity: round2((sums.equity / total_value) * 100),
    debt: round2((sums.debt / total_value) * 100),
    gold: round2((sums.gold / total_value) * 100),
    cash: round2((sums.cash / total_value) * 100),
  };
  return { total_value, by_asset_class };
}

/** Persists rebalance trades using only columns listed in the file-header contract. */
export async function applyRebalanceCommit(
  data: SupabaseDashboardData,
  recommendation: RebalanceRecommendation,
  newTargetAllocation: Record<string, number> | null
): Promise<void> {
  let holdings = data.holdings.map((h) => ({ ...h }));

  for (const trade of recommendation.trades) {
    const row = resolveHoldingsRow(holdings, trade.symbol);
    if (!row) continue;
    applyTradeToHolding(row, trade.action, trade.amount_usd);
  }

  const cost = round2(recommendation.tax_cost_usd + recommendation.fees_usd);
  spreadCostAcrossHoldings(holdings, cost);

  const minValue = 0.01;
  const removed = holdings.filter((h) => h.current_value < minValue);
  holdings = holdings.filter((h) => h.current_value >= minValue);

  for (const h of holdings) {
    h.quantity = round2(h.quantity);
    h.current_value = round2(h.current_value);
    h.avg_buy_price = round2(h.avg_buy_price);
    h.current_price = round2(h.current_price);
  }

  const { total_value, by_asset_class } = recomputePortfolioAggregates(holdings);
  const prevPortfolio = data.portfolio;

  const prevAlloc = asRecord(prevPortfolio.allocation);
  const prevTargetRaw = prevAlloc.target_allocation;
  const prevTargetObj =
    prevTargetRaw && typeof prevTargetRaw === "object" ? (prevTargetRaw as Record<string, unknown>) : {};
  const target_allocation = newTargetAllocation ?? {
    equity: Number(prevTargetObj.equity ?? 0),
    debt: Number(prevTargetObj.debt ?? 0),
    gold: Number(prevTargetObj.gold ?? 0),
    cash: Number(prevTargetObj.cash ?? 0),
  };

  let drift_from_target = 0;
  for (const k of ["equity", "debt", "gold", "cash"]) {
    const d = Math.abs(
      Number(by_asset_class[k] ?? 0) - Number(target_allocation[k as keyof typeof target_allocation] ?? 0)
    );
    drift_from_target = Math.max(drift_from_target, d);
  }
  drift_from_target = round2(drift_from_target);

  const prevSummary = asRecord(prevPortfolio.summary);

  const total_invested = round2(
    holdings.reduce((s, h) => s + round2(h.quantity * h.avg_buy_price), 0)
  );
  const total_returns = round2(total_value - total_invested);
  const returns_percent =
    total_invested > 0 ? round2((total_returns / total_invested) * 100) : Number(prevSummary.returns_percent ?? 0);

  const allocationMerged: JsonRecord = {
    ...prevAlloc,
    by_asset_class: by_asset_class as unknown as Record<string, unknown>,
    target_allocation: target_allocation as unknown as Record<string, unknown>,
    drift_from_target,
  };

  const summaryMerged: JsonRecord = {
    ...prevSummary,
    total_value,
    total_invested,
    total_returns,
    returns_percent,
  };

  const nowIso = new Date().toISOString();

  const portfoliosPatch: PortfoliosRebalancePatch = {
    as_of: nowIso,
    summary: summaryMerged,
    allocation: allocationMerged,
    updated_at: nowIso,
  };

  const { error: portfolioError } = await supabase
    .from("portfolios")
    .update(portfoliosPatch)
    .eq("id", prevPortfolio.id)
    .eq("user_id", prevPortfolio.user_id);

  if (portfolioError) {
    throw new Error(portfolioError.message);
  }

  for (const h of removed) {
    const { error: deleteError } = await supabase
      .from("holdings")
      .delete()
      .eq("id", h.id)
      .eq("user_id", h.user_id);
    if (deleteError) {
      throw new Error(deleteError.message);
    }
  }

  for (const h of holdings) {
    const wt = total_value > 0 ? round2((h.current_value / total_value) * 100) : 0;
    const holdingsPatch: HoldingsRebalancePatch = {
      quantity: h.quantity,
      current_value: h.current_value,
      unrealized_pnl: h.unrealized_pnl,
      unrealized_pnl_percent: h.unrealized_pnl_percent,
      weight_in_portfolio: wt,
      updated_at: nowIso,
    };
    const { error: holdingError } = await supabase
      .from("holdings")
      .update(holdingsPatch)
      .eq("id", h.id)
      .eq("user_id", h.user_id);

    if (holdingError) {
      throw new Error(holdingError.message);
    }
  }
}

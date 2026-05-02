/**
 * Persist `/Kuber` discovery basket buys: insert/update holdings then refresh allocation + summary JSON.
 *
 * Symbols must exist in `@investiq/engine` mock universe (`getUniverseCandidateBySymbol`).
 *
 * @see {@link ../../../../02_supabase_seed_mock_data.sql}
 */
import { getUniverseCandidateBySymbol, type UniverseCandidate } from "@investiq/engine";
import { supabase } from "./supabase";
import type { HoldingRow, JsonRecord, SupabaseDashboardData } from "./supabaseData";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object") return value as Record<string, unknown>;
  return {};
}

function subcategoryFor(c: UniverseCandidate): string {
  if (c.asset_class === "equity") {
    if (c.size === "large") return "large_cap";
    if (c.size === "medium") return "mid_cap";
    return "small_cap";
  }
  if (c.asset_class === "debt") return "bond_etf";
  if (c.asset_class === "gold") return "gold_etf";
  return "money_market";
}

function applyUsdBuy(row: HoldingRow, amountUsd: number): void {
  const price =
    row.current_price > 0 ? row.current_price : row.avg_buy_price > 0 ? row.avg_buy_price : 1;
  row.current_value = round2(row.current_value + amountUsd);
  row.quantity = round2(row.quantity + amountUsd / price);
  const costBasis = round2(row.quantity * row.avg_buy_price);
  row.unrealized_pnl = round2(row.current_value - costBasis);
  row.unrealized_pnl_percent =
    costBasis > 0 ? round2((row.unrealized_pnl / costBasis) * 100) : 0;
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

function buildDiscoveryHolding(params: {
  id: string;
  portfolio_id: string;
  user_id: string;
  external_holding_id: string;
  candidate: UniverseCandidate;
  amountUsd: number;
  nowIso: string;
}): HoldingRow {
  const { id, portfolio_id, user_id, external_holding_id, candidate, amountUsd, nowIso } = params;
  const price = 1;
  return {
    id,
    portfolio_id,
    user_id,
    external_holding_id,
    symbol: candidate.symbol,
    name: candidate.name,
    asset_class: candidate.asset_class,
    subcategory: subcategoryFor(candidate),
    sector: candidate.industry,
    quantity: round2(amountUsd / price),
    avg_buy_price: price,
    current_price: price,
    current_value: round2(amountUsd),
    unrealized_pnl: 0,
    unrealized_pnl_percent: 0,
    weight_in_portfolio: 0,
    metadata: {
      source: "kuber_discovery",
      added_at: nowIso,
      logo_stub: candidate.logo,
    },
  };
}

export type DiscoveryBasketLine = { symbol: string; amount_usd: number };

/**
 * Applies mocked discovery purchases and writes through to Supabase (same portfolio row semantics as rebalance confirm).
 */
export async function applyDiscoveryCommit(
  data: SupabaseDashboardData,
  basket: DiscoveryBasketLine[],
): Promise<void> {
  const merged = new Map<string, number>();
  for (const line of basket) {
    const sym = line.symbol.trim().toUpperCase();
    const amt = round2(Number(line.amount_usd));
    if (!sym || !Number.isFinite(amt) || amt <= 0) continue;
    merged.set(sym, round2((merged.get(sym) ?? 0) + amt));
  }
  if (merged.size === 0) {
    throw new Error("Basket is empty — add at least one position before confirming.");
  }

  const originals = new Map(data.holdings.map((h) => [h.id, { ...h }]));
  const holdings = data.holdings.map((h) => ({ ...h }));

  const nowIso = new Date().toISOString();

  for (const [symbol, amountUsd] of merged) {
    const candidate = getUniverseCandidateBySymbol(symbol);
    if (!candidate) {
      throw new Error(`Unknown discovery symbol "${symbol}" — reload matches and try again.`);
    }
    const idx = holdings.findIndex((h) => h.symbol === candidate.symbol);
    if (idx >= 0) {
      applyUsdBuy(holdings[idx], amountUsd);
    } else {
      const newId =
        typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${symbol}`;
      const externalId = `disc_${candidate.symbol}_${newId.slice(0, 10)}`;
      holdings.push(
        buildDiscoveryHolding({
          id: newId,
          portfolio_id: data.portfolio.id,
          user_id: data.profile.id,
          external_holding_id: externalId,
          candidate,
          amountUsd,
          nowIso,
        }),
      );
    }
  }

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
  const target_allocation = {
    equity: Number(prevTargetObj.equity ?? 0),
    debt: Number(prevTargetObj.debt ?? 0),
    gold: Number(prevTargetObj.gold ?? 0),
    cash: Number(prevTargetObj.cash ?? 0),
  };

  let drift_from_target = 0;
  for (const k of ["equity", "debt", "gold", "cash"] as const) {
    drift_from_target = Math.max(
      drift_from_target,
      round2(Math.abs(Number(by_asset_class[k] ?? 0) - Number(target_allocation[k] ?? 0))),
    );
  }

  const prevSummary = asRecord(prevPortfolio.summary);
  const total_invested = round2(holdings.reduce((s, h) => s + round2(h.quantity * h.avg_buy_price), 0));
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

  const { error: portfolioError } = await supabase
    .from("portfolios")
    .update({
      as_of: nowIso,
      summary: summaryMerged,
      allocation: allocationMerged,
      updated_at: nowIso,
    })
    .eq("id", prevPortfolio.id)
    .eq("user_id", prevPortfolio.user_id);

  if (portfolioError) throw new Error(portfolioError.message);

  for (const h of holdings) {
    const wt = total_value > 0 ? round2((h.current_value / total_value) * 100) : 0;
    const holdingsPatch = {
      quantity: h.quantity,
      current_value: h.current_value,
      unrealized_pnl: h.unrealized_pnl,
      unrealized_pnl_percent: h.unrealized_pnl_percent,
      weight_in_portfolio: wt,
      updated_at: nowIso,
    };

    if (originals.has(h.id)) {
      const { error } = await supabase
        .from("holdings")
        .update(holdingsPatch)
        .eq("id", h.id)
        .eq("user_id", h.user_id);
      if (error) throw new Error(error.message);
    } else {
      const insertRow = {
        id: h.id,
        portfolio_id: h.portfolio_id,
        user_id: h.user_id,
        external_holding_id: h.external_holding_id,
        symbol: h.symbol,
        name: h.name,
        asset_class: h.asset_class,
        subcategory: h.subcategory,
        sector: h.sector,
        quantity: h.quantity,
        avg_buy_price: h.avg_buy_price,
        current_price: h.current_price,
        current_value: h.current_value,
        unrealized_pnl: h.unrealized_pnl,
        unrealized_pnl_percent: h.unrealized_pnl_percent,
        weight_in_portfolio: wt,
        metadata: h.metadata ?? {},
        created_at: nowIso,
        updated_at: nowIso,
      };
      const { error } = await supabase.from("holdings").insert(insertRow);
      if (error) throw new Error(error.message);
    }
  }
}

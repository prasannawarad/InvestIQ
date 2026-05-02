"""
rebalance_tool.py

Pure deterministic logic over portfolio.json — no LLM, no network, no API.
Reads current allocation vs target, returns a specific trade plan in USD.

Works identically with mock or real data — operates on user_data/portfolio.json.
"""

import json
from pathlib import Path
from typing import Optional

BASE_DIR = Path(__file__).parent
USER_DATA_DIR = BASE_DIR / "user_data"
LEGACY_USER_DATA_DIR = BASE_DIR / "user data"

# Don't propose trades smaller than this — fees/spreads eat the benefit
MIN_TRADE_VALUE_USD = 200


def _load_portfolio() -> dict:
    path = USER_DATA_DIR / "portfolio.json"
    if not path.exists():
        path = LEGACY_USER_DATA_DIR / "portfolio.json"
    if not path.exists():
        return {}
    with open(path) as f:
        return json.load(f)


def _load_user_profile() -> dict:
    path = USER_DATA_DIR / "user_profile.json"
    if not path.exists():
        path = LEGACY_USER_DATA_DIR / "user_profile.json"
    if not path.exists():
        return {}
    with open(path) as f:
        return json.load(f)


def propose_rebalance(
    target_equity: Optional[int] = None,
    target_debt: Optional[int] = None,
    target_gold: Optional[int] = None,
    target_cash: Optional[int] = None,
) -> str:
    """
    Generate a concrete rebalance plan. All target_* args are optional;
    if omitted, uses targets from portfolio.json.
    """
    portfolio = _load_portfolio()
    profile = _load_user_profile()

    if not portfolio:
        return "ERROR: No portfolio data available. Cannot propose rebalance."

    summary = portfolio.get("summary", {})
    allocation = portfolio.get("allocation", {})
    holdings = portfolio.get("holdings", [])
    total_value = summary.get("total_value", 0)

    if total_value <= 0:
        return "ERROR: Portfolio has zero value. Cannot rebalance."

    current_targets = allocation.get("target_allocation", {})
    targets = {
        "equity": target_equity if target_equity is not None else current_targets.get("equity", 65),
        "debt":   target_debt   if target_debt   is not None else current_targets.get("debt", 25),
        "gold":   target_gold   if target_gold   is not None else current_targets.get("gold", 5),
        "cash":   target_cash   if target_cash   is not None else current_targets.get("cash", 5),
    }

    if sum(targets.values()) != 100:
        return f"ERROR: Target allocation must sum to 100%. Got: {targets} (sum={sum(targets.values())})"

    current = allocation.get("by_asset_class", {})

    # Step 1: rupee/dollar gap per asset class
    gaps = {}
    for asset_class, target_pct in targets.items():
        current_pct = current.get(asset_class, 0)
        target_value = total_value * (target_pct / 100)
        current_value = total_value * (current_pct / 100)
        gaps[asset_class] = round(target_value - current_value)

    # Step 2: convert gaps into specific holding-level trades
    trades = []
    by_class = {}
    for h in holdings:
        cls = h.get("asset_class", "unknown")
        by_class.setdefault(cls, []).append(h)
    for cls in by_class:
        by_class[cls].sort(key=lambda h: h.get("current_value", 0), reverse=True)

    # Process SELLS first (free up cash for buys)
    for asset_class, gap in gaps.items():
        if gap >= -MIN_TRADE_VALUE_USD:
            continue
        amount_to_sell = abs(gap)
        class_holdings = by_class.get(asset_class, [])
        if not class_holdings:
            continue
        for holding in class_holdings:
            if amount_to_sell < MIN_TRADE_VALUE_USD:
                break
            holding_value = holding.get("current_value", 0)
            max_sellable = holding_value * 0.6  # never sell more than 60% of one position
            sell_amount = min(amount_to_sell, max_sellable)
            if sell_amount < MIN_TRADE_VALUE_USD:
                continue
            trades.append({
                "action": "SELL",
                "symbol": holding.get("symbol"),
                "name": holding.get("name"),
                "amount_usd": round(sell_amount),
                "asset_class": asset_class,
                "rationale": f"Reduce {asset_class} exposure (over target by {abs(gap)/total_value*100:.1f}%)",
            })
            amount_to_sell -= sell_amount

    # Process BUYS
    for asset_class, gap in gaps.items():
        if gap <= MIN_TRADE_VALUE_USD:
            continue
        amount_to_buy = gap
        class_holdings = by_class.get(asset_class, [])
        if class_holdings:
            target_holding = class_holdings[-1]  # smallest existing — equalize
            trades.append({
                "action": "BUY",
                "symbol": target_holding.get("symbol"),
                "name": target_holding.get("name"),
                "amount_usd": round(amount_to_buy),
                "asset_class": asset_class,
                "rationale": f"Increase {asset_class} exposure (under target by {gap/total_value*100:.1f}%)",
            })
        else:
            generic_suggestions = {
                "debt": ("BND", "Vanguard Total Bond Market ETF"),
                "gold": ("GLD", "SPDR Gold Shares"),
                "equity": ("VOO", "Vanguard S&P 500 ETF"),
                "cash": ("BIL", "SPDR Bloomberg 1-3 Month T-Bill ETF"),
            }
            suggested = generic_suggestions.get(asset_class)
            if suggested:
                trades.append({
                    "action": "BUY",
                    "symbol": suggested[0],
                    "name": suggested[1] + " (NEW POSITION — suggested)",
                    "amount_usd": round(amount_to_buy),
                    "asset_class": asset_class,
                    "rationale": f"Open new {asset_class} position (currently 0%, target {targets[asset_class]}%)",
                })

    # Step 3: format response
    if not trades:
        return (
            f"✓ **Rebalance not needed.**\n"
            f"Current allocation is within tolerance of target. "
            f"Drift is {allocation.get('drift_from_target', 0)}% — below threshold for action."
        )

    user_name = profile.get("identity", {}).get("name", "")
    out = []
    out.append(f"**📋 Rebalance Plan** for {user_name}")
    out.append(f"Portfolio value: ${total_value:,}\n")
    out.append("**Current vs Target:**")
    for cls in ["equity", "debt", "gold", "cash"]:
        out.append(
            f"  {cls.title():<8} {current.get(cls, 0)}% → {targets[cls]}% "
            f"(gap: ${gaps[cls]:+,})"
        )
    out.append("\n**Proposed Trades:**")
    total_sell = 0
    total_buy = 0
    for i, t in enumerate(trades, 1):
        emoji = "🔴" if t["action"] == "SELL" else "🟢"
        out.append(f"  {i}. {emoji} {t['action']} ${t['amount_usd']:,} of {t['symbol']} ({t['name']})")
        out.append(f"      → {t['rationale']}")
        if t["action"] == "SELL":
            total_sell += t["amount_usd"]
        else:
            total_buy += t["amount_usd"]
    out.append(f"\n**Net cash flow:** ${total_sell - total_buy:+,} "
               f"(sells ${total_sell:,} / buys ${total_buy:,})")
    out.append("\n**Why this matters:**")
    goals = profile.get("goals", [])
    high_priority = [g for g in goals if g.get("priority") == "high"]
    nearest_goal = min(high_priority, key=lambda g: g.get("target_date", "9999"), default=None)
    if nearest_goal:
        out.append(
            f"  Your nearest goal is '{nearest_goal['name']}' targeting "
            f"{nearest_goal.get('target_date', '?')[:10]}. "
            f"Aligning to your target allocation reduces the risk of a market drop "
            f"derailing this goal."
        )
    out.append(
        f"\n**Estimated drift after rebalance:** ~0-2% (down from "
        f"{allocation.get('drift_from_target', 0)}%)"
    )
    return "\n".join(out)


if __name__ == "__main__":
    print(propose_rebalance())

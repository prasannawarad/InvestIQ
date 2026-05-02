"""
scenario_tool.py

What-If scenario simulator for the portfolio.
Answers questions like:
- "What if the market drops 20%?"
- "What if I need to withdraw $10,000?"
- "What if inflation stays high?"
- "What if interest rates rise?"

Pure logic over portfolio.json — no LLM, no network.
"""

import json
from pathlib import Path
from typing import Optional

BASE_DIR = Path(__file__).parent
USER_DATA_DIR = BASE_DIR / "user_data"
LEGACY_USER_DATA_DIR = BASE_DIR / "user data"


def _load_json(filename: str) -> dict:
    path = USER_DATA_DIR / filename
    if not path.exists():
        path = LEGACY_USER_DATA_DIR / filename
    if not path.exists():
        return {}
    with open(path) as f:
        return json.load(f)


# How much each holding moves relative to the broad market
HOLDING_BETA = {
    "AAPL": 1.20, "MSFT": 1.10, "NVDA": 1.65, "GOOGL": 1.10, "META": 1.25,
    "AMZN": 1.15, "VOO": 1.00, "QQQ": 1.15, "BND": -0.15, "GLD": 0.05,
}
ASSET_CLASS_BETA = {"equity": 1.0, "debt": -0.20, "gold": 0.05, "cash": 0.0}

# Inflation sensitivity per 1% CPI increase
INFLATION_SENS = {"equity": -0.02, "debt": -0.05, "gold": 0.04, "cash": -0.01}

# Rate sensitivity per 1% Fed funds change
RATE_SENS_HOLDING = {
    "NVDA": -0.05, "AAPL": -0.02, "MSFT": -0.02, "VOO": -0.03,
    "BND": -0.07, "GLD": -0.02,
}
RATE_SENS_CLASS = {"equity": -0.03, "debt": -0.06, "gold": -0.02, "cash": 0.005}

TECH_TICKERS = {"AAPL", "MSFT", "NVDA", "GOOGL", "META", "AMZN", "AMD", "INTC", "CRM", "ORCL", "QQQ"}


def simulate_scenario(
    scenario: str,
    magnitude: Optional[float] = None,
    amount_usd: Optional[int] = None,
) -> str:
    """
    Simulate a what-if scenario on the user's portfolio.

    scenario: market_drop, market_rally, inflation_high, rate_hike,
              rate_cut, withdrawal, sector_crash_tech
    magnitude: percentage (e.g. 20 for 20%)
    amount_usd: dollar amount for withdrawal scenario
    """
    portfolio = _load_json("portfolio.json")
    profile = _load_json("user_profile.json")

    if not portfolio:
        return "ERROR: No portfolio data available."

    total_value = portfolio.get("summary", {}).get("total_value", 0)
    if total_value <= 0:
        return "ERROR: Portfolio has zero value."

    s = scenario.lower().replace(" ", "_").replace("-", "_")
    aliases = {
        "market_crash": "market_drop", "crash": "market_drop", "drop": "market_drop",
        "bear_market": "market_drop", "rally": "market_rally", "bull_market": "market_rally",
        "market_rise": "market_rally", "inflation": "inflation_high",
        "high_inflation": "inflation_high", "rate_increase": "rate_hike",
        "rates_rise": "rate_hike", "rate_decrease": "rate_cut", "rates_fall": "rate_cut",
        "withdraw": "withdrawal", "need_cash": "withdrawal", "tech_crash": "sector_crash_tech",
    }
    s = aliases.get(s, s)

    dispatch = {
        "market_drop":       lambda: _market_move(portfolio, profile, magnitude or 20, "drop"),
        "market_rally":      lambda: _market_move(portfolio, profile, magnitude or 15, "rally"),
        "inflation_high":    lambda: _inflation(portfolio, profile, magnitude or 2),
        "rate_hike":         lambda: _rate_change(portfolio, profile, magnitude or 1, "hike"),
        "rate_cut":          lambda: _rate_change(portfolio, profile, magnitude or 1, "cut"),
        "withdrawal":        lambda: _withdrawal(portfolio, profile, amount_usd or int(total_value * 0.2)),
        "sector_crash_tech": lambda: _sector_crash(portfolio, profile, magnitude or 30),
    }
    fn = dispatch.get(s)
    if not fn:
        return (
            f"❌ Unknown scenario: '{scenario}'. Supported: "
            "market_drop, market_rally, inflation_high, rate_hike, "
            "rate_cut, withdrawal, sector_crash_tech"
        )
    return fn()


# ── helpers ───────────────────────────────────────────────────────────────

def _beta(symbol, asset_class):
    return HOLDING_BETA.get(symbol, ASSET_CLASS_BETA.get(asset_class, 1.0))


def _apply(holdings, total_value, change_fn):
    """Apply per-holding change function, return results + new_total."""
    results = []
    new_total = 0
    for h in holdings:
        sym = h.get("symbol", "???")
        cur = h.get("current_value", 0)
        pct = change_fn(sym, h.get("asset_class", "equity"))
        nv = cur * (1 + pct)
        results.append({
            "symbol": sym, "name": h.get("name", ""), "current": cur,
            "projected": round(nv), "change": round(nv - cur),
            "change_pct": pct * 100,
        })
        new_total += nv
    # add cash (unchanged)
    cash_val = total_value * (0.01 * _cash_pct(holdings, total_value))
    new_total += cash_val
    return results, round(new_total)


def _cash_pct(holdings, total_value):
    held = sum(h.get("current_value", 0) for h in holdings)
    return max(0, (total_value - held) / total_value * 100) if total_value else 0


def _header(out, title, total_value, new_total):
    change = new_total - total_value
    out.append(f"{title}\n")
    out.append("**Portfolio Impact:**")
    out.append(f"  Current value: ${total_value:,}")
    out.append(f"  Projected value: ${new_total:,}")
    out.append(f"  Change: ${change:+,} ({change / total_value * 100:+.1f}%)\n")


def _breakdown(out, results):
    out.append("**Per-Holding Breakdown:**")
    for r in sorted(results, key=lambda r: r["change"]):
        e = "🔴" if r["change"] < -100 else "🟡" if r["change"] < 0 else "🟢"
        out.append(
            f"  {e} {r['symbol']}: ${r['current']:,} → ${r['projected']:,} "
            f"({r['change_pct']:+.1f}%)"
        )


def _goal_impact(out, profile, new_total, old_total):
    goals = profile.get("goals", [])
    if not goals:
        return
    out.append("\n**Goal Impact:**")
    for g in goals:
        name = g.get("name", "?")
        target = g.get("target_amount", 1)
        progress = g.get("current_progress", 0)
        td = g.get("target_date", "")[:10]
        new_prog = (progress / old_total) * new_total if old_total else 0
        ch = new_prog - progress
        old_pct = progress / target * 100
        new_pct = new_prog / target * 100
        e = "🔴" if ch < -500 else "🟡" if ch < 0 else "🟢"
        out.append(
            f"  {e} {name}: {old_pct:.0f}% → {new_pct:.0f}% funded "
            f"(${round(ch):+,}) — target ${target:,} by {td}"
        )


# ── scenario implementations ─────────────────────────────────────────────

def _market_move(portfolio, profile, magnitude, direction):
    holdings = portfolio["holdings"]
    tv = portfolio["summary"]["total_value"]
    sign = -1 if direction == "drop" else 1
    mkt = sign * magnitude / 100

    results, new_total = _apply(
        holdings, tv,
        lambda sym, cls: mkt * _beta(sym, cls),
    )
    out = []
    word = "drops" if direction == "drop" else "rallies"
    _header(out, f"**📉 Scenario: Market {word} {magnitude}%**", tv, new_total)
    _breakdown(out, results)
    _goal_impact(out, profile, new_total, tv)

    out.append("\n**What this means for you:**")
    worst = min(results, key=lambda r: r["change"])
    best = max(results, key=lambda r: r["change"])
    if direction == "drop":
        out.append(
            f"  Your biggest hit: {worst['symbol']} would lose ${abs(worst['change']):,} "
            f"because it swings harder than the market."
        )
        buffer = sum(r["change"] for r in results if r["change"] >= 0)
        out.append(f"  Bonds + gold would cushion ~${abs(round(buffer)):,} of the blow.")
        out.append("  Consider rebalancing toward your target allocation to reduce this risk.")
    else:
        out.append(
            f"  Biggest gainer: {best['symbol']} — up ${best['change']:,}."
        )
    return "\n".join(out)


def _inflation(portfolio, profile, magnitude):
    holdings = portfolio["holdings"]
    tv = portfolio["summary"]["total_value"]

    results, new_total = _apply(
        holdings, tv,
        lambda sym, cls: INFLATION_SENS.get(cls, 0) * magnitude,
    )
    out = []
    _header(out, f"**📈 Scenario: Inflation rises {magnitude}% above current**", tv, new_total)
    out.append(f"  Real purchasing power loss: additional ~{magnitude}% on top\n")
    _breakdown(out, results)
    _goal_impact(out, profile, new_total, tv)
    out.append("\n**What this means for you:**")
    out.append("  Bonds lose value as inflation erodes fixed returns.")
    out.append("  Gold tends to hold value — consider increasing allocation.")
    return "\n".join(out)


def _rate_change(portfolio, profile, magnitude, direction):
    holdings = portfolio["holdings"]
    tv = portfolio["summary"]["total_value"]
    sign = 1 if direction == "hike" else -1

    results, new_total = _apply(
        holdings, tv,
        lambda sym, cls: RATE_SENS_HOLDING.get(sym, RATE_SENS_CLASS.get(cls, 0)) * magnitude * sign,
    )
    out = []
    word = "hikes" if direction == "hike" else "cuts"
    _header(out, f"**🏦 Scenario: Fed {word} rates by {magnitude}%**", tv, new_total)
    _breakdown(out, results)
    _goal_impact(out, profile, new_total, tv)
    out.append("\n**What this means for you:**")
    if direction == "hike":
        out.append("  Higher rates hurt growth stocks (NVDA) and bond prices the most.")
        out.append("  Cash and short-term bonds become more attractive.")
    else:
        out.append("  Lower rates boost growth stocks and bond prices.")
        out.append("  Consider locking in current bond yields before they fall.")
    return "\n".join(out)


def _withdrawal(portfolio, profile, amount_usd):
    holdings = portfolio["holdings"]
    tv = portfolio["summary"]["total_value"]

    if amount_usd >= tv:
        return f"❌ Withdrawal ${amount_usd:,} exceeds portfolio value ${tv:,}."

    remaining = tv - amount_usd
    pct = amount_usd / tv * 100

    out = []
    out.append(f"**💸 Scenario: Withdraw ${amount_usd:,} from portfolio**\n")
    out.append("**Portfolio Impact:**")
    out.append(f"  Current value: ${tv:,}")
    out.append(f"  After withdrawal: ${remaining:,}")
    out.append(f"  Withdrawn: ${amount_usd:,} ({pct:.1f}%)\n")

    out.append("**Proportional withdrawal per holding:**")
    for h in holdings:
        cur = h.get("current_value", 0)
        sold = round(cur * amount_usd / tv)
        out.append(f"  {h['symbol']}: ${cur:,} → ${cur - sold:,} (sell ${sold:,})")

    # Tax estimate
    gains_est = amount_usd * 0.6
    out.append("\n**Estimated Tax Impact:**")
    out.append(f"  Long-term gains (held > 1 yr): ~${round(gains_est * 0.15):,} tax")
    out.append(f"  Short-term gains (held < 1 yr): ~${round(gains_est * 0.22):,} tax")
    out.append("  (Rough estimate — actual depends on cost basis and holding period)")

    _goal_impact(out, profile, remaining, tv)

    out.append("\n**Smarter withdrawal strategy:**")
    out.append("  1. Pull from overweight asset classes first (equity is 13% over target)")
    out.append("  2. Sell holdings with long-term gains (lower tax rate)")
    out.append("  3. Avoid selling recent purchases (short-term capital gains)")
    out.append("  4. Use this as a chance to rebalance toward target allocation")
    return "\n".join(out)


def _sector_crash(portfolio, profile, magnitude):
    holdings = portfolio["holdings"]
    tv = portfolio["summary"]["total_value"]

    def change_fn(sym, cls):
        if sym in TECH_TICKERS:
            return -(magnitude / 100) * HOLDING_BETA.get(sym, 1.0)
        return -(magnitude / 100) * 0.1  # mild spillover

    results, new_total = _apply(holdings, tv, change_fn)

    # tag tech
    for r in results:
        r["is_tech"] = r["symbol"] in TECH_TICKERS

    tech_loss = sum(r["change"] for r in results if r["is_tech"])
    tech_val = sum(r["current"] for r in results if r["is_tech"])
    tech_pct = tech_val / tv * 100

    out = []
    _header(out, f"**💥 Scenario: Tech sector crashes {magnitude}%**", tv, new_total)
    out.append(f"**Your tech exposure: ${tech_val:,} ({tech_pct:.0f}% of portfolio)**\n")
    _breakdown(out, results)
    _goal_impact(out, profile, new_total, tv)

    out.append("\n**What this means for you:**")
    out.append(
        f"  {tech_pct:.0f}% of your portfolio is in tech. A {magnitude}% crash "
        f"would cost you ${abs(round(tech_loss)):,}."
    )
    out.append("  Non-tech holdings (BND, GLD) provide a buffer but won't offset it all.")
    out.append(
        f"  Diversifying ~10% from tech to bonds/gold would cut this damage by "
        f"~${abs(round(tech_loss * 0.15)):,}."
    )
    return "\n".join(out)


# ── Goal progress checker ────────────────────────────────────────────────

def check_goal_progress(goal_name: str = "") -> str:
    """Check progress toward a specific goal or all goals."""
    profile = _load_json("user_profile.json")
    portfolio = _load_json("portfolio.json")
    if not profile or not portfolio:
        return "ERROR: Missing profile or portfolio data."

    goals = profile.get("goals", [])
    if not goals:
        return "No goals defined."

    monthly_savings = profile.get("financial_context", {}).get("monthly_savings_capacity", 0)

    if goal_name:
        goals = [g for g in goals if goal_name.lower() in g.get("name", "").lower()]
        if not goals:
            return f"No goal matching '{goal_name}' found."

    from datetime import datetime
    today = datetime.now()
    out = ["**🎯 Goal Progress Report**\n"]

    for g in goals:
        name = g.get("name", "Unknown")
        target = g.get("target_amount", 0)
        progress = g.get("current_progress", 0)
        td = g.get("target_date", "")[:10]
        priority = g.get("priority", "medium")
        progress_pct = (progress / target * 100) if target else 0
        remaining = target - progress

        try:
            target_date = datetime.strptime(td, "%Y-%m-%d")
            months_left = max(1, (target_date.year - today.year) * 12 + target_date.month - today.month)
        except (ValueError, TypeError):
            months_left = None

        out.append(f"**{name}** (priority: {priority})")
        out.append(f"  Progress: ${progress:,} of ${target:,} ({progress_pct:.0f}%)")
        out.append(f"  Remaining: ${remaining:,}")
        out.append(f"  Target date: {td}")

        if months_left and monthly_savings > 0:
            required = remaining / months_left
            out.append(f"  Months left: {months_left}")
            out.append(f"  Required monthly savings: ${round(required):,}/month")
            out.append(f"  Your savings capacity: ${monthly_savings:,}/month")
            if required <= monthly_savings:
                out.append(f"  ✅ ON TRACK — ${round(monthly_savings - required):,}/month to spare")
            else:
                pace_months = remaining / monthly_savings
                est_year = today.year + int(pace_months // 12)
                est_month = today.month + int(pace_months % 12)
                if est_month > 12:
                    est_year += 1
                    est_month -= 12
                out.append(f"  ⚠️ BEHIND — need ${round(required - monthly_savings):,}/month more")
                out.append(f"  At current pace, you'd reach this goal ~{est_year}-{est_month:02d}")
        out.append("")

    return "\n".join(out)


if __name__ == "__main__":
    print("=== Market Drop 20% ===")
    print(simulate_scenario("market_drop", magnitude=20))
    print("\n" + "=" * 70)
    print("\n=== Goal Progress ===")
    print(check_goal_progress())

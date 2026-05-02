"""
user_context.py

Loads user/portfolio/market data from user_data/ and formats it as a
natural-language context block to inject into every agent query.
"""

import json
from pathlib import Path

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


def load_user_profile() -> dict:
    return _load_json("user_profile.json")


def load_portfolio() -> dict:
    return _load_json("portfolio.json")


def load_market_context() -> dict:
    return _load_json("market_context.json")


def format_user_context_for_prompt() -> str:
    profile = load_user_profile()
    portfolio = load_portfolio()
    market = load_market_context()

    if not profile:
        return ""

    lines = []
    lines.append("=== USER CONTEXT ===")

    identity = profile.get("identity", {})
    risk = profile.get("risk_profile", {})
    fin = profile.get("financial_context", {})
    lines.append(
        f"User: {identity.get('name', 'Unknown')}, age {identity.get('age', '?')}, "
        f"{identity.get('occupation', '?')} in {identity.get('location', '?')}"
    )
    lines.append(
        f"Risk profile: {risk.get('persona_label', 'Balanced')} "
        f"(score {risk.get('risk_score', '?')}/10, "
        f"{risk.get('loss_comfort', 'medium tolerance')})"
    )
    lines.append(
        f"Income: ${fin.get('annual_income', 0):,}/year, "
        f"saves ~${fin.get('monthly_savings_capacity', 0):,}/month, "
        f"{fin.get('dependents', 0)} dependents, "
        f"{fin.get('emergency_fund_months', 0)} months emergency fund"
    )

    goals = profile.get("goals", [])
    if goals:
        lines.append("\nGoals:")
        for g in goals:
            progress_pct = (g.get("current_progress", 0) / g.get("target_amount", 1)) * 100
            lines.append(
                f"  - {g.get('name')}: ${g.get('current_progress', 0):,} of "
                f"${g.get('target_amount', 0):,} ({progress_pct:.0f}% done) "
                f"by {g.get('target_date', '?')[:10]} [priority: {g.get('priority', '?')}]"
            )

    if portfolio:
        s = portfolio.get("summary", {})
        a = portfolio.get("allocation", {})
        lines.append(f"\nPortfolio value: ${s.get('total_value', 0):,} "
                     f"({s.get('returns_percent', 0):+.2f}% overall, "
                     f"{s.get('day_change_percent', 0):+.2f}% today)")
        lines.append(f"Health score: {s.get('health_score', '?')}/100")

        current = a.get("by_asset_class", {})
        target = a.get("target_allocation", {})
        drift = a.get("drift_from_target", 0)
        lines.append(
            f"Current allocation: {current.get('equity', 0)}% equity / "
            f"{current.get('debt', 0)}% debt / {current.get('gold', 0)}% gold / "
            f"{current.get('cash', 0)}% cash"
        )
        lines.append(
            f"Target allocation: {target.get('equity', 0)}% equity / "
            f"{target.get('debt', 0)}% debt / {target.get('gold', 0)}% gold / "
            f"{target.get('cash', 0)}% cash  →  drift {drift}% from target"
        )

        holdings = portfolio.get("holdings", [])
        if holdings:
            lines.append("\nHoldings (current investments):")
            for h in holdings:
                lines.append(
                    f"  - {h.get('symbol')}: {h.get('quantity')} shares, "
                    f"value ${h.get('current_value', 0):,} "
                    f"({h.get('weight_in_portfolio', 0):.1f}% of portfolio)"
                )

    if market:
        lines.append("\n=== MARKET CONTEXT (today) ===")
        snap = market.get("market_snapshot", {})
        macro = market.get("macro_context", {})
        if snap.get("indices"):
            idx_strs = [f"{i['symbol']} {i['value']:.0f} ({i['day_change_percent']:+.2f}%)"
                        for i in snap["indices"]]
            lines.append(f"Markets: {', '.join(idx_strs)} — sentiment: {snap.get('sentiment', '?')}")
        if macro:
            lines.append(
                f"Macro: Fed funds {macro.get('fed_funds_rate')}%, "
                f"CPI {macro.get('inflation_rate_cpi')}%, "
                f"unemployment {macro.get('unemployment_rate')}%, "
                f"10Y Treasury {macro.get('10y_treasury_yield')}%"
            )

        events = market.get("recent_events", [])
        if events:
            lines.append("Recent events:")
            for e in events[:3]:
                lines.append(f"  - [{e.get('impact', 'neutral').upper()}] "
                             f"{e.get('plain_summary', e.get('headline'))}")

    return "\n".join(lines)


def build_user_message(query: str) -> str:
    context = format_user_context_for_prompt()
    if not context:
        return query
    return f"{context}\n\n=== USER'S QUESTION ===\n{query}"


if __name__ == "__main__":
    print(format_user_context_for_prompt())

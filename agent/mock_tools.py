"""
mock_tools.py

Drop-in replacement for yfinance_tools.py that reads from JSON fixtures
instead of calling Yahoo Finance. Same tool names, same schemas, same output
shapes — Claude cannot tell the difference.

US market only. All prices in USD.
"""

import json
from pathlib import Path

# Rebalance tool — works identically in mock or real mode (operates on portfolio.json)
from rebalance_tool import propose_rebalance as _propose_rebalance
from scenario_tool import simulate_scenario as _simulate_scenario
from scenario_tool import check_goal_progress as _check_goal_progress

MOCK_DATA_DIR = Path(__file__).parent / "mock_data"


def _load(ticker: str) -> dict:
    """Load mock fixture for a ticker. Returns None if not found."""
    path = MOCK_DATA_DIR / f"{ticker}.json"
    if not path.exists():
        return None
    with open(path) as f:
        return json.load(f)


def _format_money(n) -> str:
    if n is None:
        return "N/A"
    abs_n = abs(n)
    if abs_n >= 1e12:
        return f"${n/1e12:.2f}T"
    if abs_n >= 1e9:
        return f"${n/1e9:.2f}B"
    if abs_n >= 1e6:
        return f"${n/1e6:.2f}M"
    if abs_n >= 1e3:
        return f"${n/1e3:.2f}K"
    return f"${n:.2f}"


def _list_available() -> str:
    if not MOCK_DATA_DIR.exists():
        return "(none)"
    files = sorted(p.stem for p in MOCK_DATA_DIR.glob("*.json"))
    return ", ".join(files)


# ===========================================================================
# Tool implementations
# ===========================================================================

def _historical_data(ticker: str, period: str = "1y", interval: str = "1d") -> str:
    d = _load(ticker)
    if d is None:
        return f"❌ No mock data for {ticker}. Available: {_list_available()}"
    h = d.get("history_1y", {})
    out = f"**📊 Historical Data: {ticker}**\n"
    out += f"Period: {period} | Interval: {interval}\n\n"
    out += f"**Date Range:** Last 1 year (mock data)\n"
    out += f"**Data Points:** {h.get('data_points', 'N/A')}\n\n"
    out += f"**Latest Close:** ${d['current_price']:.2f}\n"
    out += f"**Period Start Price:** ${h.get('start_price', 'N/A')}\n\n"
    out += f"**Period Statistics:**\n"
    out += f"  Highest: ${h.get('high', 0):.2f}\n"
    out += f"  Lowest: ${h.get('low', 0):.2f}\n"
    out += f"  Average: ${h.get('avg_close', 0):.2f}\n"
    out += f"  Total Return: {h.get('total_return_pct', 0):+.2f}%\n"
    out += f"  Volatility (annualized): {h.get('volatility_annualized_pct', 'N/A')}%\n"
    out += f"  Max Drawdown: {h.get('max_drawdown_pct', 0):.2f}%\n"
    return out


def _stock_price(ticker: str) -> str:
    d = _load(ticker)
    if d is None:
        return f"❌ No mock data for {ticker}. Available: {_list_available()}"
    out = f"**{ticker} - {d['name']}**\n\n"
    out += f"💰 **Current Price:** ${d['current_price']:.2f}\n"
    out += f"📊 **Day Change:** {d['day_change']:+.2f} ({d['day_change_pct']:+.2f}%)\n"
    if d.get("market_cap"):
        out += f"🏢 **Market Cap:** {_format_money(d['market_cap'])}\n"
    if d.get("trailing_pe"):
        out += f"📈 **P/E Ratio:** {d['trailing_pe']:.2f}\n"
    out += f"📉 **52-Week Range:** ${d['52_week_low']:.2f} - ${d['52_week_high']:.2f}\n"
    if d.get("beta") is not None:
        out += f"📊 **Beta:** {d['beta']:.2f}\n"
    return out


def _company_info(ticker: str) -> str:
    d = _load(ticker)
    if d is None:
        return f"❌ No mock data for {ticker}. Available: {_list_available()}"
    out = f"**🏢 Company Information: {d['name']}**\n\n"
    out += f"**Sector:** {d.get('sector', 'N/A')}\n"
    out += f"**Industry:** {d.get('industry', 'N/A')}\n"
    out += f"**Country:** {d.get('country', 'N/A')}\n\n"
    if d.get("business_summary"):
        out += f"**📝 Business Summary:**\n{d['business_summary']}\n"
    return out


def _key_ratios(ticker: str) -> str:
    d = _load(ticker)
    if d is None:
        return f"❌ No mock data for {ticker}. Available: {_list_available()}"
    r = d.get("key_ratios") or {}
    if not r:
        return f"❌ No ratios available for {ticker} (likely an index)."
    out = f"**📊 Key Financial Ratios: {ticker}**\n\n"
    out += f"**📈 Valuation Metrics**\n"
    out += f"  P/E (Trailing): {d.get('trailing_pe', 'N/A')}\n"
    out += f"  P/E (Forward): {d.get('forward_pe', 'N/A')}\n"
    out += f"  Price/Book: {d.get('price_to_book', 'N/A')}\n"
    out += f"  PEG Ratio: {d.get('peg_ratio', 'N/A')}\n\n"
    if r.get("profit_margin_pct") is not None:
        out += f"**💰 Profitability**\n"
        out += f"  Profit Margin: {r.get('profit_margin_pct', 'N/A')}%\n"
        out += f"  Operating Margin: {r.get('operating_margin_pct', 'N/A')}%\n"
        out += f"  ROE: {r.get('return_on_equity_pct', 'N/A')}%\n"
        out += f"  ROA: {r.get('return_on_assets_pct', 'N/A')}%\n\n"
        out += f"**🏥 Financial Health**\n"
        out += f"  Debt/Equity: {r.get('debt_to_equity', 'N/A')}\n"
        if r.get("current_ratio"):
            out += f"  Current Ratio: {r['current_ratio']}\n"
        if r.get("free_cash_flow"):
            out += f"  Free Cash Flow: {_format_money(r['free_cash_flow'])}\n"
    if r.get("expense_ratio_pct") is not None:
        out += f"**🏷️  ETF Metrics**\n"
        out += f"  Expense Ratio: {r['expense_ratio_pct']}%\n"
    return out


def _financial_summary(ticker: str) -> str:
    d = _load(ticker)
    if d is None:
        return f"❌ No mock data for {ticker}. Available: {_list_available()}"
    out = f"**📊 Financial Summary: {ticker}**\n"
    out += f"**{d['name']}**\n"
    out += "=" * 50 + "\n\n"
    out += f"**🏢 Sector:** {d.get('sector', 'N/A')} | **Industry:** {d.get('industry', 'N/A')}\n\n"
    out += f"**💰 Price:** ${d['current_price']:.2f} ({d['day_change_pct']:+.2f}% today)\n"
    out += f"**📊 Market Cap:** {_format_money(d.get('market_cap'))}\n"
    out += f"**📈 P/E:** {d.get('trailing_pe', 'N/A')} | **Fwd P/E:** {d.get('forward_pe', 'N/A')}\n"
    h = d.get("history_1y", {})
    if h:
        out += f"\n**📅 1-Year Performance:**\n"
        out += f"  Total Return: {h.get('total_return_pct', 0):+.2f}%\n"
        out += f"  Volatility: {h.get('volatility_annualized_pct', 'N/A')}%\n"
        out += f"  Max Drawdown: {h.get('max_drawdown_pct', 0):.2f}%\n"
        out += f"  52W Range: ${d['52_week_low']:.2f} - ${d['52_week_high']:.2f}\n"
    a = d.get("analyst") or {}
    if a:
        out += f"\n**🎯 Analyst Consensus:**\n"
        out += f"  Rating: {a.get('recommendation', 'N/A')} ({a.get('num_analysts', 0)} analysts)\n"
        out += f"  Mean Target: ${a.get('target_mean', 'N/A')} ({a.get('implied_upside_pct', 0):+.1f}% upside)\n"
    if d.get("dividend_yield"):
        out += f"\n**💵 Dividend Yield:** {d['dividend_yield']*100:.2f}%\n"
    return out


def _analyst_recommendations(ticker: str) -> str:
    d = _load(ticker)
    if d is None:
        return f"❌ No mock data for {ticker}. Available: {_list_available()}"
    a = d.get("analyst")
    if not a:
        return f"❌ No analyst data available for {ticker}."
    out = f"**🎯 Analyst Recommendations: {ticker}**\n\n"
    out += f"**📊 Current Recommendation**\n"
    out += f"  Rating: **{a['recommendation']}** ({a['mean_rating']}/5)\n"
    out += f"  Coverage: {a['num_analysts']} analysts\n\n"
    out += f"**📈 Recommendation Breakdown:**\n"
    b = a.get("breakdown", {})
    out += f"  Strong Buy: {b.get('strong_buy', 0)}\n"
    out += f"  Buy: {b.get('buy', 0)}\n"
    out += f"  Hold: {b.get('hold', 0)}\n"
    out += f"  Sell: {b.get('sell', 0)}\n"
    out += f"  Strong Sell: {b.get('strong_sell', 0)}\n\n"
    out += f"**💰 Price Targets**\n"
    out += f"  Low: ${a['target_low']}\n"
    out += f"  Mean: ${a['target_mean']} ({a['implied_upside_pct']:+.1f}% upside)\n"
    out += f"  High: ${a['target_high']}\n"
    return out


def _analyst_price_targets(ticker: str) -> str:
    return _analyst_recommendations(ticker)


def _peer_comparison(ticker: str, peers: str = None) -> str:
    d = _load(ticker)
    if d is None:
        return f"❌ No mock data for {ticker}. Available: {_list_available()}"
    if not peers:
        peer_map = {
            "Technology": ["AAPL", "MSFT", "NVDA"],
            "Index ETF": ["VOO"],
            "Bond ETF": ["BND"],
        }
        sector = d.get("sector", "")
        peer_list = [p for p in peer_map.get(sector, []) if p != ticker]
    else:
        peer_list = [p.strip().upper() for p in peers.replace(",", " ").split() if p.strip()]
    out = f"**📊 Peer Comparison: {ticker}**\n\n"
    out += f"**Sector:** {d.get('sector', 'N/A')} | **Industry:** {d.get('industry', 'N/A')}\n\n"
    out += "**📈 Valuation Metrics:**\n```\n"
    out += f"{'Ticker':<8} {'Price':>10} {'P/E':>8} {'P/B':>8}\n"
    out += "-" * 50 + "\n"
    for t in [ticker] + peer_list:
        td = _load(t)
        if not td:
            continue
        out += f"{t:<8} {td['current_price']:>10.2f} {str(td.get('trailing_pe', 'N/A')):>8} {str(td.get('price_to_book', 'N/A')):>8}\n"
    out += "```\n"
    return out


def _historical_comparison(tickers: str, period: str = "1y") -> str:
    ticker_list = [t.strip().upper() for t in tickers.replace(",", " ").split() if t.strip()]
    out = f"**📊 Historical Performance Comparison**\n"
    out += f"**Period:** {period}\n\n"
    rows = []
    for t in ticker_list:
        td = _load(t)
        if not td:
            continue
        h = td.get("history_1y", {})
        rows.append({
            "ticker": t,
            "return": h.get("total_return_pct", 0),
            "vol": h.get("volatility_annualized_pct", 0),
            "drawdown": h.get("max_drawdown_pct", 0),
        })
    if not rows:
        return f"❌ No mock data for any of: {tickers}"
    rows.sort(key=lambda x: x["return"], reverse=True)
    out += "**Performance Rankings:**\n```\n"
    out += f"{'Rank':<6} {'Ticker':<10} {'Return':>10} {'Vol':>8} {'Max DD':>10}\n"
    out += "-" * 55 + "\n"
    for i, r in enumerate(rows, 1):
        emoji = "🥇" if i == 1 else "🥈" if i == 2 else "🥉" if i == 3 else f"#{i}"
        out += f"{emoji:<6} {r['ticker']:<10} {r['return']:>+9.2f}% {r['vol']:>7.1f}% {r['drawdown']:>9.2f}%\n"
    out += "```\n\n"
    out += f"**🏆 Best:** {rows[0]['ticker']} ({rows[0]['return']:+.2f}%)\n"
    out += f"**📉 Worst:** {rows[-1]['ticker']} ({rows[-1]['return']:+.2f}%)\n"
    return out


def _stock_news(ticker: str, limit: int = 5) -> str:
    d = _load(ticker)
    if d is None:
        return f"❌ No mock data for {ticker}. Available: {_list_available()}"
    news = d.get("recent_news", [])
    if not news:
        return f"❌ No news available for {ticker}."
    out = f"**📰 Recent News: {ticker}**\n\n"
    for i, item in enumerate(news[:limit], 1):
        out += f"**{i}. {item['headline']}**\n"
        out += f"   📅 {item['date']} | 📰 {item['source']}\n\n"
    return out


# ===========================================================================
# Registry — exposed to Claude
# ===========================================================================

AGENT_TOOL_REGISTRY = {
    "get_historical_data": {
        "function": _historical_data,
        "description": (
            "Fetch historical price data with computed metrics: total return, "
            "volatility, 52-week range. USE THIS FIRST for recommendation questions."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "ticker": {"type": "string", "description": "US ticker symbol (AAPL, MSFT, NVDA, VOO, BND, GLD, ^GSPC)."},
                "period": {"type": "string", "enum": ["1mo", "3mo", "6mo", "1y", "2y", "5y"]},
                "interval": {"type": "string", "enum": ["1d", "1wk", "1mo"]},
            },
            "required": ["ticker"],
        },
    },
    "get_stock_price": {
        "function": _stock_price,
        "description": "Current price snapshot: price, market cap, P/E, 52-week range, beta.",
        "input_schema": {"type": "object", "properties": {"ticker": {"type": "string"}}, "required": ["ticker"]},
    },
    "get_company_info": {
        "function": _company_info,
        "description": "Sector, industry, business summary.",
        "input_schema": {"type": "object", "properties": {"ticker": {"type": "string"}}, "required": ["ticker"]},
    },
    "get_key_ratios": {
        "function": _key_ratios,
        "description": "P/E, P/B, ROE, profit margins, debt ratios, expense ratio for ETFs.",
        "input_schema": {"type": "object", "properties": {"ticker": {"type": "string"}}, "required": ["ticker"]},
    },
    "get_financial_summary": {
        "function": _financial_summary,
        "description": "One-shot comprehensive snapshot: price, valuation, performance, analyst consensus.",
        "input_schema": {"type": "object", "properties": {"ticker": {"type": "string"}}, "required": ["ticker"]},
    },
    "get_analyst_recommendations": {
        "function": _analyst_recommendations,
        "description": "Analyst consensus: buy/hold/sell breakdown and price targets.",
        "input_schema": {"type": "object", "properties": {"ticker": {"type": "string"}}, "required": ["ticker"]},
    },
    "get_analyst_price_targets": {
        "function": _analyst_price_targets,
        "description": "Price targets with implied upside.",
        "input_schema": {"type": "object", "properties": {"ticker": {"type": "string"}}, "required": ["ticker"]},
    },
    "get_peer_comparison": {
        "function": _peer_comparison,
        "description": "Compare a stock with sector peers on valuation metrics.",
        "input_schema": {
            "type": "object",
            "properties": {"ticker": {"type": "string"}, "peers": {"type": "string"}},
            "required": ["ticker"],
        },
    },
    "get_historical_comparison": {
        "function": _historical_comparison,
        "description": "Compare historical % returns of multiple tickers. Useful for benchmarking against the S&P 500 (^GSPC).",
        "input_schema": {
            "type": "object",
            "properties": {
                "tickers": {"type": "string", "description": "Comma-separated US tickers, e.g., 'AAPL,MSFT,^GSPC'"},
                "period": {"type": "string", "enum": ["1mo", "3mo", "6mo", "1y", "2y", "5y"]},
            },
            "required": ["tickers"],
        },
    },
    "get_stock_news": {
        "function": _stock_news,
        "description": "Recent news headlines for a ticker.",
        "input_schema": {
            "type": "object",
            "properties": {"ticker": {"type": "string"}, "limit": {"type": "integer"}},
            "required": ["ticker"],
        },
    },
    "propose_rebalance": {
        "function": _propose_rebalance,
        "description": (
            "Generate a CONCRETE rebalance plan for the user's portfolio. Returns specific "
            "BUY/SELL trades with dollar amounts to align current allocation with the user's "
            "target. Call this when the user asks 'what should I do?', mentions allocation "
            "drift, or when you've identified that their current allocation is significantly "
            "off-target. Optional overrides let you propose more conservative/aggressive splits."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "target_equity": {"type": "integer", "description": "Override target equity %. Optional."},
                "target_debt": {"type": "integer", "description": "Override target debt %. Optional."},
                "target_gold": {"type": "integer", "description": "Override target gold %. Optional."},
                "target_cash": {"type": "integer", "description": "Override target cash %. Optional."},
            },
            "required": [],
        },
    },
    "simulate_scenario": {
        "function": _simulate_scenario,
        "description": (
            "Simulate a What-If scenario on the user's portfolio. Shows projected impact "
            "on total value, each holding, and goal progress. Use this when the user asks "
            "'what if the market drops?', 'what if I need cash?', 'what happens if inflation rises?', "
            "or any hypothetical market/life scenario."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "scenario": {
                    "type": "string",
                    "description": "Scenario type: market_drop, market_rally, inflation_high, rate_hike, rate_cut, withdrawal, sector_crash_tech",
                },
                "magnitude": {
                    "type": "number",
                    "description": "Percentage for market/inflation/rate scenarios (e.g. 20 for 20%). Optional.",
                },
                "amount_usd": {
                    "type": "integer",
                    "description": "Dollar amount for withdrawal scenario. Optional.",
                },
            },
            "required": ["scenario"],
        },
    },
    "check_goal_progress": {
        "function": _check_goal_progress,
        "description": (
            "Check the user's progress toward their financial goals. Shows current vs target, "
            "required monthly savings, and whether they are on track. Call this when the user "
            "asks about goals, house fund, retirement, or 'am I on track?'."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "goal_name": {
                    "type": "string",
                    "description": "Filter to a specific goal by name (e.g. 'house', 'retirement'). Optional.",
                },
            },
            "required": [],
        },
    },
}


def get_tool_schemas_for_claude():
    return [
        {"name": n, "description": m["description"], "input_schema": m["input_schema"]}
        for n, m in AGENT_TOOL_REGISTRY.items()
    ]


def execute_tool(tool_name: str, tool_input: dict) -> str:
    if tool_name not in AGENT_TOOL_REGISTRY:
        return f"ERROR: Unknown tool '{tool_name}'."
    try:
        return AGENT_TOOL_REGISTRY[tool_name]["function"](**tool_input)
    except TypeError as e:
        return f"ERROR: Bad arguments for {tool_name}: {e}"
    except Exception as e:
        return f"ERROR executing {tool_name}: {e}"

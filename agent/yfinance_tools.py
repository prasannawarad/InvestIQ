"""
yfinance_tools.py

Real Yahoo Finance data layer — direct yfinance calls, sync, US-only.

Same tool names, schemas, and output shape as mock_tools.py — Claude
can't tell them apart. Swap is a one-line import change in the agent.

For real US stock recommendations, this is the production data source.
"""

import yfinance as yf
import pandas as pd

# Rebalance tool — pure logic, mode-agnostic
from rebalance_tool import propose_rebalance as _propose_rebalance
from scenario_tool import simulate_scenario as _simulate_scenario
from scenario_tool import check_goal_progress as _check_goal_progress


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


def _safe(d, key, default="N/A"):
    v = d.get(key)
    return v if v is not None else default


# ===========================================================================
# Tool implementations — fetch from Yahoo, format like mock_tools
# ===========================================================================

def _historical_data(ticker: str, period: str = "1y", interval: str = "1d") -> str:
    if period not in {"1mo", "3mo", "6mo", "1y", "2y", "5y"}:
        period = "1y"
    if interval not in {"1d", "1wk", "1mo"}:
        interval = "1d"

    try:
        t = yf.Ticker(ticker)
        hist = t.history(period=period, interval=interval)
        if hist.empty:
            return f"❌ No historical data for {ticker}. Check the symbol."

        current = float(hist["Close"].iloc[-1])
        start = float(hist["Close"].iloc[0])
        period_return = ((current - start) / start) * 100
        daily_returns = hist["Close"].pct_change().dropna()
        volatility = float(daily_returns.std() * (252 ** 0.5) * 100)
        rolling_max = hist["Close"].cummax()
        drawdown = ((hist["Close"] - rolling_max) / rolling_max) * 100
        max_dd = float(drawdown.min())
        high = float(hist["High"].max())
        low = float(hist["Low"].min())

        out = f"**📊 Historical Data: {ticker}**\n"
        out += f"Period: {period} | Interval: {interval}\n\n"
        out += f"**Date Range:** {hist.index[0].strftime('%Y-%m-%d')} to {hist.index[-1].strftime('%Y-%m-%d')}\n"
        out += f"**Data Points:** {len(hist)}\n\n"
        out += f"**Latest Close:** ${current:.2f}\n"
        out += f"**Period Start Price:** ${start:.2f}\n\n"
        out += f"**Period Statistics:**\n"
        out += f"  Highest: ${high:.2f}\n"
        out += f"  Lowest: ${low:.2f}\n"
        out += f"  Average: ${float(hist['Close'].mean()):.2f}\n"
        out += f"  Total Return: {period_return:+.2f}%\n"
        out += f"  Volatility (annualized): {volatility:.2f}%\n"
        out += f"  Max Drawdown: {max_dd:.2f}%\n"
        return out
    except Exception as e:
        return f"❌ Error fetching {ticker}: {e}"


def _stock_price(ticker: str) -> str:
    try:
        t = yf.Ticker(ticker)
        info = t.info
        if not info or len(info) < 3:
            return f"❌ No data for {ticker}."

        price = info.get("currentPrice") or info.get("regularMarketPrice") or info.get("previousClose")
        prev = info.get("previousClose") or price
        change = (price - prev) if (price and prev) else 0
        change_pct = (change / prev * 100) if prev else 0

        out = f"**{ticker} - {_safe(info, 'longName')}**\n\n"
        out += f"💰 **Current Price:** ${price:.2f}\n" if price else "💰 **Current Price:** N/A\n"
        out += f"📊 **Day Change:** {change:+.2f} ({change_pct:+.2f}%)\n"
        if info.get("marketCap"):
            out += f"🏢 **Market Cap:** {_format_money(info['marketCap'])}\n"
        if info.get("trailingPE"):
            out += f"📈 **P/E Ratio:** {info['trailingPE']:.2f}\n"
        out += f"📉 **52-Week Range:** ${_safe(info, 'fiftyTwoWeekLow')} - ${_safe(info, 'fiftyTwoWeekHigh')}\n"
        if info.get("beta") is not None:
            out += f"📊 **Beta:** {info['beta']:.2f}\n"
        return out
    except Exception as e:
        return f"❌ Error fetching {ticker}: {e}"


def _company_info(ticker: str) -> str:
    try:
        t = yf.Ticker(ticker)
        info = t.info
        if not info:
            return f"❌ No company info for {ticker}."
        out = f"**🏢 Company Information: {_safe(info, 'longName')}**\n\n"
        out += f"**Sector:** {_safe(info, 'sector')}\n"
        out += f"**Industry:** {_safe(info, 'industry')}\n"
        out += f"**Country:** {_safe(info, 'country')}\n"
        out += f"**Website:** {_safe(info, 'website')}\n"
        if info.get("fullTimeEmployees"):
            out += f"**Employees:** {info['fullTimeEmployees']:,}\n"
        summary = info.get("longBusinessSummary")
        if summary:
            summary = summary[:500] + ("..." if len(summary) > 500 else "")
            out += f"\n**📝 Business Summary:**\n{summary}\n"
        return out
    except Exception as e:
        return f"❌ Error fetching {ticker}: {e}"


def _key_ratios(ticker: str) -> str:
    try:
        t = yf.Ticker(ticker)
        info = t.info
        if not info:
            return f"❌ No ratio data for {ticker}."
        out = f"**📊 Key Financial Ratios: {ticker}**\n\n"
        out += f"**📈 Valuation Metrics**\n"
        if info.get("trailingPE"):
            out += f"  P/E (Trailing): {info['trailingPE']:.2f}\n"
        if info.get("forwardPE"):
            out += f"  P/E (Forward): {info['forwardPE']:.2f}\n"
        out += f"  Price/Book: {_safe(info, 'priceToBook')}\n"
        out += f"  Price/Sales: {_safe(info, 'priceToSalesTrailing12Months')}\n"
        out += f"  PEG Ratio: {_safe(info, 'pegRatio')}\n\n"
        if info.get("profitMargins") is not None:
            out += f"**💰 Profitability**\n"
            out += f"  Profit Margin: {info['profitMargins']*100:.2f}%\n"
            if info.get("operatingMargins") is not None:
                out += f"  Operating Margin: {info['operatingMargins']*100:.2f}%\n"
            if info.get("returnOnEquity") is not None:
                out += f"  ROE: {info['returnOnEquity']*100:.2f}%\n"
            if info.get("returnOnAssets") is not None:
                out += f"  ROA: {info['returnOnAssets']*100:.2f}%\n\n"
        out += f"**🏥 Financial Health**\n"
        out += f"  Debt to Equity: {_safe(info, 'debtToEquity')}\n"
        out += f"  Current Ratio: {_safe(info, 'currentRatio')}\n"
        if info.get("freeCashflow"):
            out += f"  Free Cash Flow: {_format_money(info['freeCashflow'])}\n"
        return out
    except Exception as e:
        return f"❌ Error fetching {ticker}: {e}"


def _financial_summary(ticker: str) -> str:
    try:
        t = yf.Ticker(ticker)
        info = t.info
        if not info:
            return f"❌ No data for {ticker}."
        out = f"**📊 Financial Summary: {ticker}**\n"
        out += f"**{_safe(info, 'longName')}**\n"
        out += "=" * 50 + "\n\n"
        out += f"**🏢 Sector:** {_safe(info, 'sector')} | **Industry:** {_safe(info, 'industry')}\n\n"
        price = info.get("currentPrice") or info.get("regularMarketPrice") or info.get("previousClose")
        prev = info.get("previousClose") or price
        change_pct = ((price - prev) / prev * 100) if (price and prev) else 0
        if price:
            out += f"**💰 Price:** ${price:.2f} ({change_pct:+.2f}% today)\n"
        out += f"**📊 Market Cap:** {_format_money(info.get('marketCap'))}\n"
        out += f"**📈 P/E:** {_safe(info, 'trailingPE')} | **Fwd P/E:** {_safe(info, 'forwardPE')}\n"

        # Try to compute 1Y return from history
        try:
            hist = t.history(period="1y")
            if not hist.empty:
                ret_1y = ((hist["Close"].iloc[-1] / hist["Close"].iloc[0]) - 1) * 100
                vol = float(hist["Close"].pct_change().dropna().std() * (252 ** 0.5) * 100)
                rolling_max = hist["Close"].cummax()
                max_dd = float(((hist["Close"] - rolling_max) / rolling_max).min() * 100)
                out += f"\n**📅 1-Year Performance:**\n"
                out += f"  Total Return: {ret_1y:+.2f}%\n"
                out += f"  Volatility: {vol:.2f}%\n"
                out += f"  Max Drawdown: {max_dd:.2f}%\n"
                out += f"  52W Range: ${_safe(info, 'fiftyTwoWeekLow')} - ${_safe(info, 'fiftyTwoWeekHigh')}\n"
        except Exception:
            pass

        rec = info.get("recommendationKey")
        target = info.get("targetMeanPrice")
        if rec or target:
            out += f"\n**🎯 Analyst Consensus:**\n"
            if rec:
                out += f"  Rating: {rec.upper()}\n"
            if target and price:
                upside = ((target - price) / price) * 100
                out += f"  Mean Target: ${target:.2f} ({upside:+.1f}% upside)\n"
        if info.get("dividendYield"):
            out += f"\n**💵 Dividend Yield:** {info['dividendYield']*100:.2f}%\n"
        return out
    except Exception as e:
        return f"❌ Error fetching {ticker}: {e}"


def _analyst_recommendations(ticker: str) -> str:
    try:
        t = yf.Ticker(ticker)
        info = t.info
        out = f"**🎯 Analyst Recommendations: {ticker}**\n\n"
        rec = info.get("recommendationKey")
        rec_mean = info.get("recommendationMean")
        if rec or rec_mean:
            out += f"**📊 Current Recommendation**\n"
            if rec:
                out += f"  Rating: **{rec.upper()}**\n"
            if rec_mean:
                out += f"  Mean Rating: {rec_mean:.2f}/5\n"
            num = info.get("numberOfAnalystOpinions")
            if num:
                out += f"  Coverage: {num} analysts\n"
            out += "\n"
        sb = info.get("recommendationStrongBuy", 0)
        b = info.get("recommendationBuy", 0)
        h = info.get("recommendationHold", 0)
        s = info.get("recommendationSell", 0)
        ss = info.get("recommendationStrongSell", 0)
        if any([sb, b, h, s, ss]):
            out += f"**📈 Recommendation Breakdown:**\n"
            out += f"  Strong Buy: {sb}\n"
            out += f"  Buy: {b}\n"
            out += f"  Hold: {h}\n"
            out += f"  Sell: {s}\n"
            out += f"  Strong Sell: {ss}\n\n"
        if info.get("targetMeanPrice"):
            price = info.get("currentPrice") or info.get("regularMarketPrice")
            out += f"**💰 Price Targets**\n"
            out += f"  Low: ${_safe(info, 'targetLowPrice')}\n"
            mean = info["targetMeanPrice"]
            upside = ((mean - price) / price * 100) if price else 0
            out += f"  Mean: ${mean} ({upside:+.1f}% upside)\n"
            out += f"  High: ${_safe(info, 'targetHighPrice')}\n"
        return out if len(out) > 60 else f"❌ No analyst data for {ticker}."
    except Exception as e:
        return f"❌ Error fetching {ticker}: {e}"


def _analyst_price_targets(ticker: str) -> str:
    return _analyst_recommendations(ticker)


def _peer_comparison(ticker: str, peers: str = None) -> str:
    try:
        t = yf.Ticker(ticker)
        info = t.info
        if not peers:
            sector = info.get("sector", "")
            sector_peers = {
                "Technology": ["AAPL", "MSFT", "NVDA", "GOOGL", "META"],
                "Financial Services": ["JPM", "BAC", "GS"],
                "Healthcare": ["JNJ", "UNH", "PFE"],
            }
            peer_list = [p for p in sector_peers.get(sector, []) if p != ticker][:3]
        else:
            peer_list = [p.strip().upper() for p in peers.replace(",", " ").split() if p.strip()]
        out = f"**📊 Peer Comparison: {ticker}**\n\n"
        out += f"**Sector:** {_safe(info, 'sector')} | **Industry:** {_safe(info, 'industry')}\n\n"
        out += "**📈 Valuation Metrics:**\n```\n"
        out += f"{'Ticker':<8} {'Price':>10} {'P/E':>8} {'P/B':>8}\n"
        out += "-" * 50 + "\n"
        for tk in [ticker] + peer_list:
            try:
                ti = yf.Ticker(tk).info
                price = ti.get("currentPrice") or ti.get("regularMarketPrice") or 0
                pe = ti.get("trailingPE")
                pb = ti.get("priceToBook")
                out += f"{tk:<8} {price:>10.2f} {(f'{pe:.1f}' if pe else 'N/A'):>8} {(f'{pb:.1f}' if pb else 'N/A'):>8}\n"
            except Exception:
                out += f"{tk:<8} {'Error':>10}\n"
        out += "```\n"
        return out
    except Exception as e:
        return f"❌ Error: {e}"


def _historical_comparison(tickers: str, period: str = "1y") -> str:
    try:
        ticker_list = [t.strip().upper() for t in tickers.replace(",", " ").split() if t.strip()]
        out = f"**📊 Historical Performance Comparison**\n"
        out += f"**Period:** {period}\n\n"
        rows = []
        for tk in ticker_list:
            try:
                hist = yf.Ticker(tk).history(period=period)
                if hist.empty:
                    continue
                ret = ((hist["Close"].iloc[-1] / hist["Close"].iloc[0]) - 1) * 100
                vol = float(hist["Close"].pct_change().dropna().std() * (252 ** 0.5) * 100)
                rolling_max = hist["Close"].cummax()
                max_dd = float(((hist["Close"] - rolling_max) / rolling_max).min() * 100)
                rows.append({"ticker": tk, "return": ret, "vol": vol, "drawdown": max_dd})
            except Exception:
                continue
        if not rows:
            return f"❌ No data for any of: {tickers}"
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
    except Exception as e:
        return f"❌ Error: {e}"


def _stock_news(ticker: str, limit: int = 5) -> str:
    try:
        t = yf.Ticker(ticker)
        news = t.news
        if not news:
            return f"❌ No news available for {ticker}."
        out = f"**📰 Recent News: {ticker}**\n\n"
        from datetime import datetime
        for i, article in enumerate(news[:limit], 1):
            content = article.get("content", article)
            title = content.get("title") or article.get("title", "")
            provider = content.get("provider", {})
            publisher = provider.get("displayName") or article.get("publisher") or "Unknown"
            pub_date = content.get("pubDate") or article.get("providerPublishTime")
            date_str = "Unknown date"
            try:
                if isinstance(pub_date, str):
                    from dateutil import parser
                    date_str = parser.parse(pub_date).strftime("%Y-%m-%d")
                elif isinstance(pub_date, (int, float)):
                    date_str = datetime.fromtimestamp(pub_date).strftime("%Y-%m-%d")
            except Exception:
                pass
            if title:
                out += f"**{i}. {title}**\n"
                out += f"   📅 {date_str} | 📰 {publisher}\n\n"
        return out if "**1." in out else f"❌ No news available for {ticker}."
    except Exception as e:
        return f"❌ Error fetching news for {ticker}: {e}"


# ===========================================================================
# Registry — IDENTICAL shape to mock_tools.AGENT_TOOL_REGISTRY
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
                "ticker": {"type": "string", "description": "US ticker symbol (e.g., AAPL, MSFT). Indices use ^GSPC, ^IXIC."},
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
        "description": "P/E, P/B, ROE, profit margins, debt ratios.",
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

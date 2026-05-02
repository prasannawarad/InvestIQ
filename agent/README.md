# US Stock Recommendation Agent

A context-aware portfolio advisor for US stocks. Reads the user's profile,
portfolio, and current market context, fetches real Yahoo Finance data,
and produces plain-English recommendations grounded in actual numbers.

## Quick start (3 minutes to first response)

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Verify mock data layer (instant, no API key, no internet)
python test_mock_tools.py
# → Should see "ALL TESTS PASSED"

# 3. Verify rebalance logic
python test_rebalance.py
# → Should see "ALL TESTS PASSED"

# 4a. Option A: run with Anthropic
export ANTHROPIC_API_KEY=sk-ant-...

# 4b. Option B: run with local Ollama instead
# In another terminal, make sure Ollama is running, then:
ollama pull qwen3

# 5. First agent run (mock data — instant, no Yahoo calls)
python recommendation_agent.py --mock
# → Default query: "Should I add more Apple to my portfolio?"

# Or with Ollama:
python recommendation_agent.py --mock --ollama --model qwen3

# 6. Custom queries
python recommendation_agent.py --mock "Should I sell some NVIDIA?"
python recommendation_agent.py --mock "How is my portfolio vs S&P 500?"
python recommendation_agent.py --mock "Should I rebalance?"

# Ollama custom query:
python recommendation_agent.py --mock --ollama --model qwen3 "Should I rebalance?"

# 7. Full agent test suite (5 queries, ~30 seconds)
python recommendation_agent.py --mock test

# 8. When ready, swap to real Yahoo Finance data — drop the --mock flag
python recommendation_agent.py "Should I buy more Microsoft?"
```

## Demo user

Alex Kim — 29-year-old software developer in Austin, TX. Generic young
professional. Make $120K/yr, saving for a house in 3 years and retirement.

Owns: AAPL, MSFT, NVDA, VOO, BND, GLD. Currently 78% equity (vs 65% target),
with NVIDIA at 25.5% — concentration risk + drift, deliberate setup so the
rebalance tool has work to do.

To swap users, edit `user_data/user_profile.json` and `user_data/portfolio.json`.
Make sure portfolio holdings reference tickers that exist in `mock_data/` if
you want to keep using mock mode.

## File map

```
us_agent/
├── recommendation_agent.py     ← Main agent (run this)
├── mock_tools.py               ← Mock data layer (reads JSON fixtures)
├── yfinance_tools.py           ← Real data layer (calls Yahoo Finance)
├── rebalance_tool.py           ← Pure-logic rebalance engine
├── user_context.py             ← Loads & formats user/portfolio/market data
├── test_mock_tools.py          ← Unit tests for mock layer (no API key)
├── test_rebalance.py           ← Unit tests for rebalance logic
├── requirements.txt
├── README.md
├── user_data/
│   ├── user_profile.json       ← The user's profile + goals + risk
│   ├── portfolio.json          ← Current holdings + allocation + targets
│   └── market_context.json     ← Macro snapshot
└── mock_data/
    ├── AAPL.json   MSFT.json   NVDA.json
    ├── VOO.json    BND.json    GLD.json
    └── ^GSPC.json  (S&P 500 index)
```

## What the agent can do

11 tools wired to Claude:

- **get_historical_data** — price history, returns, volatility, 52w range
- **get_stock_price** — current snapshot (price, P/E, market cap, beta)
- **get_company_info** — sector, industry, business summary
- **get_key_ratios** — P/E, P/B, ROE, profit margins, debt/equity
- **get_financial_summary** — one-shot comprehensive view
- **get_analyst_recommendations** — buy/hold/sell breakdown + price targets
- **get_analyst_price_targets** — targets with implied upside %
- **get_peer_comparison** — vs sector peers (e.g., AAPL vs MSFT vs NVDA)
- **get_historical_comparison** — multi-ticker performance ranking
- **get_stock_news** — recent headlines
- **propose_rebalance** — concrete BUY/SELL trade plan with $ amounts

The agent picks 1-3 tools per query based on intent.

## Mock vs real — what's the difference

**Mock mode** (`--mock` flag): tools read from `mock_data/*.json`. Sub-millisecond
per call. No internet. Fully deterministic. Use for fast iteration, debugging
prompts, demo backup if WiFi is flaky.

**Real mode** (default): tools call Yahoo Finance via `yfinance` library. ~2-5
seconds per call. Free, no API key. Same tool names, same output shapes — Claude
can't tell the difference.

The agent code is identical in both modes. Only the data source swaps.

## Using Ollama instead of Anthropic

The default agent path uses Anthropic and requires `ANTHROPIC_API_KEY`.
To use a local Ollama model, add `--ollama` and choose a tool-capable model:

```bash
ollama pull qwen3
python recommendation_agent.py --mock --ollama --model qwen3 "Should I add more Apple?"
```

You can also set the model with an environment variable:

```bash
export OLLAMA_MODEL=qwen3
python recommendation_agent.py --mock --ollama "Should I rebalance?"
```

Ollama must be running locally at `http://localhost:11434`. Mock mode still uses
local JSON market fixtures; real mode still uses Yahoo Finance through
`yfinance`.

## Using Groq instead of Ollama or Anthropic

Create a local `.env` file:

```bash
cp .env.example .env
```

Then edit `.env` and set:

```text
GROQ_API_KEY=gsk_your_real_key_here
GROQ_MODEL=qwen/qwen3-32b
AGENT_USE_MOCK=0
AGENT_USE_GROQ=1
AGENT_USE_OLLAMA=0
```

Run the CLI with Groq and real Yahoo Finance data:

```bash
python recommendation_agent.py --groq --model qwen/qwen3-32b "Should I rebalance?"
```

Run Groq with mock market data:

```bash
python recommendation_agent.py --mock --groq --model qwen/qwen3-32b "Should I add more Apple?"
```

The Groq path uses the OpenAI-compatible Chat Completions API and the same local
portfolio tools as Ollama. The model asks for a tool, this app executes it, and
the tool result is sent back to Groq for the final answer.

## Web UI

Start the local browser UI:

```bash
python web_app.py
```

Then open:

```text
http://localhost:8000
```

The UI uses Ollama by default with `qwen2.5:7b` and mock market data, so it does
not need an Anthropic API key. Use the provider dropdown in the UI to switch to
Groq. Groq requests require `GROQ_API_KEY` in the terminal where `web_app.py`
is running. If `.env` sets `AGENT_USE_GROQ=1`, the UI opens with Groq selected.

## Demo queries that show off context-awareness

These queries are specifically designed to expose whether the agent is using
the user's portfolio context:

| Query | What a context-blind agent gets wrong | What yours does right |
|---|---|---|
| "Should I add more Apple?" | Says "yes, AAPL is strong" | Notes user already owns 17% in AAPL |
| "What about NVIDIA?" | Recommends based on stock alone | Flags 25.5% concentration risk |
| "Should I shift more into stocks?" | "Yes if bullish on market" | Notes already 78% equity vs 65% target |
| "Should I rebalance?" | Generic answer | Calls propose_rebalance, shows specific trades |
| "Am I on track for my house?" | Generic FIRE math | References goal date + current drift |

If the agent gets any of these wrong, the user context wiring isn't working.

## Switching to a different user

Edit `user_data/user_profile.json` and `user_data/portfolio.json`. The agent
reads these on every request. No code changes needed.

For mock mode, make sure the portfolio's holdings list only references tickers
that exist in `mock_data/`. For real mode, any valid US ticker works.

## Troubleshooting

**"No module named 'anthropic'"** → `pip install -r requirements.txt`

**"ANTHROPIC_API_KEY not set"** → `export ANTHROPIC_API_KEY=sk-ant-...`

**Mock tests fail** → check that all JSON files in `user_data/` and `mock_data/`
are valid JSON (no trailing commas, etc.)

**Real mode returns "❌ No data for X"** → either the ticker is invalid,
Yahoo Finance is down, or your network is blocking yahoo.com

**Agent doesn't use the user's portfolio** → run `python user_context.py`
to see what context is being injected. If it's empty, check `user_data/` files exist.

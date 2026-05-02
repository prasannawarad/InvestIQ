"""
test_mock_tools.py

Verifies the mock data layer works without network/API. Run BEFORE the agent.
"""

from mock_tools import execute_tool, AGENT_TOOL_REGISTRY, get_tool_schemas_for_claude


def section(title):
    print(f"\n{'=' * 60}\n{title}\n{'=' * 60}")


def check(name, condition):
    status = "✓ PASS" if condition else "✗ FAIL"
    print(f"  {status}  {name}")
    return condition


def main():
    all_passed = True

    section("TEST 1: Tools registered")
    print(f"Tools: {list(AGENT_TOOL_REGISTRY.keys())}")
    all_passed &= check("11 tools registered (10 data + propose_rebalance)", len(AGENT_TOOL_REGISTRY) == 11)

    section("TEST 2: get_historical_data — AAPL")
    out = execute_tool("get_historical_data", {"ticker": "AAPL", "period": "1y"})
    print(out)
    all_passed &= check("Has price data", "Latest Close" in out)
    all_passed &= check("Has return metric", "Total Return" in out)
    all_passed &= check("Uses USD", "$" in out)

    section("TEST 3: get_key_ratios — NVDA")
    out = execute_tool("get_key_ratios", {"ticker": "NVDA"})
    print(out)
    all_passed &= check("Has P/E", "P/E" in out)

    section("TEST 4: get_financial_summary — MSFT")
    out = execute_tool("get_financial_summary", {"ticker": "MSFT"})
    print(out)
    all_passed &= check("Has comprehensive view", len(out) > 400)

    section("TEST 5: get_analyst_recommendations — AAPL")
    out = execute_tool("get_analyst_recommendations", {"ticker": "AAPL"})
    print(out)
    all_passed &= check("Has rating", "Rating" in out)

    section("TEST 6: get_peer_comparison — auto-pick peers")
    out = execute_tool("get_peer_comparison", {"ticker": "AAPL"})
    print(out)
    all_passed &= check("Auto-picked sector peers", "MSFT" in out or "NVDA" in out)

    section("TEST 7: get_historical_comparison — vs S&P 500")
    out = execute_tool("get_historical_comparison", {"tickers": "AAPL,MSFT,NVDA,^GSPC", "period": "1y"})
    print(out)
    all_passed &= check("Has rankings", "Rank" in out or "🥇" in out)

    section("TEST 8: propose_rebalance — default")
    out = execute_tool("propose_rebalance", {})
    print(out)
    all_passed &= check("Generates trade plan", "SELL" in out and "BUY" in out)
    all_passed &= check("References user goal", "house" in out.lower() or "goal" in out.lower())
    all_passed &= check("Uses USD formatting", "$" in out)

    section("TEST 9: propose_rebalance — conservative override")
    out = execute_tool("propose_rebalance", {"target_equity": 50, "target_debt": 40, "target_gold": 5, "target_cash": 5})
    print(out)
    all_passed &= check("Larger sells with conservative target", "SELL" in out)

    section("TEST 10: Unknown ticker handled")
    out = execute_tool("get_stock_price", {"ticker": "FAKE_TICKER"})
    print(out)
    all_passed &= check("Returns helpful error", "No mock data" in out)

    print(f"\n{'=' * 60}")
    print(f"OVERALL: {'✓ ALL TESTS PASSED' if all_passed else '✗ SOME TESTS FAILED'}")
    print("=" * 60)


if __name__ == "__main__":
    main()

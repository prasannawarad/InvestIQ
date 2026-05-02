"""
test_rebalance.py

Unit tests for rebalance logic. No API key, no network.
"""

from rebalance_tool import propose_rebalance


def section(title):
    print(f"\n{'=' * 60}\n{title}\n{'=' * 60}")


def check(name, condition):
    status = "✓ PASS" if condition else "✗ FAIL"
    print(f"  {status}  {name}")
    return condition


def main():
    all_passed = True

    section("TEST 1: Default rebalance with current portfolio")
    out = propose_rebalance()
    print(out)
    all_passed &= check("Returns non-empty plan", len(out) > 100)
    all_passed &= check("Identifies SELL actions", "SELL" in out)
    all_passed &= check("Identifies BUY actions", "BUY" in out)
    all_passed &= check("Mentions tickers from holdings",
                       any(t in out for t in ["AAPL", "MSFT", "NVDA", "VOO", "BND"]))
    all_passed &= check("References user goal", "house" in out.lower() or "goal" in out.lower())
    all_passed &= check("Uses USD", "$" in out)

    section("TEST 2: Conservative override (50% equity)")
    out = propose_rebalance(target_equity=50, target_debt=40, target_gold=5, target_cash=5)
    print(out)
    all_passed &= check("Generates plan with conservative targets", "SELL" in out)

    section("TEST 3: Already balanced (no rebalance)")
    out = propose_rebalance(target_equity=78, target_debt=12, target_gold=3, target_cash=7)
    print(out)
    all_passed &= check("Recognizes no rebalance needed",
                       "not needed" in out.lower() or "within tolerance" in out.lower())

    section("TEST 4: Invalid target sums")
    out = propose_rebalance(target_equity=80, target_debt=30, target_gold=5, target_cash=5)
    print(out)
    all_passed &= check("Returns error", "ERROR" in out)

    print(f"\n{'=' * 60}")
    print(f"OVERALL: {'✓ ALL TESTS PASSED' if all_passed else '✗ SOME TESTS FAILED'}")
    print("=" * 60)


if __name__ == "__main__":
    main()

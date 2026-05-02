# @investiq/engine

All deterministic math. **No LLM calls in this package, ever.** If a number appears in the UI, it came from here.

**Status (May 2026):** Person 3 deliverables (`/api/engine/*`, `recommendRebalance`, `simulateScenario`, `generateMatches`, tests in `src/index.test.ts`) are wired into `/rebalance` with **Confirm → Supabase**. Team gaps live elsewhere — see repo root **`README.md` → Implementation status** (Person 1: `/settings`; Person 4: `DEMO.md`).

## Why deterministic-only

LLMs are bad at multi-step arithmetic on long numbers. We computed the engine separately so that:

1. The numbers shown to judges are correct
2. Kuber narrates engine output, but doesn't compute it
3. Tests can verify the engine without flaky LLM dependencies

## Public API (Person 3 implements all of these)

### `simulateScenario(portfolio, scenario) → ScenarioResult`

Apply a what-if scenario and return projected impact.

Supported scenarios:
- `market-drop-20` — equity holdings drop 20%, debt drops 5%, gold rises 8%
- `market-drop-30` — equity drops 30%, debt drops 8%, gold rises 12%
- `inflation-stays-high` — debt drops 7%, gold rises 10%, equity flat
- `withdraw-20-percent` — user pulls 20% to cash; show what's left
- `lose-job-need-emergency` — what 6 months of income looks like vs. portfolio

Result includes: projected total value, projected allocation, per-goal timeline impact (months delayed/improved), recommendation flag (true if action is needed).

### `recommendRebalance(portfolio, target, source) → RebalanceRecommendation`

Generates specific trades to bring a portfolio back in line with its target allocation. 

**How Rebalancing Works (in Layman's Terms):**
When you set up a portfolio, you have a blueprint (e.g., 70% stocks, 30% bonds). Over time, as markets move, some pieces grow faster than others, causing your portfolio to "drift" from its blueprint. The engine calculates exactly what to buy and sell to fix this, but adapts its strategy based on the `source` (the context of *why* we are rebalancing):

- `drift` (Routine Tune-up)
  - **The Trigger:** An asset class has drifted by 5% or more from its target.
  - **The Action:** It sells exactly enough of the "overweight" winners to buy the "underweight" losers, restoring the portfolio back to 100% of the target blueprint.

- `scenario` (Stress-Testing)
  - **The Trigger:** You just ran a "What-If" scenario (e.g., a 30% market crash) and want to know how Kuber would fix the damage.
  - **The Action:** It still uses a 5% drift threshold, but it only corrects **85%** of the gap. This prevents the engine from making massive, over-confident trades based purely on a hypothetical simulation.

- `panic` (Damage Control)
  - **The Trigger:** You are reacting to scary real-world news and hit the "Panic" button.
  - **The Action:** It uses a tighter threshold (3%) to catch smaller drifts, but only corrects **60%** of the gap. Why? Because panicking often leads to terrible timing (selling at the bottom). By intentionally doing a "partial" rebalance, the engine safely trims risk without locking in massive losses. It forces you to take small, defensive steps rather than blowing up your portfolio.

- `discover` (New Money)
  - **The Trigger:** You have fresh cash to invest.
  - **The Action:** Instead of selling anything, the engine simulates having a 3% "new money" budget and buys *only* the asset classes where you are underweight. No forced selling, just filling in the gaps.

**The Math Under the Hood:**
After calculating the dollar amount to move between asset classes, the engine deterministically picks the specific holdings to sell or buy. It scales the "buy" amounts to perfectly match the available cash from the "sells". Finally, it calculates the estimated **tax cost** (e.g., assuming a 10% hit on long-term gains) and the **goal impact** (how these trades will delay or speed up your goals).

### `computeFitScore(holding, userProfile) → number (0-100)`

How well does this holding fit the user's current goals and risk profile?

Inputs: holding's risk profile (derived from asset_class + sector), user's risk_tolerance, time to nearest goal, current weight vs. recommended weight.

Output: integer 0-100. UI uses thresholds — green ≥80, amber 60-79, red <60.

### `computePortfolioHealth(portfolio, userProfile) → PortfolioHealth`

Calculates the overall health score of the portfolio (0-100) using a weighted average of three main components. Think of it like a routine medical checkup for your portfolio:

1. **Personal Fit (60% Weight)**
   *The "Does this actually make sense for YOU?" test.*
   We check every single investment you own to see if it belongs in your portfolio based on your life situation (timeline, risk tolerance, over-concentration).

2. **Sticking to the Plan (30% Weight)**
   *The "Are you drifting off course?" test.*
   Measures how strictly you are sticking to your original target allocation. The further you drift away from your plan, the lower this score gets.

3. **Diversification (10% Weight)**
   *The "Don't put all your eggs in one basket" test.*
   Checks if you have a healthy mix of different *categories* of investments (like stocks, bonds, gold, and cash). Spreading money out gives a perfect score, while being 100% in one bucket drops the score.

The final score provides a simple verdict:
- **80 to 100 (Strong):** Portfolio is perfectly matched to life goals.
- **70 to 79 (Good):** Generally on track, minor tweaks needed.
- **Below 70 (Needs Attention):** Drifted too far, or taking on too much risk.

### `computeGoalImpact(portfolio, trades, goals) → GoalImpact[]`

Given a portfolio and proposed trades, project forward to each goal's target date and report how many months earlier or later the goal is reached vs. doing nothing.

Use a simple expected-return model — 8% for equity, 6% for debt, 4% for gold, 1% for cash. Nothing fancier. Document the assumption in the rationale.

### `generateMatches(filters, userProfile, portfolio) → MatchCandidate[]`

Generate ranked discovery candidates for `/Kuber`.

- Returns 6-10 candidates sorted by `match_score` desc.
- Uses a deterministic fictional universe in `src/universe.ts`.
- Scoring factors: industry, size, risk, diversification, keyword match.

## Out of scope for hackathon

- Tax-lot accounting (use a flat 10% LTCG estimate for sells of holdings older than 1 year, 0 for newer)
- Transaction fees (always $0 for the demo — make it clear in the receipt)
- International tax / regulations
- Real Monte Carlo simulation (use point estimates)

## Testing

Person 3 must write at least one test per public function before integration. Place tests in `src/*.test.ts`. Pure functions, no mocks needed.

Run:

```bash
pnpm -C packages/engine test
```

## Mock data usage in engine

- `src/universe.ts` is intentionally mock/fictional and is only for discovery ranking.
- Portfolio/user/goal values are real runtime inputs passed from the web app (currently from Supabase seed data).

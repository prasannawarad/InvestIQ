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

Compare current allocation to target. If drift > 5pp on any class, generate trades to fix.

Source flag tells the narrator (Kuber) the context:
- `drift` — routine "your allocation drifted, here's the fix"
- `scenario` — "given the scenario you ran, here's what I'd do"
- `panic` — bias toward more conservative trades, smaller moves
- `discover` — output trades to add new money, not move existing

### `computeFitScore(holding, userProfile) → number (0-100)`

How well does this holding fit the user's current goals and risk profile?

Inputs: holding's risk profile (derived from asset_class + sector), user's risk_tolerance, time to nearest goal, current weight vs. recommended weight.

Output: integer 0-100. UI uses thresholds — green ≥80, amber 60-79, red <60.

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

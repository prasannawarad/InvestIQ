# @investiq/data

The single source of truth for demo data shapes. Everyone reads from here.

## What's in here

- `src/schemas.ts` — Zod schemas for `UserProfile`, `Portfolio`, `MarketContext`, and the recommendation/scenario types
- `src/fixtures/` — The three JSON files (`user_profile.json`, `portfolio.json`, `market_context.json`) for the demo user (Priya)
- `src/index.ts` — Public exports: types and a `loadDemoData()` helper

## Runtime data source (current)

- Primary demo runtime data is seeded in Supabase via `02_supabase_seed_mock_data.sql`.
- The JSON fixtures in this package remain important as:
  - schema contract examples,
  - fallback/offline fixtures,
  - deterministic test inputs.

## Contract

The schemas are the API. Anyone changing a JSON shape MUST update the schema first, then update the fixtures, then notify Persons 1, 2, and 3 in chat. No silent shape changes — they will break the engine and the agent.

## Currency note

The challenge persona is Indian (Priya, Pune), but we agreed to display dollars throughout the demo. Two options:
1. Keep INR in fixtures, format as $ in the UI (lazy, judges may notice)
2. Convert fixtures to USD with a believable US-equivalent persona

Decide on Day 1 and stick to it. As of writing, fixtures are in USD with Priya's persona kept (cultural anchor for Kuber).

## Adding a new fixture field

1. Update the relevant Zod schema in `schemas.ts`
2. Update the fixture JSON to match
3. Run `pnpm type-check` from the repo root to confirm nothing broke
4. Tell the team

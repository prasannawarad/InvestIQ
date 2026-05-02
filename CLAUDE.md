# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Read these first

The project ships with deeper docs that override this file on conflict:

- [PROJECT_SPEC.md](PROJECT_SPEC.md) — source of truth for product, routes, schemas, engine API, agent API. Read before generating code in any package.
- [CODEX.md](CODEX.md) — fast 5-minute onboarding (rules, ownership, critical demo paths).
- [DEMO.md](DEMO.md) — the word-for-word three-day Priya demo script. Use it to decide whether a feature is in scope ("does this serve the demo?").
- Each package has its own `README.md` with a "Public API" section — read it before touching that package.

## Commands

Run all commands from the repo root unless noted. Turborepo fans out to workspaces.

```bash
pnpm install              # bootstrap workspace
pnpm dev                  # turbo run dev — web on :3000 + extension build watcher
pnpm build                # turbo run build (respects ^build deps)
pnpm lint                 # turbo run lint
pnpm type-check           # turbo run type-check (each package runs `tsc --noEmit`)
pnpm clean                # clean turbo cache + node_modules

# One-time scaffolders (idempotent — skip if already initialized)
pnpm setup:web            # create-next-app into apps/web
pnpm setup:extension      # create-plasmo into apps/extension
```

Per-package work: `cd packages/<name> && pnpm type-check`. Add deps locally with `cd <app-or-package> && pnpm add <name>` — don't add at root.

Tests: engine functions are pure; place tests at `packages/engine/src/*.test.ts` (no mocks needed). No test runner is wired up yet at the repo level — confirm with the team before adding one.

Toolchain pins (do not upgrade mid-hackathon): Node ≥ 20, pnpm ≥ 9, Next.js 16, React 19, TypeScript 5.6+, Zod 3.23+.

## Architecture

InvestIQ is a **pnpm + Turborepo monorepo** with two apps and five packages. The boundaries are intentional and load-bearing — do not move files between packages without explicit instruction.

### Workspace dependency graph

```
apps/web ────────┐
apps/extension ──┤──► @investiq/ui ──► (tokens + shared components)
                 ├──► @investiq/kuber ──► @investiq/engine ──► @investiq/data
                 └──► @investiq/data (zod schemas + demo fixtures)
```

- **`packages/data`** — Zod schemas in [src/schemas.ts](packages/data/src/schemas.ts) are the contract for every shape (`UserProfile`, `Portfolio`, `Holding`, `MarketContext`, `RebalanceRecommendation`, `Trade`, `GoalImpact`). Three demo JSON fixtures in `src/fixtures/` (Priya). If a TS type and a Zod schema disagree, **the schema wins**. Update the schema first, then the fixtures, then notify the team.
- **`packages/engine`** — Pure deterministic math: `simulateScenario`, `recommendRebalance`, `computeFitScore`, `computeGoalImpact`. **No LLM calls in this package, ever.** Every number shown to judges originates here.
- **`packages/kuber`** — The AI agent. Groq (`llama-3.3-70b-versatile`, OpenAI-compatible API) for chat/narration/jargon, ElevenLabs streaming TTS (Daniel voice, `eleven_turbo_v2_5`). Public API streams tokens: `chat`, `narrate`, `explainJargon`, `speak`. **Kuber narrates engine output but never computes numbers.** Persona, voice rules, and the response formula are locked in the v1.0 system prompt that lives in `src/prompts/` — see "Kuber persona contract" below before editing prompts or generating sample dialogue.
- **`packages/ui`** — Design tokens (`@investiq/ui/tokens`) + components shared between web and extension. Default-cream palette + a `/panic` cream override. Use tokens for colors; do not hardcode hex.
- **`apps/web`** — Next.js 16 App Router (created on demand by `setup:web`). Owns all routes (`/home`, `/current`, `/current/[symbol]`, `/preview/[symbol]`, `/Kuber`, `/Kuber/discover`, `/rebalance`, `/panic`, `/settings`, `/profile`, `/extension`, `/help`) and all `/api/kuber/*` + `/api/engine/*` routes (which read fixtures server-side and stream SSE for Kuber endpoints). Floating Kuber widget mounts in the root layout, hidden on `/Kuber/*`, `/rebalance`, `/panic`. The Figma Make export is the design system — paste into `src/app/*` and rewire imports to workspace packages; do not redesign.
- **`apps/extension`** — Plasmo Chrome MV3 + React. Content script overlay slides Kuber chat onto third-party pages (CNBC, apple.com); calls `${NEXT_PUBLIC_APP_URL}/api/kuber/chat` for live questions. Day 1 demo response is hardcoded for reliability.

### Routing rule for Kuber

Quantitative questions (scenarios, rebalancing, "should I sell?") trigger a short verbal acknowledgment, then **navigate to `/rebalance`** with `?source=` and `?name=` query params. Discovery questions navigate to `/Kuber/discover`. Kuber does **not** compute or display rebalance recs in the chat panel itself.

### Kuber persona contract (v1.0 prompt)

When writing prompts, sample dialogue, hardcoded demo responses, or anything else Kuber "says", these constraints are non-negotiable. They're in addition to PROJECT_SPEC.md §5.3.

- **Persona:** 45-year-old "financial older sibling," 25 years of market experience, warm/empathetic/upbeat with "chill confidence." Never robotic, never formal.
- **5-sentence Financial Simplifier formula** — every response, in this order, ≤ 5 sentences:
  1. Empathy & intent (validate the feeling, with natural fillers)
  2. Plain-language meaning (explain to a smart 15-year-old, no Investopedia)
  3. Everyday analogy (weather, cars, packing, cooking)
  4. Why it matters / what could go wrong for *this* user
  5. Concrete next step — for fear/situations, the step is often "do nothing right now"
- **Intent classification** drives tone: `Term` → calm/educational, `Situation` → reassure first, `Portfolio` → diagnose neutrally (never shame past decisions), `Fear` → grounding before context.
- **TTS-shaped prose:** conversational fillers ("okay", "hm", "well", "listen"), em dashes for pauses, exclamation points for brightness. **Strict "um/so" rule:** if "um" appears it must be followed by "so" after a pause (e.g. `"Well, um—so, let's look at your portfolio."`). For other pauses use "so yeah" / "anyway".
- **Hard guardrails:** finance-only domain (playfully decline off-topic), translate every jargon term inline, probabilistic language only ("could", "may", "historically tends to") — never predict, never recommend specific tickers, never announce tool calls, never parrot the user's question.
- **Demo-mode fallbacks:** the four `/home` chip questions and the three scenario picks have hardcoded responses in `packages/kuber/src/demo-responses.ts` for when Groq is slow. Hardcoded responses must follow the same persona contract.

### `/rebalance` modes (URL-driven)

- `/rebalance` → drift mode (default; engine compares current vs. target)
- `/rebalance?source=panic` → panic mode (smaller, more conservative trades)
- `/rebalance?source=scenario&name=market-drop-20` → scenario mode

## Project conventions

- **TypeScript strict mode.** No `any` without an inline comment explaining why.
- **No LLM calls in `packages/engine`.** **No portfolio math in `packages/kuber`.** This separation is enforced by code review, not tooling.
- **Schemas in `packages/data/src/schemas.ts` are the API.** No silent shape changes — schema → fixtures → notify team, in that order.
- **Plain language in user-facing text.** No "P/E ratio", "AUM", "expense ratio", etc. without an `(i)` tooltip translation.
- **No new colors / fonts / radii.** Import from `@investiq/ui/tokens`. The `/panic` page uses the `backgroundPanic` token, no other palette changes.
- **Stream LLM output** wherever possible — the demo's perceived latency depends on it.
- **Use existing demo fixtures** (`packages/data/src/fixtures/`) for any default state. Don't invent new mock users.
- **Out-of-scope features** are listed in [PROJECT_SPEC.md §10](PROJECT_SPEC.md) (no DB, no Plaid, no Monte Carlo, no tax-lot accounting, no real fees, no i18n, etc.). If you think one is needed, surface the question first.
- **Commit message format:** `[area] short description` (e.g. `[engine] implement market-drop-20 simulator`).
- **When uncertain, narrow scope.** A working `/home` is worth more than a half-built `/preview/[symbol]`.

## Currency caveat

Fixtures are labeled `INR` but the UI displays `$` by relabeling, not converting. This is a demo-day shortcut documented in [PROJECT_SPEC.md §3.2](PROJECT_SPEC.md). Don't "fix" it without team agreement.

## Critical demo paths

These must work end-to-end at all times. Test daily; fix breakage before adding features. See [CODEX.md §8](CODEX.md) for the full list — the load-bearing ones are: streaming Groq response on `/Kuber` within ~2s, `/rebalance?source=scenario&name=market-drop-20` rendering engine-computed projections, and Confirm on `/rebalance` redirecting to `/home` with updated state.

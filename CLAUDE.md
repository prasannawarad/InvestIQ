# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

InvestIQ is a personal finance AI co-pilot built for the Goldman Sachs / UTD JSOM hackathon (May 2026). The central agent — **Kuber** — explains portfolios in plain language, suggests rebalancing, and provides contextual investing help across three surfaces: a discovery page (`/Kuber`), a floating widget on every page, and a Chrome extension overlay on third-party sites.

## Commands

```bash
# Install all workspace packages (pnpm required)
pnpm install

# Run all apps in dev mode (web on :3000, extension on :1012)
pnpm dev

# Type-check all packages
pnpm type-check

# Lint all packages
pnpm lint

# Build all packages
pnpm build

# Run engine unit tests (only package with tests)
cd packages/engine && pnpm test

# Extension only
pnpm dev:extension
pnpm build:extension
```

**First-time setup:**
```bash
pnpm install
cp apps/web/.env.example apps/web/.env  # fill in Supabase, Groq, ElevenLabs keys
pnpm dev
```

## Monorepo Structure

```
apps/web/        # Next.js 16 App Router — main product UI + API routes
apps/extension/  # Plasmo Chrome MV3 extension — contextual chat overlay
packages/kuber/  # Groq streaming client, ElevenLabs TTS, system prompt, context serializer
packages/engine/ # Pure math — rebalancing, scenarios, trade generation (NO LLM calls)
packages/data/   # Zod schemas, mock fixtures, type contracts shared across all packages
packages/ui/     # Design tokens + shared React components
packages/config/ # Shared TypeScript config
```

## Architecture

### Data Flow
1. **Auth** — Supabase SSR client in route handlers; never in client components
2. **Portfolio context** — `packages/kuber` serializes `UserProfile + Portfolio + MarketContext` into Groq system prompts via `serializeKuberContext()`
3. **LLM** — Groq Llama-3.3-70b-versatile via `/api/kuber/chat` (streaming); `packages/kuber/src/demo-responses.ts` provides fallbacks when keys are missing — never remove them
4. **Engine** — All rebalancing and scenario math is deterministic (no LLM); only lives in `packages/engine`
5. **Supabase writes** — Only happen on explicit Confirm actions: `/rebalance` → upserts `portfolios`/`holdings`; `/Kuber` discovery → upserts via `applyDiscoveryCommit`

### API Routes (`apps/web/src/app/api/`)

| Route | Purpose |
|---|---|
| `/api/kuber/chat` | Streaming Groq chat (widget + extension) |
| `/api/kuber/speak` | ElevenLabs TTS audio stream |
| `/api/kuber/jargon` | Three-layer jargon explanation |
| `/api/kuber/narrate` | LLM narration of rebalance recommendation |
| `/api/engine/matches` | Discovery candidates (POST with filters) |
| `/api/engine/rebalance` | Rebalance math + receipt |
| `/api/engine/scenario` | What-if scenario projections |

### Route Deep-Link Parameters

- `/rebalance?source=panic` — Conservative bias
- `/rebalance?source=scenario&name=market-drop-20` — What-if scenario mode (also: `market-drop-30`, `inflation-stays-high`, `withdraw-20-percent`, `lose-job-need-emergency`)
- `/Kuber/preview/[symbol]?score=` — Pre-computed fit score passed from discovery basket

### Kuber Surfaces — Architectural Rule

Three surfaces, one agent — **do not conflate them**:
- `/Kuber` — Discovery only (filters → match candidates → add → confirm). **No chat panel here.**
- Floating widget (`FloatingKuber.tsx`) — Quick Q&A and jargon; present on all non-auth pages. Communicates via `src/lib/floatingKuberEvents.ts` custom event bus (e.g., pre-fill from Ask-Kuber chips).
- Chrome extension (`apps/extension/`) — Plasmo MV3, Shadow DOM isolation. Posts to `/api/kuber/chat` on the deployed web app. Uses injected CSS keyframes (not Framer Motion) for animations due to shadow DOM constraints.

### Package Ownership

- **Person 1:** `apps/web` (shell, `/home`, `/current`, `/panic`, `/settings`, `/profile`) + `packages/ui`
- **Person 2:** `packages/kuber` + `/Kuber` discovery page + floating widget
- **Person 3:** `packages/engine` + `/rebalance` + `/api/engine/*`
- **Person 4:** `apps/extension` + demo execution

## Coding Standards

- TypeScript strict mode everywhere — no `any`, no silent schema mutations
- Zod first: all schema changes start in `packages/data`, then flow to consumers
- No LLM calls in `packages/engine` — engine is pure deterministic math
- No business logic in `apps/web` UI files — keep logic in packages
- `@investiq/ui/tokens` is the single source of truth for colors, spacing, and typography
- Supabase client: use SSR client (`@supabase/ssr`) in route handlers and server components; never expose service role key client-side
- Responsive layout: sidebar is `md:flex`-gated at 240px; all page `<main>` must use `px-4 py-10 md:ml-60 md:px-8 md:py-12` — never bare `ml-60`

## Design Tokens

Dark-first design system via `@investiq/ui/tokens`:
- **Accent:** Teal `#2dd4bf`
- **Fonts:** DM Serif Display (headers) / Inter (body)
- **Fit score colors:** Green ≥80, Amber 60–79, Coral <60
- Helper: `fitScoreColor(score)` in tokens returns the correct color token

## Demo Persona

The entire demo is built around **Priya Sharma** — 38-year-old schoolteacher, $22,300 portfolio, two goals (house 3yr, retirement 26yr). Supabase seed SQL (`02_supabase_seed_mock_data.sql`) is the canonical runtime data; `packages/data/src/fixtures/` are the schema contracts and offline fallback. Re-run the seed SQL to reset demo state.

## Environment Variables (`apps/web/.env`)

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
GROQ_API_KEY
GROQ_MODEL=llama-3.3-70b-versatile
ELEVENLABS_API_KEY
ELEVENLABS_VOICE_ID
ELEVENLABS_MODEL_ID=eleven_turbo_v2_5
NEXT_PUBLIC_APP_URL
```

## Key Constraints

- **Demo-safe by default** — `packages/kuber/src/demo-responses.ts` fallbacks fire when Groq is unavailable. Do not remove them.
- **`packages/engine/src/universe.ts`** is intentionally fictional — it exists only for `generateMatches()` scoring on `/Kuber`. Never use it as real financial data.
- **Only `packages/engine` has unit tests** — `src/index.test.ts` covers all public math functions. All other packages have no test suite.
- **ElevenLabs latency budget** — target <2s to first audio chunk. `eleven_turbo_v2_5` is the required model; don't switch to larger models.
- **Extension Shadow DOM** — Plasmo injects into an isolated shadow root. Use injected `<style>` CSS keyframes instead of Framer Motion for extension animations.

## Supplementary Docs

- `CODEX.md` — 30-second pitch + quick onboarding
- `PROJECT_SPEC.md` — Exhaustive product and API spec
- `DEMO.md` — Word-for-word 5.5-min demo script (Priya's 3-day narrative)

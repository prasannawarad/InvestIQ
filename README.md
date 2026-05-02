# InvestIQ

Portfolio management for beginner investors. Built for the Goldman Sachs / UTD JSOM hackathon, May 2026.

InvestIQ helps a non-savvy user track investments, understand risk in plain language, and rebalance with confidence — including during scary headlines. **Kuber** is the AI guide woven through every surface: a calm, patient narrator who never uses jargon without translating it.

The product is intentionally narrow: it follows one user (Priya, a 38-year-old teacher with a $22.3K portfolio, a 3-year house goal, and a 26-year retirement goal) through a three-day demo arc covering education, exploration, and a market shock.

---

## Table of contents

- [What it does](#what-it-does)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Repository layout](#repository-layout)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Running the apps](#running-the-apps)
- [Routes and APIs](#routes-and-apis)
- [Packages reference](#packages-reference)
- [Supabase setup](#supabase-setup)
- [Demo data and the Priya narrative](#demo-data-and-the-priya-narrative)
- [Scoring rubric](#scoring-rubric)
- [Team](#team)
- [Conventions](#conventions)

---

## What it does

InvestIQ has three Kuber-powered surfaces and one shared portfolio engine.

**Web app surfaces**
- `/home` — dashboard with a plain-language hero sentence, three core stats, a journey chart, ask-Kuber prompt chips, and a holdings preview.
- `/current` — holdings grid with per-holding fit scores; click through to `/current/[symbol]` for a detail page that explains *why* a holding fits (or doesn't) the user's risk profile, horizon, and goals.
- `/Kuber` — discovery agent. Filter by goal, risk, and theme; the engine returns ranked candidates with a `why_match` rationale; tap one for `/Kuber/preview/[symbol]` (research layout); add to a basket and **Review & Confirm** writes the new holding to Supabase.
- `/rebalance` — three modes (drift, scenario, panic) with a transparent trade receipt: tax cost, fees, and projected goal impact. Every trade has a "Why this trade" expansion. Confirm persists to Supabase.
- `/panic` — calm full-page response to a market shock. The default message is "Take a breath. Most of the time, the right thing to do is nothing."
- `/settings` — preference form (communication tone, notification frequency, voice on/off, risk profile). **Save persists to Supabase** (`profiles.preferences` JSONB + `profiles.risk_profile` JSONB).
- `/profile`, `/help`, `/extension` — user identity & goals, glossary/FAQ, and the extension explainer page.

**Floating Kuber widget** — a draggable bottom-right chat bubble present on every web route. Streams responses from Groq, can speak via ElevenLabs, exposes suggestion chips, and carries page context into the system prompt.

**Chrome extension** — a Plasmo MV3 build that injects the same Kuber bubble + panel into any web page (e.g., a CNBC article). The extension calls the deployed web app's `/api/kuber/*` endpoints with a snippet of page context, so Kuber can answer "what does this mean for my portfolio?" while the user reads the news.

**Engine** — deterministic portfolio math (no LLM, no unseeded RNG). Computes drift, simulates scenarios, generates rebalance recommendations, ranks discovery matches, and projects months-to-goal under post-trade allocation.

---

## Architecture

```
                      ┌───────────────────────────────┐
                      │         Supabase              │
                      │  auth · profiles · goals      │
                      │  portfolios · holdings        │
                      │  market_contexts · RLS        │
                      └──────────────┬────────────────┘
                                     │
                ┌────────────────────┼────────────────────┐
                │                    │                    │
        ┌───────▼────────┐   ┌───────▼────────┐   ┌──────▼─────────┐
        │  apps/web      │   │ apps/extension │   │  packages/     │
        │  Next.js 16    │   │ Plasmo MV3     │   │  engine        │
        │  App Router    │   │ React content  │   │  (math, no LLM)│
        │                │   │ script + popup │   │                │
        │  /api/engine/* │◄──┤                │   └────────────────┘
        │  /api/kuber/*  │◄──┘                            ▲
        │                │                                │
        └───────┬────────┘                                │
                │                                         │
                │   uses ────────────────────────────────►│
                │
        ┌───────▼─────────────────────────────────────────┐
        │  packages/kuber                                 │
        │  Groq streaming chat · ElevenLabs TTS           │
        │  system prompt · context serialization          │
        └─────────────────────────────────────────────────┘
```

Three rules the architecture enforces:
1. **Engine is deterministic.** No LLM calls inside `packages/engine`. Same inputs → same outputs.
2. **LLM is in one place.** `packages/kuber` owns Groq, ElevenLabs, the system prompt, and demo fallbacks. Web and extension both consume it through the same `/api/kuber/*` routes.
3. **Supabase is the source of truth at runtime.** Fixtures in `packages/data` are schema contracts and offline fallbacks, not the live demo data path.

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Web framework | Next.js 16 (App Router, Turbopack) | Server components for Supabase SSR, route handlers for `/api/*` |
| UI | Tailwind 4 + shadcn-style components | Fast iteration, dark-first palette in `@investiq/ui` tokens |
| Charts | Recharts | Sparklines, area charts on `/home` and `/rebalance` |
| Motion / toasts | `framer-motion` + `sonner` | Staggered dashboards, KuberOrb, themed toasts |
| Auth | Supabase Auth (email/password + Google OAuth) | Cookie-based SSR via `@supabase/ssr` |
| Database | Supabase Postgres with RLS | Row-level isolation per user |
| LLM | Groq, default `llama-3.3-70b-versatile` | OpenAI-compatible streaming API, low latency |
| Voice | Web Speech API (STT) + ElevenLabs (TTS) | Streaming voice playback for narration |
| Extension | Plasmo 0.90.5 (Chrome MV3) | React content script + popup with hot reload |
| Build | Turborepo + pnpm workspaces | Parallel dev, shared TS config, workspace deps |
| Lang | TypeScript 5 (strict) across all packages | One type system end-to-end |

---

## Repository layout

```
InvestIQ/
├── apps/
│   ├── web/                         # Next.js 16 App Router
│   │   └── src/
│   │       ├── app/                 # Routes, layouts, /api/* handlers
│   │       ├── app/components/      # Web-only components (AppShell, FloatingKuber, etc.)
│   │       └── lib/                 # Supabase clients, applyRebalanceCommit, applyDiscoveryCommit
│   └── extension/                   # Plasmo Chrome MV3
│       ├── popup.tsx                # Toolbar popup
│       ├── background.ts            # Service worker
│       ├── contents/kuber.tsx       # Content script that injects the bubble
│       ├── components/              # KuberBubble, KuberPanel
│       └── lib/                     # page-context, storage, classify
├── packages/
│   ├── ui/                          # Design tokens (colors, typography, spacing)
│   ├── kuber/                       # Groq client, ElevenLabs client, prompts, demo fallbacks
│   ├── engine/                      # Deterministic portfolio math + tests
│   ├── data/                        # Zod schemas + demo fixtures (Priya)
│   └── config/                      # Shared tsconfig.base.json
├── files/
│   ├── 01_supabase_schema_rls.sql   # Schema + RLS policies
│   ├── 02_supabase_seed_mock_data.sql  # Priya seed (auth.users + portfolio)
│   ├── portfolio.json               # Reference fixture
│   ├── user_profile.json
│   └── market_context.json
├── hand-drawn-references/           # Design sketches
├── scripts/
│   ├── setup-web.sh                 # One-time scaffold (idempotent)
│   └── setup-extension.sh           # One-time scaffold (idempotent)
├── DEMO.md                          # 5.5-min demo script (do not deviate)
├── PROJECT_SPEC.md                  # Full product + technical spec
├── CODEX.md                         # 30s onboarding for new contributors
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

---

## Getting started

### Prerequisites

- **Node.js ≥ 20** (tested on 24.x)
- **pnpm ≥ 9** — install via `corepack enable && corepack prepare pnpm@9.12.0 --activate`
- A **Supabase project** (free tier works) with the SQL files in [files/](files/) applied
- A **Groq API key** ([console.groq.com](https://console.groq.com))
- An **ElevenLabs API key** + voice ID ([elevenlabs.io](https://elevenlabs.io)) — only needed for voice narration; chat works without it

### Clone and install

```bash
git clone https://github.com/prasannawarad/InvestIQ.git investiq
cd investiq
pnpm install
```

The setup scripts (`pnpm setup:web`, `pnpm setup:extension`) are only for first-time scaffolding from an empty repo. **You don't need to run them on a fresh clone** — both apps are already initialized. They are idempotent and will skip if the apps already exist.

### Configure environment

Create the env files — see [Environment variables](#environment-variables) below for the full reference.

```bash
# Web app
touch apps/web/.env.local

# Extension
cp apps/extension/.env.example apps/extension/.env.development
```

Fill in your Supabase, Groq, and ElevenLabs credentials.

### Apply the database schema

In your Supabase project's SQL editor, run in this order:

1. [files/01_supabase_schema_rls.sql](files/01_supabase_schema_rls.sql) — creates tables + RLS policies
2. [files/02_supabase_seed_mock_data.sql](files/02_supabase_seed_mock_data.sql) — seeds Priya's demo account

Demo credentials after seed: `priya.sharma@example.com` / `InvestIQDemo123!`

### Run

```bash
pnpm dev
```

This starts both apps in parallel via Turborepo. Web at `http://localhost:3000`, extension at `apps/extension/build/chrome-mv3-dev`.

To run only one:

```bash
pnpm --filter @investiq/web dev
pnpm dev:extension
```

### Load the extension in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select [apps/extension/build/chrome-mv3-dev](apps/extension/build/)

The extension hot-reloads when you edit files in `apps/extension/`.

---

## Environment variables

### `apps/web/.env.local`

```bash
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>

# Groq LLM (required for Kuber chat / narration / jargon)
GROQ_API_KEY=<groq-key>
GROQ_MODEL=llama-3.3-70b-versatile        # optional, this is the default

# ElevenLabs TTS (optional — voice narration only)
ELEVENLABS_API_KEY=<elevenlabs-key>
ELEVENLABS_VOICE_ID=<voice-id>
ELEVENLABS_MODEL_ID=eleven_turbo_v2_5     # optional

# App URL (used in extension CTA links)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### `apps/extension/.env.development`

```bash
PLASMO_PUBLIC_APP_URL=http://localhost:3000
# Optional greeting override for the bubble panel
# PLASMO_PUBLIC_EXTENSION_USER_NAME=Priya
```

If `GROQ_API_KEY` is missing, Kuber endpoints fall back to canned demo responses from [packages/kuber/src/demo-responses.ts](packages/kuber/src/demo-responses.ts) so the UI still demos cleanly.

---

## Running the apps

| Command | What it does |
|---|---|
| `pnpm dev` | Run web + extension in parallel via Turbo |
| `pnpm dev:extension` | Plasmo dev server only |
| `pnpm build` | Build all workspaces |
| `pnpm build:extension` | Build just the extension (production) |
| `pnpm lint` | Lint all workspaces |
| `pnpm type-check` | Type-check all workspaces |
| `pnpm clean` | Remove build outputs and `node_modules` |
| `pnpm --filter @investiq/engine test` | Run engine math tests |

---

## Routes and APIs

### Web routes ([apps/web/src/app/](apps/web/src/app/))

| Path | Purpose |
|---|---|
| `/` | Root redirect |
| `/home` | Dashboard: hero sentence, stats, journey chart, ask-Kuber chips |
| `/current` | Holdings grid with fit scores |
| `/current/[symbol]` | Holding detail with "How this fits" panel |
| `/preview/[symbol]` | Legacy redirect → `/Kuber/preview/[symbol]` |
| `/Kuber` | Discovery agent: filter → match → basket |
| `/Kuber/preview/[symbol]` | Discovery preview (research layout) |
| `/rebalance` | Drift / scenario / panic modes with trade receipt |
| `/panic` | Calm full-page response to a market shock |
| `/settings` | Preferences (saves to Supabase `profiles`) |
| `/profile` | Identity + goals |
| `/help` | Glossary + FAQ |
| `/extension` | Extension explainer + install instructions |

### API handlers ([apps/web/src/app/api/](apps/web/src/app/api/))

**Engine** (deterministic, no LLM):

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/engine/rebalance` | POST | Compute rebalance recommendation (drift / scenario / panic / discover modes) |
| `/api/engine/scenario` | POST | Simulate a single scenario without committing trades |
| `/api/engine/matches` | POST | Discovery: rank candidates against the user's profile |

**Kuber** (LLM-powered):

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/kuber/chat` | POST | Streaming chat with portfolio + market context injected |
| `/api/kuber/narrate` | POST | Narrate a rebalance recommendation in plain language |
| `/api/kuber/jargon` | POST | One-sentence translation of a finance term |
| `/api/kuber/speak` | POST | ElevenLabs TTS for an arbitrary string |

---

## Packages reference

### `@investiq/engine` — [packages/engine](packages/engine)

Deterministic portfolio math. **No LLM, no network calls, no unseeded randomness.**

Exports:
- `simulateScenario(portfolio, scenario)` — scenarios: `market-drop-20`, `market-drop-30`, `inflation-stays-high`, `withdraw-20-percent`, `lose-job-need-emergency`
- `recommendRebalance(portfolio, profile, mode)` — modes: drift (5% threshold), scenario (0.85x adjustment), panic (3% threshold, 0.6x adjustment), discover (3% budget, new money only)
- `computeFitScore(holding, profile)` — weighted: 40% risk alignment + 30% horizon fit + 20% concentration + 10% diversification
- `computeGoalImpact(portfolio, goal, postTradeAllocation)` — projects months-to-target under post-trade allocation
- `generateMatches(profile, filters)` — ranks candidates from `universe.ts` by industry/size/risk/diversification/keyword fit
- `getUniverseCandidateBySymbol(symbol)` — fetch candidate metadata

Run tests: `pnpm --filter @investiq/engine test`

### `@investiq/kuber` — [packages/kuber](packages/kuber)

Single home for the LLM and voice integration.

Exports:
- `chat(messages, context)` — streaming Groq chat with serialized portfolio + market context
- `narrate(recommendation)` — plain-language narration of a rebalance recommendation
- `explainJargon(term)` — one-sentence translation
- `speak(text)` — ElevenLabs TTS stream
- `KUBER_SYSTEM_PROMPT` — system prompt enforcing 5-sentence rule, no markdown, no untranslated jargon, warm older-sibling tone
- Demo fallbacks in `demo-responses.ts` for offline/no-key runs

### `@investiq/data` — [packages/data](packages/data)

Zod schemas (Portfolio, Holding, UserProfile, Goal, Trade, RebalanceRecommendation, MarketContext) and demo fixtures (Priya's profile, $22.3K portfolio, market snapshot). Used as schema contracts and offline fallbacks.

### `@investiq/ui` — [packages/ui](packages/ui)

Design tokens only (no shared React components — those live with `apps/web`).

- **Colors:** dark-first palette. Accent teal `#2dd4bf`, coral `#f08078`, success green, amber, background `#06090f`, surface `#0b1018`.
- **Typography:** DM Serif Display (serif) + Inter (sans). Sizes from `tiny` (12px) to `hero` (48px).
- **Spacing:** xs 4px → xxl 64px.

Tokens are injected as CSS variables in `apps/web/src/app/layout.tsx`.

### `@investiq/config` — [packages/config](packages/config)

Shared `tsconfig.base.json` extended by every package and app.

---

## Supabase setup

### Schema ([files/01_supabase_schema_rls.sql](files/01_supabase_schema_rls.sql))

Tables in `public`:

| Table | Purpose | Notable columns |
|---|---|---|
| `profiles` | User identity + preferences | `app_user_id`, `name`, `age`, `risk_profile` JSONB, `preferences` JSONB |
| `goals` | Financial goals | `external_goal_id`, `target_amount`, `current_progress`, `target_date`, `priority`, `flexibility` |
| `portfolios` | Portfolio header | `external_portfolio_id`, `as_of`, `summary`, `allocation`, `risk_metrics` |
| `holdings` | Individual holdings | `symbol`, `asset_class`, `current_value`, `unrealized_pnl`, `weight_in_portfolio`, `metadata` |
| `market_contexts` | Market snapshot | `as_of`, `market_snapshot` JSONB, `macro_context` JSONB |

Every table has RLS policies that scope reads/writes to `auth.uid()`.

### Seed ([files/02_supabase_seed_mock_data.sql](files/02_supabase_seed_mock_data.sql))

Creates Priya's demo account in `auth.users` (with a linked Google identity for OAuth testing) and her portfolio across `profiles`, `goals`, `portfolios`, `holdings`, and `market_contexts`. Re-run any time you want to reset to the demo baseline.

### Where the app writes back

- **`/rebalance` Confirm** → [apps/web/src/lib/applyRebalanceCommit.ts](apps/web/src/lib/applyRebalanceCommit.ts) updates `portfolios` and `holdings`
- **`/Kuber` Review & Confirm** → [apps/web/src/lib/applyDiscoveryCommit.ts](apps/web/src/lib/applyDiscoveryCommit.ts) inserts a new holding
- **`/settings` Save** → [apps/web/src/app/settings/page.tsx](apps/web/src/app/settings/page.tsx) updates `profiles.preferences` + `profiles.risk_profile`

---

## Demo data and the Priya narrative

The demo follows **Priya Sharma**, a 38-year-old teacher in Mumbai with a $22.3K portfolio (7 holdings across equity, debt, gold, cash), and two goals: a house in 3 years and retirement in 26.

The 5.5-minute demo arc lives in [DEMO.md](DEMO.md):

| Beat | Time | What's shown |
|---|---|---|
| Intro | 30s | Meet Priya — who she is, what she has, what she wants |
| Day 1 — Education | 60s | Priya reads a CNBC article. Chrome extension overlay appears. Kuber explains how RBI rates affect her bond fund. Recommendation: do nothing. |
| Day 2 — Exploration | 90s | `/home` → ask-Kuber chip → `/current` → fit-score amber card → `/current/[symbol]` → jargon tooltip → `/Kuber` discovery |
| Day 3 — Panic | 120s | Market-drop push → `/panic` → "Run scenario" → `/rebalance` market-drop-20 → Kuber narration → trade receipt → Confirm → `/home` updated |
| Outro | 30s | Three surfaces, one Kuber, full transparency |

**Do not deviate from the script.** Every feature decision is filtered through *"does this serve the demo?"*

Demo-day rules (Person 4's responsibility, see [DEMO.md](DEMO.md)):
- Recorded backup video locked in before judging
- Locked Chrome demo profile (no extensions, no autofill, no signed-in personal accounts)
- Three full dry runs the morning of
- No live ad-libbing of Kuber prompts during judging

---

## Scoring rubric

| Weight | Criterion | Where we score |
|---|---|---|
| 30% | UX & empathy | `/home` plain language, "I'm freaking out" CTA, `/panic` calm treatment, jargon translations everywhere |
| 30% | Innovation in rebalancing | `/rebalance` scenario flow with engine-computed projections + Kuber narration |
| 20% | Transparency & trust | Receipt with tax cost, fees, goal impact; "Why this trade" expansion on every trade card |
| 20% | Technical execution | End-to-end working demo across web app + extension |

---

## Team

| Person | Owns | Status |
|---|---|---|
| **1 — Shell** | `apps/web`, `packages/ui`, all primary app routes | Shipped: all routes, `/settings` Save → Supabase, `/extension` explainer |
| **2 — Kuber** | `packages/kuber`, floating widget, voice pipeline | Shipped: Groq streaming, ElevenLabs TTS, system prompt, context serialization, `/api/kuber/*` endpoints, demo fallbacks |
| **3 — Engine** | `packages/engine`, `/rebalance`, `/api/engine/*`, Supabase commit on Confirm | Shipped: all engine math + tests, three rebalance modes, trade receipt, "Why" expansion. Optional polish: streaming LLM narration on `/rebalance` |
| **4 — Extension + Polish** | `apps/extension`, demo execution, backup recording | Shipped: Plasmo MV3 build, draggable bubble, `KuberPanel`, content script, contextual chat. Remaining: execute [DEMO.md](DEMO.md) checklist (backup video, locked profile, dry runs) |

---

## Conventions

- **TypeScript strict mode** across every package and app.
- **No silent schema changes.** Schemas live in [packages/data/src/schemas.ts](packages/data/src/schemas.ts); update them in a typed way and let the type errors guide you.
- **No LLM in the engine.** [packages/engine](packages/engine) is deterministic; same inputs → same outputs.
- **Plain language, no jargon.** If a finance term shows up in UI copy, it must have a tooltip or be translated by Kuber.
- **Colors come from `@investiq/ui` tokens.** Don't hardcode hex values in components.
- **Don't deviate from the demo script.** See [DEMO.md](DEMO.md).

---

## Help

- `/help` — in-app glossary and FAQ
- [PROJECT_SPEC.md](PROJECT_SPEC.md) — full product + technical spec
- [CODEX.md](CODEX.md) — 30-second onboarding for new contributors
- [DEMO.md](DEMO.md) — demo script and demo-day rules

# InvestIQ

Portfolio management for beginner investors. Goldman Sachs / UTD JSOM hackathon, May 2026.

The product helps non-savvy users track investments, understand risk, and rebalance during uncertainty. **Kuber** is the AI agent throughout the app.

## Stack

- **Web app** — Next.js 16 (App Router) + TypeScript + Tailwind + shadcn/ui + Recharts
- **UI polish layer** — `framer-motion` (motion, staggered dashboards, floating Kuber sheet) + `sonner` toasts themed to `@investiq/ui` CSS variables — same “component marketplace” vibe as curated registries without vendor lock-in; swap in pasted blocks from [21st.dev](https://21st.dev) anytime if you paste code that respects `tokens.ts`
- **Extension** — Plasmo (Chrome MV3, React)
- **LLM** — Groq (Llama 3.3 70B), OpenAI-compatible API
- **Voice** — Browser Web Speech API for STT, ElevenLabs streaming for TTS (Daniel voice, `eleven_turbo_v2_5`)
- **Auth** — Supabase Auth (email/password + Google OAuth)
- **Data** — Supabase Postgres seed data for primary app state + deterministic mock universe in engine for discovery ranking
- **Deploy** — Netlify (web), unpacked Chrome extension (demo)

## Monorepo layout

```
investiq/
├── apps/
│   ├── web/         # Next.js web app — Person 1
│   └── extension/   # Plasmo Chrome extension — Person 4
├── packages/
│   ├── ui/          # Shared design tokens, components — Person 1
│   ├── kuber/       # LLM prompts, Groq client, ElevenLabs client — Person 2
│   ├── engine/      # Scenario + rebalance math (deterministic) — Person 3
│   ├── data/        # Demo JSON + zod schemas — shared
│   └── config/      # Shared tsconfig base — shared
└── scripts/         # Setup helpers
```

## Team ownership

| Person | Owns | Day 1 task |
|---|---|---|
| 1 — Shell | `apps/web`, `packages/ui`, /home, /current, /current/[symbol], /preview/[symbol], /panic, /settings, /profile | Mostly shipped. **Remaining:** persist **`/settings`** Save to Supabase. |
| 2 — Kuber | `packages/kuber`, floating widget + extension chat, voice pipeline | Get Groq streaming working with portfolio JSON in context, then ElevenLabs streaming TTS |
| 3 — Engine | `packages/engine`, **`/rebalance`** (drift / scenario / panic), engine API routes, Supabase commit on Confirm | **Shipped** in repo (optional: streaming LLM narration on `/rebalance`). |
| 4 — Extension + Polish | `apps/extension`, demo flow integration, backup video | Extension shipped: draggable bubble + `KuberPanel`, `/extension` page, `/api/kuber/chat` (+ speak). **Remaining:** execute `DEMO.md` demo-day rules (backup recording, locked profile, dry runs). |

## Implementation status (May 2026)

Tracked against the codebase (not optimism):

| Person | Done in repo | Remaining |
|---|---|---|
| **1 — Shell** | `/home`, `/current`, `[symbol]`, `/preview/[symbol]`, `/panic`, `/profile`, `/help`, Supabase-backed dashboard flows, **`/extension` explainer page** (with Person 4) | **`/settings`:** Save must **persist** to Supabase; today the page loads prefs but **Save is not wired** (`apps/web/src/app/settings/page.tsx`). |
| **2 — Kuber** | **Shipped:** `packages/kuber` Groq streams + **`serialize-context`/`demo-responses`**, **`/api/kuber/chat`** (SSE + Supabase-backed session), **`/narrate`**, **`/jargon`**, **`/speak`**, floating chips hide + **`/rebalance` intent routing**, holding-detail jargon popovers, AI narration overlay on **`/rebalance`**. Requires **`GROQ_API_KEY`** (+ optional **`ELEVENLABS_*`**); Supabase **`NEXT_PUBLIC_*`** for portfolio context via `@supabase/ssr` cookies. |
| **3 — Engine** | `packages/engine` + tests, `/api/engine/*`, `/rebalance` (drift / scenario / panic), receipt, **Confirm → Supabase**, query-param deep links, **“Why”** on trade rows | Optional: **streaming LLM** narration on `/rebalance` (deterministic copy + `KuberOrb` today). |
| **4 — Extension** | Plasmo MV3 app, content script, popup, contextual chat posting to deployed API | **Process only:** own **`DEMO.md`** demo-day checklist — **recorded backup video**, locked demo Chrome profile, group practice, no live ad-lib Kuber. |

## Day 1 setup

```bash
# 1. Clone the repo
git clone https://github.com/prasannawarad/InvestIQ.git investiq && cd investiq

# 2. Bootstrap the apps
pnpm setup:web        # creates apps/web (Next.js 16, Tailwind, shadcn-ready)
pnpm setup:extension  # creates apps/extension (Plasmo)

# 3. Install everything
pnpm install

# 4. Set env vars
cp apps/web/.env.example apps/web/.env
# Person 1 sets Supabase keys
# Person 2 sets GROQ + ELEVENLABS keys

# 5. Run
pnpm dev
```

After `setup:web`, **Person 1 pastes the Figma Make exported code** into `apps/web/src/app/*` and adapts imports to use `@investiq/ui` tokens. Primary runtime data comes from Supabase (`02_supabase_seed_mock_data.sql`), while the engine keeps a fictional discovery universe for `/Kuber` match ranking.

## Mock data usage (current)

- **Supabase seed (`02_supabase_seed_mock_data.sql`)** is the canonical demo data source for profile, goals, portfolio, holdings, and market events.
- **`/rebalance` → Confirm changes** updates the signed-in user’s **`portfolios`** and **`holdings`** rows in Supabase (same column contract as the seed). Re-run the seed SQL if you need to reset the demo portfolio.
- **`packages/data/src/fixtures/*`** remain as schema contracts and fallback demo fixtures.
- **`packages/engine/src/universe.ts`** is intentionally mock/fictional and used only for `generateMatches()` ranking on `/Kuber`.

## Integration checkpoints

- **End of Day 2:** Person 1's /home + Person 2's chat working together on a real Kuber question with Groq.
- **End of Day 3:** Person 3's rebalance engine output flowing through Person 2's narrator into Person 4's /panic flow.
- **Person 3 (engine + /rebalance):** Shipped in code; optional polish = streaming LLM narration on `/rebalance` (Person 2).
- **Open gaps before judges:** Person 1 = **Settings save → Supabase**. Person 4 = **`DEMO.md`** execution (backup video + dry runs). See **Implementation status** table above.

## Demo

See `DEMO.md` for the three-day Priya narrative. **Do not deviate from the script.** Every feature decision should be filtered through "does this serve the demo script?"

## Rubric we're solving for

| Weight | Criterion | Where we score |
|---|---|---|
| 30% | UX & empathy | /home plain language, "I'm freaking out" button, /panic calm treatment, jargon translations |
| 30% | Innovation in rebalancing | /rebalance scenario flow with engine-computed projections, Kuber narration |
| 20% | Transparency & trust | Receipt with tax cost, fees, goal impact; "Why" expansion on every trade card |
| 20% | Technical execution | End-to-end working demo across web app + extension |

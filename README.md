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
| 1 — Shell | `apps/web`, `packages/ui`, /home, /current, /current/[symbol], /preview/[symbol], /panic, /settings, /profile | Run `pnpm setup:web`, paste in Figma Make exported code, wire to Supabase + shared tokens |
| 2 — Kuber | `packages/kuber`, floating widget + extension chat, voice pipeline | Get Groq streaming working with portfolio JSON in context, then ElevenLabs streaming TTS |
| 3 — Engine | `packages/engine`, **`/rebalance`** (drift / scenario / panic), engine API routes, Supabase commit on Confirm | Shipped: deterministic engine APIs + rebalance UI, receipt, **`Confirm changes` → `portfolios` / `holdings`** (`apps/web/src/lib/applyRebalanceCommit.ts`), URL deep links (`?source=panic`, `?source=scenario`, `&name=…`) |
| 4 — Extension + Polish | `apps/extension`, demo flow integration, backup video | Run `pnpm setup:extension`, scaffold Plasmo, get Kuber overlay rendering on apple.com / cnbc.com |

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
- **Person 3 (engine + /rebalance):** Engine package + `/api/engine/*` + rebalance page with Supabase persistence and query-param deep links are implemented; optional polish remains streaming Kuber narration on `/rebalance` (Person 2).

## Demo

See `DEMO.md` for the three-day Priya narrative. **Do not deviate from the script.** Every feature decision should be filtered through "does this serve the demo script?"

## Rubric we're solving for

| Weight | Criterion | Where we score |
|---|---|---|
| 30% | UX & empathy | /home plain language, "I'm freaking out" button, /panic calm treatment, jargon translations |
| 30% | Innovation in rebalancing | /rebalance scenario flow with engine-computed projections, Kuber narration |
| 20% | Transparency & trust | Receipt with tax cost, fees, goal impact; "Why" expansion on every trade card |
| 20% | Technical execution | End-to-end working demo across web app + extension |

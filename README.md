# InvestIQ

> AI-powered portfolio co-pilot for beginner investors — Goldman Sachs / UTD JSOM Hackathon, May 2026

InvestIQ helps people who aren't financial experts track their investments, understand risk in plain language, and act confidently during market uncertainty. The central agent, **Kuber**, surfaces across three touchpoints: a web dashboard, a floating chat widget, and a Chrome extension overlay on news and brokerage sites.

---

## Features

- **Portfolio dashboard** — total value, day change, health score, journey chart with 1M/3M/YTD/1Y/All filters
- **Holdings deep-dives** — fit scores (engine-computed, 0–100), jargon explainer panels with three levels of detail
- **Rebalance flows** — drift correction, scenario modeling (market drops, inflation, job loss), and panic mode. All math is deterministic; Kuber narrates the recommendation.
- **Discovery (`/Kuber`)** — filter by industry/size/risk and add new candidates to your basket; confirm persists to Supabase
- **"I'm freaking out" button** — a separate calmer UI surface for market anxiety, links to scenario-driven rebalance
- **Kuber chat widget** — streaming Groq response with portfolio context; ElevenLabs voice output
- **Chrome extension** — contextual overlay on any page (CNBC, Moneycontrol, brokerage sites); posts to the same `/api/kuber/chat` endpoint

---

## Stack

| Layer | Technology |
|---|---|
| Web app | Next.js 16 (App Router), React 19, TypeScript 5.6, Tailwind CSS 4 |
| Animation | Framer Motion (web), CSS keyframes (extension shadow DOM) |
| Extension | Plasmo (Chrome MV3), React |
| LLM | Groq — Llama 3.3 70B via OpenAI-compatible API |
| Voice | ElevenLabs streaming TTS (`eleven_turbo_v2_5`, Daniel voice) |
| Auth & data | Supabase Auth + Postgres |
| Monorepo | pnpm workspaces + Turbo |
| Deploy | Netlify (web), unpacked Chrome extension (demo) |

---

## Monorepo Layout

```
investiq/
├── apps/
│   ├── web/         # Next.js web app — main UI + API routes
│   └── extension/   # Plasmo Chrome extension — contextual Kuber overlay
├── packages/
│   ├── ui/          # Design tokens (colors, typography, spacing) + shared components
│   ├── kuber/       # Groq client, ElevenLabs client, system prompt, context serializer
│   ├── engine/      # Deterministic portfolio math (scenarios, rebalance, fit scores)
│   ├── data/        # Zod schemas + Priya demo fixtures (shared type contracts)
│   └── config/      # Shared tsconfig base
└── scripts/         # Setup helpers
```

---

## Local Setup

**Prerequisites:** Node ≥20, pnpm ≥9

```bash
git clone https://github.com/prasannawarad/InvestIQ.git
cd InvestIQ
pnpm install
cp apps/web/.env.example apps/web/.env
# Fill in: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
#          GROQ_API_KEY, ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID
pnpm dev
```

Web app runs on `http://localhost:3000`. Extension dev server on `:1012` (load unpacked from `apps/extension/build/chrome-mv3-dev` in `chrome://extensions`).

Seed the demo database:
```bash
# Run 02_supabase_seed_mock_data.sql against your Supabase project
# This creates Priya's $22,300 portfolio + market context
```

---

## Architecture

```
Browser / Extension
       │
       ▼
 apps/web (Next.js)
  ├── /home         ← portfolio dashboard + Kuber chips
  ├── /current      ← holdings grid (fit scores from engine)
  ├── /current/[s]  ← holding detail + jargon panels
  ├── /Kuber        ← discovery (filters → matches → confirm)
  ├── /rebalance    ← drift/scenario/panic + receipt + Confirm
  ├── /panic        ← calm market-uncertainty surface
  └── /settings     ← tone, notifications, risk profile
       │
       ├── /api/kuber/*  ← Groq streaming + ElevenLabs TTS
       └── /api/engine/* ← deterministic math (no LLM)
                │
     ┌──────────┴──────────┐
     ▼                     ▼
packages/kuber        packages/engine
(Groq + ElevenLabs)   (rebalance, scenarios,
                       fit scores — pure math)
     │                     │
     └──────────┬──────────┘
                ▼
         packages/data
         (Zod schemas + Priya fixtures)
                │
                ▼
           Supabase
     (auth, profiles, portfolios,
      holdings, market_events)
```

**Key design rules:**
- Engine has zero LLM calls — all math is deterministic and unit-tested
- Supabase writes happen only on explicit user Confirm actions
- Three Kuber surfaces share one `/api/kuber/chat` endpoint but are architecturally separate — `/Kuber` is discovery only (no chat panel)

---

## Demo Persona

All demo flows use **Priya Sharma** — a 38-year-old schoolteacher with a $22,300 portfolio and two goals: buying a house (3 years) and retirement (26 years). The narrative is scripted in `DEMO.md`.

---

## Design System

All colors, fonts, and spacing live in `packages/ui/src/tokens.ts`:

- **Accent:** Teal `#2dd4bf`
- **Background:** Near-black `#06090f`
- **Text:** Off-white `#e8eef6`
- **Fonts:** DM Serif Display (headings) / Inter (body)
- **Fit score:** Green ≥80, Amber 60–79, Coral <60

---

## Rubric

| Weight | Criterion | Where we score |
|---|---|---|
| 30% | UX & empathy | Plain-language dashboard, "I'm freaking out" button, `/panic` calm surface, jargon translator |
| 30% | Innovation in rebalancing | Engine-computed scenario projections, Kuber narration, goal-impact delta on every trade |
| 20% | Transparency & trust | Receipt with tax cost + fees + goal impact, "Why" expansion on every trade card |
| 20% | Technical execution | End-to-end demo across web app + Chrome extension |

---

## Docs

- `CLAUDE.md` — Coding standards, architecture, and constraints for AI assistants
- `CODEX.md` — 30-second pitch + quick onboarding
- `PROJECT_SPEC.md` — Full product and API specification
- `DEMO.md` — Word-for-word 5.5-minute demo script (Priya's 3-day narrative)

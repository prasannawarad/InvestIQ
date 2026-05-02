# CODEX.md

Read this first. It is a fast onboarding for any human or AI agent (Codex, Claude Code, Cursor, etc.) joining the InvestIQ project.

If you have 30 seconds, read sections 1 and 2. If you have 5 minutes, read all of it. For exhaustive detail, read `PROJECT_SPEC.md`.

---

## 1. The 30-second pitch

InvestIQ is a portfolio management web app for beginner investors. It has three surfaces: a Next.js web app, a Chrome extension, and an AI agent named **Kuber** (which appears in both surfaces, with voice).

We're building it for the Goldman Sachs / UTD JSOM hackathon (May 2026). The judging rubric is 30% UX + 30% rebalancing innovation + 20% transparency + 20% execution.

Demo persona is **Priya Sharma**, 38, schoolteacher, $22,300 invested, balanced risk profile, two goals (house deposit in 3 years, retirement in 26 years). The demo tells a 3-day story across the three surfaces. See `DEMO.md`.

---

## 2. Repo orientation

```
investiq/
├── apps/
│   ├── web/         Next.js 16 app — the main product
│   └── extension/   Plasmo Chrome extension
├── packages/
│   ├── ui/          Design tokens + shared components
│   ├── kuber/       LLM (Groq) + voice (ElevenLabs) integration
│   ├── engine/      Deterministic portfolio math
│   ├── data/        Zod schemas + Priya's three demo JSON files
│   └── config/      Shared TS config
├── scripts/         Setup helpers
├── DEMO.md          Word-for-word demo script
├── PROJECT_SPEC.md  Full technical spec (read this for details)
└── CODEX.md         You are here
```

This is a **pnpm + Turborepo monorepo**. Always run pnpm commands from the repo root unless you need to be inside a specific app.

---

## 3. Setup (you, today)

```bash
# 1. Clone (skip if you already have it)
git clone <repo-url> investiq && cd investiq

# 2. Bootstrap apps if not done yet
pnpm setup:web         # creates apps/web (Next.js)
pnpm setup:extension   # creates apps/extension (Plasmo)

# 3. Install
pnpm install

# 4. Env vars
cp .env.example apps/web/.env.local
# Get keys from team Slack (#investiq channel)
# Required: GROQ_API_KEY, ELEVENLABS_API_KEY, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY

# 5. Run
pnpm dev   # starts web on localhost:3000 + extension build watcher
```

If `pnpm dev` fails: check Node version is ≥ 20 and pnpm is ≥ 9 (`pnpm -v`). Then `pnpm install` again.

---

## 4. Who owns what

| Person | Owns | Day 1 task |
|---|---|---|
| 1 — Shell | `apps/web`, `packages/ui`, all "static" pages (/home, /current, /current/[symbol], /preview/[symbol], /panic, /settings, /profile) | Paste Figma Make code into apps/web/src/app/* and wire to `@investiq/data` |
| 2 — Kuber | `packages/kuber`, /Kuber and all its sub-routes, chat UI, voice integration, floating widget | Implement `chat()` against Groq with streaming |
| 3 — Engine | `packages/engine`, all the math | Implement `recommendRebalance()` and `simulateScenario('market-drop-20')` |
| 4 — Extension + polish | `apps/extension`, /panic page, demo flow integration testing, recorded backup video | Get Plasmo overlay rendering on a real third-party page |

If you're working with an AI agent (Codex, Claude Code), tell it which person you are first. It changes which files it should focus on.

---

## 5. Coding standards

- **TypeScript strict mode.** No `any` without a comment explaining why.
- **No silent shape changes** to schemas in `packages/data/src/schemas.ts`. Update the schema, then fixtures, then notify the team in Slack.
- **No LLM calls in `packages/engine`.** Numbers come from deterministic code. Period.
- **No portfolio math in `packages/kuber`.** Kuber narrates, doesn't compute.
- **Use `@investiq/ui/tokens` for colors.** Don't hardcode hex.
- **Plain language in user-facing text.** No "P/E ratio" without an (i) tooltip with translation. No "AUM," "expense ratio," etc. without translation.
- **Commit messages:** `[area] short description` — e.g. `[engine] implement market-drop-20 simulator`.

---

## 6. Three rules that will save you time

### 6.1 Read PROJECT_SPEC.md before starting a new feature

It tells you what's in scope and what's not. We've already cut a lot — don't quietly add it back.

### 6.2 Read DEMO.md before deciding "is this feature important?"

If the feature isn't on the demo path, it's optional. Spend your time on the path.

### 6.3 The Figma Make output is the design

Don't redesign. Don't argue with the type sizes. Don't substitute a different chart library. The visual decisions are made. Implement them.

---

## 7. AI agent instructions (Codex / Claude Code / Cursor)

If you are an AI coding agent, follow these rules:

1. **Always read `PROJECT_SPEC.md` before generating code.** It contains the contracts you must respect.
2. **Always read the relevant package README** (`packages/<name>/README.md`) before working in that package. Each package has a clear "Public API" section that defines what its functions return.
3. **Follow the Zod schemas in `packages/data/src/schemas.ts`** as the source of truth for data shapes. If a TypeScript type and a Zod schema disagree, the Zod schema wins.
4. **Do not introduce new dependencies** without checking if they're already in another workspace package. Use `pnpm` to add: `cd <app-or-package> && pnpm add <name>`.
5. **Do not introduce new colors, fonts, or radii.** Use `@investiq/ui/tokens`.
6. **Do not move files between packages without explicit instruction.** The package boundaries are intentional (engine is testable without LLM, kuber is replaceable independent of engine, ui is shared between web and extension).
7. **Do not implement features marked "out of scope"** in PROJECT_SPEC.md section 10. If you think one is needed, surface the question to the human first.
8. **Stream LLM output** wherever possible. The demo's perceived latency depends on streaming.
9. **Use the demo fixtures** in `packages/data/src/fixtures/` for any default state. Don't make up new mock users.
10. **When uncertain, narrow scope.** A working /home is worth more than a half-built /preview/[symbol].

---

## 8. Critical paths (do these work? if not, demo breaks)

These are the parts of the app the demo absolutely depends on:

1. `/home` renders with real fixture data
2. Tapping an "Ask Kuber" chip routes to `/Kuber` with a question pre-filled
3. `/Kuber` chat mode produces a streaming response from Groq within ~2s
4. ElevenLabs streaming TTS plays the response audibly
5. `/current` shows the holdings grid with engine-computed fit scores
6. `/current/[symbol]` shows the "How this fits your portfolio" panel with real numbers
7. `(i)` icons next to jargon terms open a popover and link to Kuber
8. The "I'm freaking out" button on `/home` navigates to `/panic`
9. `/panic` "Run a scenario" links to the scenario picker
10. `/Kuber/scenario/market-drop-20` shows engine-computed projection AND a working "Confirm" button
11. After Confirm, `/home` reloads with updated state

Test these end-to-end every day. If any breaks, fix that before adding new features.

---

## 9. Stack & versions (lock these)

- Node ≥ 20
- pnpm ≥ 9
- Next.js 16, React 19
- TypeScript 5.6+
- Tailwind CSS (latest stable)
- shadcn/ui (latest stable)
- Recharts (latest)
- Plasmo (latest)
- Clerk (latest)
- Zod 3.23+

Don't upgrade in the middle of the hackathon. If a dep breaks, downgrade and fix forward.

---

## 10. When the demo gets close

24 hours before the demo:

1. Person 4 records a complete backup video of the demo flow
2. Lock the demo Chrome profile (logged in as Priya, extension installed, no other tabs)
3. Test the demo on the actual demo machine, not a dev laptop
4. Verify Groq API key is not rate-limited (recent free tier limits: 30 RPM)
5. Verify ElevenLabs has credits remaining
6. Practice the demo script (`DEMO.md`) at least 3 times together

If something flakes live, **switch to the backup video without comment** and keep narrating. Judges have seen this happen many times.

---

## 11. Asking for help

- Stuck on a feature? Check `PROJECT_SPEC.md` first. Then Slack the owner.
- Stuck on the spec itself? Slack the team. Don't write code that contradicts the spec.
- Not sure if something's in scope? It probably isn't. When in doubt, narrow.

---

*This document is short on purpose. The full spec is in PROJECT_SPEC.md. The demo script is in DEMO.md. Read those, then this, then start building.*

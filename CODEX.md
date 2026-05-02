# CODEX.md

Read this first. Fast onboarding for any human or AI agent (Codex, Claude Code, Cursor) joining InvestIQ.

If you have 30 seconds, read sections 1 and 2. If you have 5 minutes, read all of it. For exhaustive detail, read `PROJECT_SPEC.md`.

---

## 1. The 30-second pitch

InvestIQ is a portfolio management web app for beginner investors. Three surfaces: Next.js web app, Chrome extension, and an AI agent named **Kuber** that appears in both.

Hackathon: Goldman Sachs / UTD JSOM, May 2026. Rubric: 30% UX + 30% rebalancing innovation + 20% transparency + 20% execution.

Demo persona: **Priya Sharma**, 38, schoolteacher, balanced risk profile, two goals (house + retirement). Primary seed data currently uses a ~$5,000 demo portfolio in Supabase. The demo tells a 3-day story across the surfaces. See `DEMO.md`.

---

## 2. Repo orientation

```
investiq/
├── apps/
│   ├── web/         Next.js 16 — the main product
│   └── extension/   Plasmo Chrome extension
├── packages/
│   ├── ui/          Design tokens + shared components
│   ├── kuber/       Groq + ElevenLabs integration
│   ├── engine/      Deterministic portfolio math
│   ├── data/        Zod schemas + Priya fixtures (contract/fallback)
│   └── config/      Shared TS config
├── scripts/         Setup helpers
├── DEMO.md          Word-for-word demo script
├── PROJECT_SPEC.md  Full technical spec (read this for details)
└── CODEX.md         You are here
```

pnpm + Turborepo monorepo. Run pnpm commands from the repo root unless inside a specific app.

---

## 3. Three Kuber surfaces — each does ONE job

This is the most important architectural fact in the project. Don't blur them.

| Surface | Job | Layout |
|---|---|---|
| `/Kuber` page | **Discovery** — find new investments | Jobright-style: status banner, filters drawer, top-matches grid, running tally |
| Floating widget | **Quick chat** — Q&A, jargon, "am I at risk?" | Bottom-right chat panel with chips above input |
| Chrome extension overlay | **Contextual chat** — questions about the page being read | Injected into third-party pages, with "Open in app →" CTA |

`/Kuber` has NO chat panel. Chat lives in the widget and extension. This is intentional — don't add chat to /Kuber later.

---

## 4. Setup (today)

```bash
git clone <repo-url> investiq && cd investiq
pnpm setup:web         # creates apps/web (Next.js 16, Tailwind)
pnpm setup:extension   # creates apps/extension (Plasmo)
pnpm install
cp apps/web/.env.example apps/web/.env
# Get keys from team Slack: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, GROQ_API_KEY, ELEVENLABS_API_KEY
pnpm dev
```

If `pnpm dev` fails: Node ≥20, pnpm ≥9, then `pnpm install` again.

---

## 5. Who owns what

| Person | Owns | Day 1 task |
|---|---|---|
| 1 — Shell | `apps/web`, `packages/ui`, /home, /current, /current/[symbol], /panic, /settings, /profile, /help, /extension info page | Paste Figma Make code into apps/web/src/app/*, wire to Supabase + tokens |
| 2 — Kuber | `packages/kuber`, /Kuber discovery page, floating widget, voice integration | Implement `chat()` against Groq with streaming |
| 3 — Engine | `packages/engine`, `/rebalance`, engine API routes, all math incl. `generateMatches` | **Shipped:** full engine surface + rebalance UI, Supabase **Confirm changes**, deep links `?source=panic` \| `?source=scenario` \| `&name=market-drop-20` (see `PROJECT_SPEC` §3.5) |
| 4 — Extension + polish | `apps/extension`, demo flow integration, recorded backup video | Get Plasmo overlay rendering on a real third-party page |

---

## 6. Coding standards

- **TypeScript strict mode.** No `any` without a comment.
- **No silent shape changes** to schemas in `packages/data/src/schemas.ts`. Update Zod first, fixtures next, notify team in Slack.
- **No LLM calls in `packages/engine`.** Numbers come from deterministic code.
- **No portfolio math in `packages/kuber`.** Kuber narrates, doesn't compute.
- **Use `@investiq/ui/tokens` for colors.** Don't hardcode hex.
- **Plain language in user text.** No "P/E ratio" without an (i) tooltip with translation.
- **Commit messages:** `[area] short description` — e.g. `[engine] implement market-drop-20 simulator`.

---

## 7. Three rules that save time

### 7.1 Read PROJECT_SPEC.md before starting a feature
It tells you what's in scope and what's not. We've cut a lot — don't quietly add it back.

### 7.2 Read DEMO.md before deciding "is this important?"
If the feature isn't on the demo path, it's optional. Spend time on the path.

### 7.3 The Figma Make output is the design
Don't redesign. Don't argue with type sizes. Don't substitute a different chart library. Decisions are made. Implement them.

---

## 8. AI agent instructions (Codex / Claude Code / Cursor)

If you are an AI coding agent, follow these rules:

1. **Always read `PROJECT_SPEC.md` before generating code.** It contains the contracts you must respect.
2. **Always read the relevant package README** (`packages/<name>/README.md`) before working in that package.
3. **Follow Zod schemas in `packages/data/src/schemas.ts`** as the source of truth for data shapes.
4. **Do not introduce new dependencies** without checking workspace packages first. Use `pnpm add` from the right directory.
5. **Do not introduce new colors, fonts, or radii.** Use `@investiq/ui/tokens`.
6. **Do not move files between packages without explicit instruction.** Boundaries are intentional.
7. **Do not implement features marked "out of scope"** in PROJECT_SPEC.md section 11.
8. **Stream LLM output** wherever possible. Demo's perceived latency depends on streaming.
9. **Use seeded Supabase data** as primary app state, and keep `packages/data/src/fixtures/` aligned as schema-safe fallback/reference.
10. **When uncertain, narrow scope.** A working /home is worth more than a half-built /preview.
11. **`/Kuber` is discovery only.** Do not add a chat panel to `/Kuber` no matter what older comments or code suggest.

### Mock data policy (current)

- `02_supabase_seed_mock_data.sql` is authoritative for demo runtime data.
- `packages/engine/src/universe.ts` is intentionally fictional/mock and used by `generateMatches()` only.
- `packages/data/src/fixtures/*` are still maintained because schemas in `packages/data` are the type contract across packages.

---

## 9. Critical paths (demo breaks if these don't work)

1. `/home` renders with real seeded Supabase data
2. Tapping an "Ask Kuber" chip opens the floating widget pre-filled
3. Floating widget produces streaming Groq response within ~2s
4. ElevenLabs streaming TTS plays the response audibly
5. `/current` shows holdings grid with engine-computed fit scores
6. `/current/[symbol]` shows "How this fits your portfolio" panel with real numbers
7. (i) icons next to jargon open popover and link to floating widget
8. "I'm freaking out" button on /home navigates to /panic
9. /panic "Run a scenario" links to `/rebalance?source=scenario` (scenario mode)
10. `/rebalance` scenario / drift / panic shows engine-computed projection AND working **Confirm changes** (persists to Supabase)
11. After Confirm, navigate to `/home`; data reflects updated `portfolios` / `holdings` on next load
12. Bonus: /Kuber filter drawer → Start → matches appear → +Add → popup → Review & Confirm → /home updates

Test these end-to-end every day.

---

## 10. Stack & versions (lock these)

- Node ≥ 20
- pnpm ≥ 9
- Next.js 16, React 19
- TypeScript 5.6+
- Tailwind CSS (latest stable)
- shadcn/ui (latest stable)
- Recharts (latest)
- Plasmo (latest)
- Supabase Auth (latest stable)
- Zod 3.23+

Don't upgrade mid-hackathon. If a dep breaks, downgrade and fix forward.

---

## 11. When the demo gets close

24 hours before:

1. Person 4 records a complete backup video
2. Lock the demo Chrome profile (logged in as Priya, extension installed, no other tabs)
3. Test on the actual demo machine
4. Verify Groq API key is not rate-limited (free tier: 30 RPM)
5. Verify ElevenLabs has credits
6. Practice the demo script from `DEMO.md` at least 3 times together

If something flakes live, **switch to backup video without comment** and keep narrating.

---

## 12. Asking for help

- Stuck on a feature? Check `PROJECT_SPEC.md`. Then Slack the owner.
- Stuck on the spec? Slack the team. Don't write code that contradicts the spec.
- Not sure if something's in scope? It probably isn't. When in doubt, narrow.

---

*Short on purpose. Full spec in PROJECT_SPEC.md. Demo script in DEMO.md.*

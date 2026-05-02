# InvestIQ — Project Specification

This document is the source of truth for what InvestIQ is, what it does, and how it's built. AI coding agents (Codex, Claude Code, Cursor) and human contributors should read this before writing or generating code.

If something here conflicts with code in the repo, this document wins — update the code, not the spec, unless the team agrees to change direction.

---

## 1. Product

### 1.1 What it is

InvestIQ is a portfolio management web app for beginner investors. The target user has money in stocks or mutual funds but is intimidated by traditional brokerage UIs and doesn't understand financial jargon. The product helps them track investments, understand risk, and rebalance during market uncertainty — all without dumping Bloomberg-style data on them.

The AI agent inside the app is named **Kuber** (from Hindu tradition — the deity of wealth). Kuber appears throughout the product: as a floating widget on every page, as a dedicated page (/Kuber), and as a Chrome extension overlay on third-party sites.

### 1.2 Demo persona

Priya Sharma. 38. Schoolteacher in Pune. Two dependents. $22,300 invested. Two goals: house deposit (3 years), retirement (26 years). Risk profile: balanced. Cautious by temperament.

Currency for the demo is **USD** despite the Indian persona. Rationale: the cultural anchor of "Kuber" stays, but the dollars are easier for Dallas judges to grok.

### 1.3 Hackathon rubric (what we're scored on)

| Weight | Criterion | How we win it |
|---|---|---|
| 30% | UX & empathy | Plain language everywhere, "I'm freaking out" button, calm /panic page, jargon translations with (i) icons |
| 30% | Innovation in rebalancing | /rebalance page with engine-computed projections, scenario picker, line-item receipt, Kuber narration |
| 20% | Transparency & trust | Receipt with tax cost, fees, goal impact; "Why" expansion on every trade card; three-layer jargon explanation |
| 20% | Technical execution | End-to-end working demo across web app + Chrome extension + voice |

### 1.4 The three-day demo narrative

The demo is three vignettes from Priya's life. See `DEMO.md` for the script. Every feature decision should be filtered through "does this serve the demo script?"

- **Day 1** — Priya reads CNBC, the Chrome extension overlays Kuber, Kuber connects the news to her bond fund holding, tells her to do nothing.
- **Day 2** — Priya checks the app, navigates /home → /current → a holding detail, asks Kuber about jargon, learns about fees compounded over 26 years.
- **Day 3** — Priya panics about a market drop, taps "I'm freaking out," runs the "market drops 20%" scenario via /rebalance, Kuber narrates, she confirms two trades.

---

## 2. Information architecture

### 2.1 Routes

| Route | Description | In nav? | Owner |
|---|---|---|---|
| `/home` | Dashboard — hero, three numbers, journey chart, ask-Kuber chips, "what you should know today," holdings preview | Yes | Person 1 |
| `/current` | Grid of all holdings with fit scores | Yes | Person 1 |
| `/current/[symbol]` | Single holding detail with "How this fits your portfolio" panel and jargon translations | No (deep-linked) | Person 1 |
| `/preview/[symbol]` | Preview a holding the user does NOT own. Match score + why-fits / why-not-fits | No (deep-linked from /Kuber discovery) | Person 1 |
| `/Kuber` | Conversational agent. Chat mode (default) handles Q&A, jargon, common questions | Yes | Person 2 |
| `/Kuber/discover` | Discovery mode — filters left, top-matches grid center, running tally right. Wireframe layout | No (deep-linked from /Kuber chip "Find new investments") | Person 2 |
| `/rebalance` | The decision-and-commit surface. Drift-driven by default. Accepts `?source=panic` and `?source=scenario&name=...` | Yes | Person 3 (page) + Person 2 (narration) |
| `/panic` | Calm full-page takeover after "I'm freaking out" | No (linked from button) | Person 4 |
| `/settings` | User preferences (tone, frequency, risk slider). Renamed from "Preferences" | Yes | Person 1 |
| `/profile` | User identity and goals | Yes | Person 1 |
| `/extension` | Static page explaining the Chrome extension | Secondary nav | Person 4 |
| `/help` | Glossary of jargon + FAQ | Secondary nav | Person 1 |

### 2.2 Navigation

**Left rail**, 240px wide, full height, white background with subtle right border.

Top section:
- InvestIQ wordmark + IQ logo
- Home
- Current
- Kuber
- Rebalance ⭐ (NEW — top-level)
- Settings
- Profile

Divider.

Secondary section:
- Extension
- Help

Bottom section:
- Avatar + user name + sign out

Active link: muted teal text + thin teal vertical bar on left edge.

**Floating Kuber widget**, bottom-right, on every page EXCEPT /Kuber, /rebalance, and /panic.

- Closed: 56x56px circular button, muted teal, white "K", soft drop shadow, 5s pulse
- Open: 380x500px chat panel anchored bottom-right with 24px margin
- Header: Kuber name + listening indicator + close X
- Body: 3 quick-action chips above the conversation, then the conversation
- Footer: voice/text input + small "Open full Kuber →" link

### 2.3 Page details

#### /home

Vertical order from top:
1. Hero block: large serif sentence ("Your portfolio is healthy.") with a small icon (sun for healthy, cloud for caution, storm for "needs attention"). Below the hero, on the right rail: "I'm freaking out" coral button + "Run a scenario" teal outline button.
2. Three stat cards in a row: Total Value (e.g. $22,300), Today's Change (e.g. -$12, MUTED gray, not red, since 0.05% is noise), Health Score (e.g. "Good" with green check).
3. Journey chart: line chart of portfolio value over 1Y by default, with annotations for milestones ("Started," "Added $500," "Market dip"). Time toggle pills above (1M / 3M / YTD / 1Y / All).
4. "Ask Kuber" section: 4 chip buttons — "Am I at risk?", "What should I know today?", "Why did my portfolio drop?", "Should I worry about the news?" Each chip pre-fills /Kuber with that question.
5. "What you should know today": 2 cards. Headline + plain summary + "What this means for you" connector sentence tied to her specific holdings.
6. "Your holdings": top 3 holding cards horizontally. Friendly name, dollar value, "21% of portfolio" line, fit score badge. "See all →" link to /current.

#### /current

Top: filter pills (All, Stocks, Funds, Bonds, Gold).

Grid of holding cards (3-column on desktop, 1-column on mobile). Each card:
- Small logo or letter avatar
- Friendly name + plain-language size label ("Big established company" not "Mid cap")
- Location (country)
- Fit score badge — green ≥80, amber 60-79, coral <60
- Dollar value + "X% of portfolio" small text
- "Ask Kuber" link

Cards with fit < 80 get an amber border. Tap card → /current/[symbol].

#### /current/[symbol]

- Header: logo, name, size label, "Bought N months ago" badge
- Right card: fit score with "Why this fits you" expandable list
- "How this fits your portfolio" panel:
  - Position size ("4.3% of your portfolio")
  - Cost basis ("Bought at $1,450 avg, up 11.7%")
  - Tax context ("Selling now would create $85 in long-term gains")
  - Goal connection ("30% earmarked for retirement; selling sets timeline back ~2 months")
- "Bulls say / Bears say" two-column plain-language cards (NO sell-side analyst quotes)
- Jargon stats row: P/E ratio, Market cap, Dividend yield, Beta — each with (i) icon → click opens popover with plain-language explanation + "Ask Kuber more" button
- "Ask Kuber about [symbol]" CTA at bottom

#### /Kuber — Chat mode (default)

Single-column layout, ChatGPT-like.

- Top: small "Kuber" header with listening indicator (pulses on speak/listen)
- Center: chat conversation area
- **Common questions live above the input box**, categorized into three groups:
  - *Scenarios:* "What if markets drop 20%?", "What if I need $5,000 soon?", "What if inflation stays high?"
  - *Find investments:* "Show me safe stocks", "What about gold?"
  - *Rebalance:* "Am I too risky?", "Should I diversify more?"
- Chips disappear once the conversation starts; reappear if the user clears the chat
- Footer: voice/text input bar with mic icon

**Routing rule:** When Kuber receives a quantitative question (scenarios, rebalancing, projections, "should I sell?"), Kuber responds with a short verbal acknowledgment ("Let me run that for you — opening Rebalance...") and the app navigates to /rebalance with the appropriate `?source=` and `?name=` query params. Kuber does NOT compute or display rebalance recommendations in the chat panel itself.

When Kuber receives an investment-discovery question ("help me find new investments", "I want to invest $500"), Kuber acknowledges and navigates to /Kuber/discover.

#### /Kuber/discover — Discovery mode

Layout matches the hand-drawn wireframe (Jobright-style discovery surface).

- **Top tally bar:** "X holdings being added · awaiting confirm · $Y left of $Z"
- **Left filter sidebar:** industry, company size (small / medium / big), max single-position amount, tech keywords. Apply button.
- **Center:** "Top matches" grid, 4–6 cards. Each card has logo, name + size + location, match % badge, expandable "Why this match," and an "+Add $___" input + button. Tapping a card name (not the +Add button) opens /preview/[symbol].
- **Right (after first add):** running list of holdings being added with thumbnails, total committed, "Review & confirm" button at bottom

**Reached from:** /Kuber chat ("Find new investments" chip or any matching question)

**On "Review & confirm":** popup with pie chart of new allocation, industry breakdown, "where you might want to diversify next" hint, then Confirm → commits to the portfolio fixture, redirects to /home.

#### /rebalance — The decision-and-commit surface ⭐

This is the centerpiece feature. 30% of the rubric points live here.

Single page, vertically stacked sections.

**Section 1 — Mode picker (top)**

Three mode chips at top:
- **Drift (default)** — auto-loads when entering /rebalance with no query params. Engine reads current vs. target allocation; if drift > 5pp on any class, generates trades.
- **Scenario** — picker dropdown of scenarios:
  - "What if markets drop 20%?" (`market-drop-20`)
  - "What if markets drop 30%?" (`market-drop-30`)
  - "What if I need money in a year?" (`withdraw-20-percent`)
  - "What if inflation stays high?" (`inflation-stays-high`)
  - "What if I lose my job?" (`lose-job-need-emergency`)
- **Panic** — activated by `?source=panic`. Engine biases toward more conservative trades, smaller moves.

URL query params control mode:
- `/rebalance` → drift mode
- `/rebalance?source=panic` → panic mode
- `/rebalance?source=scenario&name=market-drop-20` → scenario mode with that scenario pre-loaded

**Section 2 — Kuber narration (~1/3 of viewport)**

Voice + text panel where Kuber explains what's happening and why. Streams from the Kuber narrator (`narrate()` in `@investiq/kuber`).

Examples:
- *Drift:* "You're 65% in stocks but your target is 60%. Want me to rebalance?"
- *Scenario market-drop-20:* "If markets drop 20%, your portfolio goes from $22,300 to $19,500. Here's how to soften the blow."
- *Panic:* "Markets are jumpy. Let's bring you a bit closer to your target so a drop hurts less."

**Section 3 — Receipt (~2/3 of viewport)**

The transparent receipt:
- Title: "Recommended changes"
- Before/after donut charts side-by-side
- Trade cards: each shows action ("Sell $50 of X" or "Buy $50 of Y") with an expandable "Why this trade" section
- Cost line items: "Tax cost: $0", "Trade fees: $0"
- Goal impact line items, one per goal: "House deposit goal: improves by 1 month", "Retirement goal: unchanged"
- Confirm + Cancel buttons at bottom

**On Confirm:**
- Animate the trades applying
- Update the in-memory portfolio (React state, not the JSON file)
- Redirect to /home with the hero sentence updated to reflect the post-rebalance state

**Reached from:**
- Top-level nav (Rebalance link)
- /home "Run a scenario" button
- /panic "Run a scenario" or "I want to do something protective"
- /Kuber chat redirect when user asks a quantitative question
- The floating Kuber widget when it detects a quantitative question

#### /settings

Single-column form, max-width 720px.

- **Communication tone** — radio: "Friendly and simple" / "Direct and concise" / "Detailed with explanations"
- **Notification frequency** — radio: "Daily" / "Weekly" / "Only when something matters"
- **Risk profile** — slider 1–10 with live label ("Cautious" / "Balanced" / "Growth-focused")
- **Voice** — toggle: "Let Kuber speak out loud" + voice preview button
- **Currency** — dropdown (USD locked for demo)

Save button at bottom. Updates in-memory user_profile, shows toast "Saved."

#### /profile

Single-column, max-width 720px.

- **About me** — name, age, occupation, location (read-only for demo)
- **Financial snapshot** — annual income, monthly savings, dependents, emergency fund months (editable)
- **Goals** — cards per goal: name, target amount, current progress (progress bar), target date, priority. "+ Add goal" button.
- **Risk profile summary** — read-only sentence: "You're a Balanced investor with medium risk tolerance."

#### /extension

Static informational page.

- Top: "← Back to Home" link
- Hero: "Chrome Extension" 64px serif
- Subhero: "Kuber follows you across the web to answer money questions in context."
- IMPORTANT: search Figma export for any "Sage" references and replace with "Kuber" — the export was generated using a previous name
- Demo tabs at top: "Apple.com Demo" / "CNBC Article Demo" / "Gmail Demo"
- Below tabs: side-by-side mockups showing the third-party page (left) and the Kuber overlay open (right) with an "Open in InvestIQ app →" CTA in the chat
- Bottom: "Install for Chrome" button

#### /help

Single-page glossary + FAQ.

- **Quick glossary** — accordion list of jargon terms with plain-language explanations. Same translations as the (i) tooltips on /current/[symbol].
- **Common questions** — FAQ cards
- **Contact us** — placeholder

The (i) tooltips throughout the app have a "see full glossary →" link that targets /help.

#### /panic

Full-page takeover. NO left nav (just a small "← Back to Home" link top-left).

- Cooler cream background (#F5F2EC) — slightly different from default to signal calm
- Centered content max 600px
- Top: soft gradient orb illustration (200px, muted teal-to-cream)
- Hero: "Take a breath." 48px serif
- Subhero: "Most of the time, the right thing to do is nothing." muted gray
- Three large option cards stacked vertically:
  - "Show me what's actually happening" (subtitle "I'll explain today's market in plain English") → links to /Kuber with chat mode and a "explain today's news" prompt
  - "Run a scenario" → links to /Kuber/scenario picker
  - "I want to do something protective" → links to /Kuber/rebalance with `source=panic`
- No red/orange/amber colors, no exclamation marks, no urgency
- No floating Kuber widget on this page

---

## 3. Data

### 3.1 Three core fixtures

All data lives in `packages/data/src/fixtures/`. Loaded via `loadDemoData()` from `@investiq/data`.

- `user_profile.json` — Priya's identity, financial context, risk profile, goals, preferences
- `portfolio.json` — Her holdings, current values, allocation, target allocation, drift, risk metrics
- `market_context.json` — Today's market snapshot, macro context, recent events with `relevance_to_user` flag

These are the DEMO data. Schema is the contract; if a shape changes, update Zod schemas first in `packages/data/src/schemas.ts`, then update fixtures, then notify the team.

### 3.2 Currency note

Fixtures are currently labeled with `"currency": "INR"` and INR amounts. For the demo, the UI displays USD by treating the numbers as USD and changing the symbol. **This is a demo-day shortcut, not a real conversion.** Real conversion would change every number; we're just relabeling. Don't ship this to actual users.

If a judge asks: "this is a demo with placeholder data; for production we'd ingest real brokerage data via Plaid or similar."

### 3.3 Schemas

See `packages/data/src/schemas.ts` for full Zod definitions. Inferred TypeScript types are exported and used everywhere.

Key exported types:
- `UserProfile` — identity, financial_context, risk_profile, goals, preferences
- `Portfolio` — summary, allocation, holdings, risk_metrics
- `Holding` — symbol, name, asset_class, subcategory, sector, quantity, prices, weight
- `MarketContext` — market_snapshot, macro_context, recent_events
- `RebalanceRecommendation` — trades, before/after allocation, tax cost, fees, goal impacts, rationale (produced by the engine, narrated by Kuber)
- `Trade` — action (buy/sell), symbol, amount, reason
- `GoalImpact` — goal_id, goal_name, delta_months (positive = goal pushed back)

---

## 4. Engine (deterministic math)

Lives in `packages/engine`. **No LLM calls in this package, ever.** All numbers shown to judges come from here.

### 4.1 Rationale

LLMs are bad at multi-step arithmetic. We compute the engine separately so:
1. The numbers shown are correct
2. Kuber narrates engine output but doesn't compute
3. Tests can verify the engine without flaky LLM dependencies

### 4.2 Public API (Person 3 implements)

#### `simulateScenario(portfolio, scenarioName) → ScenarioResult`

Apply a what-if scenario and return projected impact. Supported scenarios:

| Name | Effect |
|---|---|
| `market-drop-20` | Equity holdings drop 20%, debt drops 5%, gold rises 8%, cash unchanged |
| `market-drop-30` | Equity drops 30%, debt drops 8%, gold rises 12%, cash unchanged |
| `inflation-stays-high` | Debt drops 7%, gold rises 10%, equity flat, cash flat |
| `withdraw-20-percent` | User pulls 20% to cash; show what's left in each holding |
| `lose-job-need-emergency` | 6 months of income ($35k) needed; show portfolio after that drawdown |

Result includes: projected total value, projected allocation per asset class, per-goal timeline impact in months (positive = goal pushed back), `needs_action` flag, and a one-line `human_summary` (engine-generated; Kuber rephrases for voice).

#### `recommendRebalance(portfolio, target, source) → RebalanceRecommendation`

Compare current allocation to target. If drift > 5pp on any asset class, generate trades to bring it back.

Source flag tells the narrator (Kuber) the context:
- `drift` — routine "your allocation drifted, here's the fix"
- `scenario` — "given the scenario, here's what I'd do"
- `panic` — bias toward more conservative trades, smaller moves
- `discover` — output trades to add new money, not move existing

Returned `RebalanceRecommendation` includes the trades array, before/after allocation snapshots, tax cost, fees, per-goal impacts, and a rationale summary string.

#### `computeFitScore(holding, userProfile) → number`

Output: integer 0–100. Combines:
- Holding's risk profile (derived from asset_class + sector) vs. user's risk_tolerance (40% weight)
- Time-to-nearest-goal vs. holding volatility (30% weight)
- Current weight vs. recommended weight for this asset class (30% weight)

UI thresholds: green ≥80, amber 60–79, coral <60.

#### `computeGoalImpact(portfolio, trades, goals) → GoalImpact[]`

Given a portfolio and proposed trades, project forward to each goal's target date and report how many months earlier or later the goal is reached vs. doing nothing.

Use a simple expected-return model:
- Equity: 8%/yr
- Debt: 6%/yr
- Gold: 4%/yr
- Cash: 1%/yr

Document the assumption in the rationale string. No Monte Carlo, no fancy models.

### 4.3 Out of scope

- Tax-lot accounting (use flat 10% LTCG estimate for sells of holdings older than 1 year, 0 for newer; document this assumption)
- Real transaction fees (always $0 for the demo, make it clear in the receipt)
- International tax / regulations
- Real Monte Carlo simulation (use point estimates)

### 4.4 Testing

At least one test per public function before integration. Place tests in `src/*.test.ts`. Pure functions — no mocks needed.

---

## 5. Kuber (the agent)

Lives in `packages/kuber`. Owned by Person 2.

### 5.1 LLM provider

**Groq** with model `llama-3.3-70b-versatile`. OpenAI-compatible API at `https://api.groq.com/openai/v1/chat/completions`. Env var: `GROQ_API_KEY`.

### 5.2 Voice

- **STT:** Browser Web Speech API. Lives in `apps/web` and `apps/extension`, NOT in this package.
- **TTS:** ElevenLabs streaming. Voice **Daniel** (calm, trusted-advisor energy). Model `eleven_turbo_v2_5` for lowest latency. Env vars: `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `ELEVENLABS_MODEL_ID`.

Latency budget: end of user speech → first audio plays back: under 2 seconds. Achieved by streaming Groq output sentence-by-sentence into ElevenLabs as it generates.

### 5.3 System prompt

Locked in `packages/kuber/src/prompts/index.ts` as `KUBER_SYSTEM_PROMPT`. Key rules:

1. **Never compute numbers.** Engine produces them, Kuber narrates.
2. **Three-layer jargon answers**: human meaning, what it tells you, what it means for THIS user (tied to their portfolio).
3. **Connect macro events to specific holdings** the user owns.
4. **Default to "do nothing"** when that's correct. Beginners panic and overtrade.
5. **No specific stock recommendations** outside engine output.

### 5.4 Public API (Person 2 implements)

```ts
chat(messages, context) → AsyncIterable<string>
narrate(recommendation, context) → AsyncIterable<string>
explainJargon(term, context) → AsyncIterable<string>
speak(text) → ReadableStream<Uint8Array>
```

Streaming generators yield text tokens as Groq emits them. The web app's `/api/kuber/chat` route wraps these into Server-Sent Events for the client.

### 5.5 Demo-mode hardcoding

For the live demo, the four chip questions on /home and the three scenario picks have **hardcoded responses** as fallback. If Groq is slow or fails, the demo flows from the hardcoded path. Document which questions are hardcoded vs. live-generated in `packages/kuber/src/demo-responses.ts`.

---

## 6. Web app (`apps/web`)

### 6.1 Stack

- Next.js 16 App Router
- TypeScript strict mode
- Tailwind CSS
- shadcn/ui components (added on demand via `pnpm dlx shadcn@latest add ...`)
- Recharts for the journey chart
- Clerk for auth
- Workspace dependencies: `@investiq/ui`, `@investiq/data`, `@investiq/engine`, `@investiq/kuber`

### 6.2 API routes

| Route | Method | Purpose |
|---|---|---|
| `/api/kuber/chat` | POST (SSE) | Streaming chat with Kuber. Body: `{ messages, mode }`. Reads fixtures server-side, calls `chat()` from kuber package |
| `/api/kuber/narrate` | POST (SSE) | Stream narration of a rebalance recommendation. Body: `{ recommendation }` |
| `/api/kuber/jargon` | POST (SSE) | Stream a jargon explanation. Body: `{ term }` |
| `/api/kuber/speak` | POST | Pipe text through ElevenLabs, return audio stream |
| `/api/engine/scenario` | POST | Run a scenario. Body: `{ scenarioName }`. Returns ScenarioResult |
| `/api/engine/rebalance` | POST | Generate a rebalance recommendation. Body: `{ source, scenarioName? }`. Returns RebalanceRecommendation |
| `/api/engine/rebalance` | POST | Generate a rebalance recommendation. Body: `{ source }`. Returns RebalanceRecommendation |
| `/api/portfolio` | GET | Current portfolio state (just reads the fixture for demo) |

For the hackathon, all routes read fixtures from `@investiq/data` server-side. No DB.

### 6.3 Auth

Clerk with one preloaded demo user (Priya) credentials documented in the team Slack. Anyone can also sign up; new accounts land on an empty state with a "Welcome — Kuber will help you build a portfolio" message and a CTA to /Kuber/discover.

For the live demo, ONLY use the Priya account.

### 6.4 Floating Kuber widget

Implemented once in `apps/web/src/components/FloatingKuber.tsx`, mounted in the root layout. Hidden on `/Kuber/*` and `/panic` via pathname check.

### 6.5 Source the Figma Make output

The Figma Make export IS the design system. Person 1 pastes the exported code into `apps/web/src/app/*` and adapts:
- Replace any inline color hex codes with imports from `@investiq/ui/tokens`
- Wire data from `@investiq/data` fixtures via `loadDemoData()`
- Replace any client-side mock fetches with calls to the API routes above

---

## 7. Chrome extension (`apps/extension`)

### 7.1 Stack

Plasmo framework with React. Manifest V3. Content script + popup + background.

### 7.2 What it does

Click extension icon while browsing → injected overlay slides in from right side of the current page → Kuber chat appears with context from the page (article title, main text scraped via content script) → user voice-chats with Kuber → close overlay.

### 7.3 What's on the demo path (Day 1)

1. Priya navigates to a CNBC article about RBI rates
2. Clicks the InvestIQ extension icon
3. Overlay appears, Kuber voice-greets her, ties article to her bond fund
4. She closes overlay

Hardcode the response for the demo. The overlay calls `${NEXT_PUBLIC_APP_URL}/api/kuber/chat` for live questions but Day 1's specific exchange is pre-recorded for reliability.

### 7.4 Settings

Toolbar popup (small, ~320×400px) with: sign-in status, voice on/off toggle, "Open full app" button. NOT a clone of /home. Just settings.

---

## 8. Design tokens

Full token list in `packages/ui/src/tokens.ts`. Summary:

```
background:        #FAF8F5  warm off-white
backgroundPanic:   #F5F2EC  cooler cream (/panic only)
text:              #1A2438  deep navy
textMuted:         #6B7B8C  muted blue-gray
accent:            #3D7A6F  muted teal — primary CTAs, Kuber
coral:             #E8836B  warm coral — "I'm freaking out" only
green:             #7BA888  soft green — healthy
amber:             #D4A574  soft amber — caution
border:            #E8E4DC
cardBg:            #FFFFFF
```

Type: Inter for UI, DM Serif Display for hero sentences and big numbers.

Radii: 8 / 12 / 16 / 24 / pill (9999).

NO red except in error states (which the demo mostly avoids). The Today's Change negative number is muted gray, not red.

---

## 9. Deployment

- **Web app:** Netlify, connected to the GitHub repo's `main` branch. Auto-deploy on push.
- **Extension:** Loaded unpacked from `apps/extension/build/chrome-mv3-prod` for the demo. Don't bother publishing to the Chrome Web Store — review takes weeks.

Environment variables on Netlify: same as `.env.example`. Person 2 sets the keys; Person 1 deploys.

---

## 10. Constraints, scope, and what we are explicitly NOT building

These have been agreed and should not be quietly added back during the build:

- No real database (static JSON fixtures only)
- No real brokerage integration
- No multi-user real-time portfolios
- No mobile native app
- No production-grade security review
- No internationalization (English only, despite the Indian persona)
- No real Monte Carlo or sophisticated portfolio optimization
- No tax-lot accounting; flat LTCG estimate only
- No analyst-rating data feeds; "Bulls say / Bears say" is hand-written plain English
- No real-time price feed; prices are snapshots in the fixture
- No paid ElevenLabs voice cloning; the default Daniel voice
- No production payment / billing
- No PWA, service worker, offline mode
- No accessibility audit (we aim for keyboard nav and reasonable contrast but won't promise WCAG AA)
- No analytics, no telemetry

When a judge asks "how would you scale this?" the answer is: Postgres + Prisma for data, Plaid for brokerage links, real expected-return model with Monte Carlo, multi-tenant Clerk org, mobile native via Expo, full WCAG AA pass. Three-month roadmap. Not in this hackathon.

---

## 11. Definition of done for the demo

The demo is "done" when this script runs end-to-end without intervention:

1. Priya logs in (or is already logged in on the demo machine)
2. /home renders with hero, three numbers, journey chart, ask-Kuber chips, "what you should know today," and holdings preview
3. Tap "Why did my portfolio drop?" chip → /Kuber chat mode → Kuber's voice response plays within 2 seconds
4. Navigate to /current → grid of holdings, one with amber border
5. Tap an amber-border card → /current/[symbol] detail with "How this fits your portfolio" panel
6. Tap a (i) icon next to a jargon term → popover with plain explanation
7. Back to /home → tap "I'm freaking out" → /panic with calm treatment
8. Tap "Run a scenario" → /rebalance with scenario picker open → pick "What if the market drops 20%?"
9. /rebalance loads with scenario mode active. Kuber narrates the projection. Receipt shows engine-computed before/after donuts, two trade cards, line items, "Confirm changes" button.
10. Tap Confirm → animation → /home reloads with updated state and updated hero sentence

If steps 3, 9, or 10 break, the demo fails. Everything else is recoverable on the fly.

---

*This spec is current as of project setup. If you change architecture, update this document in the same PR.*

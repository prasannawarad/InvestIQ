# InvestIQ — Project Specification

This document is the source of truth for what InvestIQ is, what it does, and how it's built. AI coding agents (Codex, Claude Code, Cursor) and human contributors should read this before writing or generating code.

If something here conflicts with code in the repo, this document wins — update the code, not the spec, unless the team agrees to change direction.

---

## 1. Product

### 1.1 What it is

InvestIQ is a portfolio management web app for beginner investors. The target user has money in stocks or mutual funds but is intimidated by traditional brokerage UIs and doesn't understand financial jargon. The product helps them track investments, understand risk, and rebalance during market uncertainty — all without dumping Bloomberg-style data on them.

The AI agent inside the app is named **Kuber** (from Hindu tradition — the deity of wealth). Kuber appears in three places: as the discovery agent on `/Kuber`, as a floating chat widget on most other pages, and as a Chrome extension overlay on third-party sites.

### 1.2 Demo persona

Priya Sharma. 38. Schoolteacher in Pune. Two dependents. $22,300 invested. Two goals: house deposit (3 years), retirement (26 years). Risk profile: balanced. Cautious by temperament.

Currency for the demo is **USD** despite the Indian persona. The "Kuber" name keeps the cultural anchor; dollars are easier for Dallas judges.

### 1.3 Hackathon rubric

| Weight | Criterion | How we win it |
|---|---|---|
| 30% | UX & empathy | Plain language everywhere, "I'm freaking out" button, calm /panic page, jargon translations with (i) icons |
| 30% | Innovation in rebalancing | /rebalance page with engine-computed projections, scenario picker, line-item receipt, Kuber narration |
| 20% | Transparency & trust | Receipt with tax cost, fees, goal impact; "Why" expansion on every trade card; three-layer jargon explanation |
| 20% | Technical execution | End-to-end working demo across web app + Chrome extension + voice |

### 1.4 The three-day demo narrative

The demo tells three vignettes from Priya's life. See `DEMO.md` for the script. Every feature decision should be filtered through "does this serve the demo script?"

- **Day 1** — Priya reads a CNBC article. The Chrome extension overlays Kuber. Kuber connects the news to her bond fund, tells her to do nothing.
- **Day 2** — Priya checks the app. /home → /current → a holding detail. She asks Kuber (via the floating widget) about jargon, learns about fees compounded over 26 years.
- **Day 3** — Priya panics about a market drop. Taps "I'm freaking out." Runs the "market drops 20%" scenario via /rebalance. Kuber narrates. She confirms two trades.

---

## 2. Architecture overview

### 2.1 Three Kuber surfaces — each does ONE job

The agent's surfaces have non-overlapping responsibilities. Don't blur them.

| Surface | Job | Layout |
|---|---|---|
| `/Kuber` page | **Discovery** — find new investments | Jobright-style: status banner top, filters drawer, top-matches grid, running tally |
| Floating widget | **Quick chat** — Q&A, jargon, "am I at risk?" | Small chat panel bottom-right, common-question chips above input |
| Chrome extension overlay | **Contextual chat** — questions about the page being read | Small chat panel that injects into third-party pages, with "Open in app →" CTA |

`/Kuber` has NO chat panel. Chat lives in the widget and extension. This separation is deliberate — don't add a chat panel to /Kuber later.

### 2.2 Top-level routes

| Route | Description | In nav | Owner |
|---|---|---|---|
| `/home` | Dashboard — hero sentence, three numbers, journey chart, ask-Kuber chips, "what you should know today," holdings preview | Yes | Person 1 |
| `/current` | Grid of all holdings with fit scores | Yes | Person 1 |
| `/Kuber` | Discovery agent — filters → matches → add → confirm | Yes | Person 2 |
| `/rebalance` | Decision/commit surface — drift, scenario, panic modes | Yes | Person 3 |
| `/settings` | User preferences | Yes | Person 1 |
| `/profile` | User identity and goals | Yes | Person 1 |
| `/extension` | Static page explaining the Chrome extension | Secondary nav | Person 4 |
| `/help` | Glossary + FAQ | Secondary nav | Person 1 |

### 2.3 Sub-routes / deep-linked pages

| Route | Description | Reached from |
|---|---|---|
| `/current/[symbol]` | Single holding detail with "How this fits your portfolio" panel | Tap card on /current |
| `/preview/[symbol]` | Preview a holding the user does NOT own. Match score, why-fits / why-not-fits | From /Kuber match card name (not the +Add button) |
| `/rebalance?source=panic` | Rebalance with conservative bias | "I want to do something protective" on /panic |
| `/rebalance?source=scenario&name=market-drop-20` | Rebalance after running a what-if | Scenario picker on /rebalance, or floating widget redirect |
| `/panic` | Calm full-page takeover | "I'm freaking out" button (visible on /home and the floating widget) |

### 2.4 Navigation structure

**Left rail**, 240px wide, full height, white background with subtle right border.

```
┌─────────────────┐
│ IQ  InvestIQ    │
├─────────────────┤
│ 🏠 Home         │
│ 📊 Current      │
│ 💬 Kuber        │
│ ⚖️  Rebalance   │
│ ⚙️  Settings    │
│ 👤 Profile      │
├─────────────────┤
│ 🧩 Extension    │
│ ❓ Help          │
├─────────────────┤
│ [Avatar]        │
│ Priya Sharma    │
│ Sign out        │
└─────────────────┘
```

Active link: muted teal text + thin teal vertical bar on left edge.

**Floating Kuber widget**, bottom-right, on every page EXCEPT `/Kuber`, `/rebalance`, and `/panic`.

- Closed: 56x56px circular button, muted teal, white "K", soft drop shadow, 5s pulse
- Open: 380x500px chat panel anchored bottom-right with 24px margin
- Header: "Kuber" + listening indicator + close X
- **Empty state body:** small "Hi Priya. What can I help with?" greeting, then categorized chip groups:
  - *Scenarios:* "What if markets drop 20%?", "What if I need $5,000 soon?", "What if inflation stays high?"
  - *Quick questions:* "Am I at risk?", "What should I know today?", "Why did my portfolio drop?"
  - *Jargon:* "Explain P/E ratio", "What's an expense ratio?"
- Once conversation starts, chips hide and conversation fills the body
- Footer: voice/text input (mic left, text middle, send right), small "Open full Kuber →" link bottom-left
- **Routing rule:** if the user message implies a scenario or rebalance ("what if markets drop", "should I rebalance", "am I too risky in stocks"), the widget acknowledges with one short sentence ("Let me run that — opening Rebalance...") and the page navigates to `/rebalance` with appropriate query params

---

## 3. Page specs

### 3.1 /home

Vertical order from top:

1. **Hero block.** Large serif sentence ("Your portfolio is healthy.") with a small icon (sun for healthy, cloud for caution, storm for "needs attention"). Right rail: "I'm freaking out" coral button + "Run a scenario" teal outline button (links to /rebalance).
2. **Three stat cards.** Total Value, Today's Change (in MUTED gray for small moves like 0.05%; only red for >2% drops), Health Score with a one-word verdict.
3. **Journey chart.** Line chart of portfolio value over 1Y default, with milestone annotations ("Started," "Added $500," "Market dip"). Time toggle pills: 1M / 3M / YTD / 1Y / All.
4. **Ask Kuber chips.** 4 chips that open the floating widget pre-filled: "Am I at risk?", "What should I know today?", "Why did my portfolio drop?", "Should I worry about the news?"
5. **What you should know today.** 2 cards. Headline + plain summary + "What this means for you" connector sentence tied to her holdings.
6. **Your holdings.** Top 3 cards horizontally. Friendly name, dollar value, "X% of portfolio" line, fit score badge. "See all →" link to /current.
7. **Looking to invest more?** Small text link below holdings → /Kuber.

### 3.2 /current

Top: filter pills (All, Stocks, Funds, Bonds, Gold).

Grid of holding cards (3-column desktop, 1-column mobile). Each card:
- Small logo or letter avatar
- Friendly name + plain-language size label ("Big established company" not "Mid cap")
- Location (country)
- Fit score badge — green ≥80, amber 60–79, coral <60
- Dollar value + "X% of portfolio" small text
- "Ask Kuber" link (opens floating widget pre-filled with "tell me about [name]")

Cards with fit < 80 get an amber border. Tap card → /current/[symbol].

### 3.3 /current/[symbol]

- Header: logo, name, size label, "Bought N months ago" badge
- Right card: fit score with "Why this fits you" expandable list
- "How this fits your portfolio" panel:
  - Position size ("4.3% of your portfolio")
  - Cost basis ("Bought at $1,450 avg, up 11.7%")
  - Tax context ("Selling now would create $85 in long-term gains")
  - Goal connection ("30% earmarked for retirement; selling sets timeline back ~2 months")
- "Bulls say / Bears say" two-column plain-language cards (NO sell-side analyst quotes — write them ourselves)
- Jargon stats row: P/E ratio, Market cap, Dividend yield, Beta — each with (i) icon → click opens popover with plain-language explanation + "Ask Kuber more" button (opens widget)
- "Ask Kuber about [symbol]" CTA at bottom

### 3.4 /Kuber — Discovery agent ⭐

This page IS the discovery surface. No chat. Modeled on Jobright's discovery UI.

**Layout** (full-width content area to the right of the global left nav):

```
┌─────────────────────────────────────────────────────────────────┐
│  [Status banner: Standby / Running]  [Filters icon]  [Settings] │
├──────────────────────────────────┬──────────────────────────────┤
│                                  │                              │
│  Welcome message                 │  Top Matches                 │
│  + brief instructions            │  (empty until Start clicked) │
│                                  │                              │
│  [List of selected holdings      │  ┌────────────────────────┐  │
│   appears here once user adds]   │  │ Logo  Company Name   84%│ │
│                                  │  │ Industry · Size · Loc   │ │
│                                  │  │ [Why this match ▾]      │ │
│                                  │  │              [+ Add]    │ │
│                                  │  └────────────────────────┘  │
│                                  │  ...more cards...            │
│                                  │                              │
└──────────────────────────────────┴──────────────────────────────┘
```

#### 3.4.1 Status banner (top)

States:

- **Standby** (initial): "Standby · Configure your filters to start" with "Start" button (disabled until filters are valid)
- **Running** (after Start): "X holdings being added · $Y of $Z used · $W left" with running totals updating live as the user adds holdings

The banner is sticky at the top of the content area.

#### 3.4.2 Filter drawer

Opens from a "Filters" icon button on the right of the status banner. Slides in from the right as a drawer (Jobright-style). Width: ~400px. Sections:

1. **Money to invest** *(required)* — single $ input. Total budget for this session. Validation: must be > $0.
2. **Per-position cap** *(optional)* — max $ in any single holding. Default: 25% of budget. Slider or input.
3. **Industry / Sector** — multi-select chips: Tech, Finance, Healthcare, Energy, Consumer, Real Estate, Industrials.
4. **Company size** — multi-select: Big established / Medium growing / Small growing.
5. **Risk appetite** — slider 1–5, defaulted from user's profile but overridable for this session.
6. **Asset class mix** — checkboxes: Stocks / Funds / Bonds / Gold.
7. **Geography** — radio: Domestic only / Include international.
8. **Keywords** — chip input. User types keywords (e.g. "AI", "renewable", "dividend"); each becomes a tag.

Footer of drawer: "Cancel" link + "Apply & Start" teal button. Apply triggers the match generation and switches the banner from Standby to Running.

#### 3.4.3 Top Matches grid (right)

Shows 6–10 match cards after Start is clicked. Each card:

- Logo + company/fund name
- Industry · size · location (small text)
- Match % badge (large, top-right corner). Green ≥80, amber 60–79.
- Expandable "Why this match" — bullet list of 3–4 reasons in plain English (e.g. "Big established tech company", "Matches your interest in stable companies", "Would bring tech exposure from 12% to 14%")
- **+Add button** — clicking opens an "Add holding" popup (NOT inline input)

Tapping the card name (anywhere except the +Add button) opens `/preview/[symbol]`.

#### 3.4.4 Add holding popup

Triggered by clicking +Add on a match card. Modal with:

- Card header: "Add [Company Name] to your basket"
- Slider for amount, range $0 to (per-position cap or budget remaining, whichever is smaller). Default: 10% of remaining budget.
- Below slider: text showing current allocation impact: "Adding $200 brings tech from 12% to 13.4%"
- Cancel + "Add to basket" teal button. On Add: holding goes into the running list on the left, banner totals update, popup closes.

#### 3.4.5 Running list (left)

Once user adds the first holding, the welcome message is replaced by:

- "Holdings in your basket" header
- Each added holding as a small card: logo, name, $ amount, small × button to remove
- Total at bottom: "$X committed of $Y budget"
- **Review & Confirm** big teal button (sticky at the bottom)

#### 3.4.6 Review & Confirm popup

Triggered by clicking "Review & Confirm." Modal with:

1. Pie chart of new TOTAL portfolio allocation (existing holdings + the new ones)
2. Industry breakdown of money being added: "70% Tech, 20% Healthcare, 10% Energy"
3. "Where you might want to diversify next" hint — looks at gaps in the new allocation (e.g. "You're light on bonds. Consider adding 10% to your debt allocation next month.")
4. Confirm + Cancel buttons

On Confirm: commits all basket holdings to the in-memory portfolio (React state, not the JSON file), redirects to /home with hero updated. On Cancel: returns to /Kuber with basket intact.

### 3.5 /rebalance — The decision-and-commit surface ⭐

The centerpiece feature. 30% of the rubric points live here.

Single page, vertically stacked sections.

#### Section 1 — Mode picker (top)

Three mode chips horizontally:
- **Drift (default)** — auto-loads when entering /rebalance with no query params. Engine reads current vs. target allocation; if drift > 5pp on any class, generates trades.
- **Scenario** — chip with dropdown of scenarios:
  - "What if markets drop 20%?" (`market-drop-20`)
  - "What if markets drop 30%?" (`market-drop-30`)
  - "What if I need money in a year?" (`withdraw-20-percent`)
  - "What if inflation stays high?" (`inflation-stays-high`)
  - "What if I lose my job?" (`lose-job-need-emergency`)
- **Panic** — only highlighted when `?source=panic`. Engine biases toward more conservative trades, smaller moves.

URL query params:
- `/rebalance` → drift mode
- `/rebalance?source=panic` → panic mode
- `/rebalance?source=scenario&name=market-drop-20` → scenario mode pre-loaded

#### Section 2 — Kuber narration (~1/3 of viewport)

Voice + text panel. Streams from `narrate()` in `@investiq/kuber`.

Examples:
- *Drift:* "You're 65% in stocks but your target is 60%. Want me to rebalance?"
- *Scenario market-drop-20:* "If markets drop 20% from here, your portfolio goes from $22,300 to $19,500. Here's how to soften the blow."
- *Panic:* "Markets are jumpy. Let's bring you a bit closer to your target so a drop hurts less."

#### Section 3 — Receipt (~2/3 of viewport)

The transparent receipt:
- Title: "Recommended changes"
- Before/After donut charts side-by-side
- Trade cards with expandable "Why this trade"
- Cost line items: "Tax cost: $0", "Trade fees: $0"
- Goal impact line items, one per goal: "House deposit goal: improves by 1 month", "Retirement goal: unchanged"
- Confirm + Cancel buttons

**On Confirm:**
- Animate trades applying
- Update in-memory portfolio (React state)
- Redirect to /home with updated hero sentence

**Reached from:** top-level nav · /home "Run a scenario" · /panic "Run a scenario" or "I want to do something protective" · floating widget redirect on quantitative questions.

### 3.6 /panic

Full-page takeover. NO left nav (just "← Back to Home" link top-left).

- Cooler cream background (#F5F2EC)
- Centered content max 600px
- Top: soft gradient orb illustration (200px, muted teal-to-cream)
- Hero: "Take a breath." 48px serif
- Subhero: "Most of the time, the right thing to do is nothing." muted gray
- Three large option cards stacked vertically:
  1. "Show me what's actually happening" → /Kuber-style guidance (actually opens floating widget on /home with pre-filled prompt)
  2. "Run a scenario" → /rebalance with scenario picker open
  3. "I want to do something protective" → /rebalance?source=panic
- No red/orange/amber colors, no exclamation marks, no urgency
- No floating Kuber widget on this page

### 3.7 /settings

Single-column form, max-width 720px. Sections:
- **Communication tone** — radio: "Friendly and simple" / "Direct and concise" / "Detailed with explanations"
- **Notification frequency** — radio: "Daily" / "Weekly" / "Only when something matters"
- **Risk profile** — slider 1–10 with live label ("Cautious" / "Balanced" / "Growth-focused")
- **Voice** — toggle: "Let Kuber speak out loud" + voice preview button
- **Currency** — dropdown (USD locked for demo)

Save button at bottom. Updates in-memory user_profile, shows toast "Saved."

### 3.8 /profile

Single-column, max-width 720px. Sections:
- **About me** — name, age, occupation, location (read-only for demo)
- **Financial snapshot** — annual income, monthly savings, dependents, emergency fund months (editable)
- **Goals** — cards per goal: name, target amount, current progress (progress bar), target date, priority. "+ Add goal" button.
- **Risk profile summary** — read-only: "You're a Balanced investor with medium risk tolerance."

### 3.9 /extension

Static informational page.

- Top: "← Back to Home" link
- Hero: "Chrome Extension" 64px serif
- Subhero: "Kuber follows you across the web to answer money questions in context."
- IMPORTANT: search Figma export for any "Sage" references and replace with "Kuber"
- Demo tabs: "Apple.com Demo" / "CNBC Article Demo" / "Gmail Demo"
- Below tabs: side-by-side mockups
- Bottom: "Install for Chrome" button

### 3.10 /help

Single-page glossary + FAQ.

- **Quick glossary** — accordion: P/E, dividend yield, expense ratio, beta, market cap, NAV, AUM, etc. Plain-language explanations matching the (i) tooltips throughout the app.
- **Common questions** — FAQ cards
- **Contact us** — placeholder

The (i) tooltips have a "see full glossary →" link to /help.

---

## 4. Data

### 4.1 Three core fixtures

In `packages/data/src/fixtures/`. Loaded via `loadDemoData()` from `@investiq/data`.

- `user_profile.json` — Priya's identity, financial context, risk profile, goals, preferences
- `portfolio.json` — Holdings, current values, allocation, target allocation, drift, risk metrics
- `market_context.json` — Today's market snapshot, macro context, recent events with `relevance_to_user` flag

Schemas in `packages/data/src/schemas.ts` are the contract. Update Zod first, then fixtures, then notify team.

### 4.2 Currency note

Fixtures show INR amounts but the UI displays USD by relabeling (not converting). Demo-day shortcut. If asked: "this is demo data; production would ingest via Plaid."

### 4.3 Key types (full Zod schemas in `packages/data/src/schemas.ts`)

- `UserProfile` — identity, financial_context, risk_profile, goals, preferences
- `Portfolio` — summary, allocation, holdings, risk_metrics
- `Holding` — symbol, name, asset_class, subcategory, sector, quantity, prices, weight
- `MarketContext` — market_snapshot, macro_context, recent_events
- `RebalanceRecommendation` — trades, before/after allocation, tax cost, fees, goal impacts, rationale
- `Trade` — action (buy/sell), symbol, amount, reason
- `GoalImpact` — goal_id, goal_name, delta_months
- `DiscoveryFilters` — money_to_invest, per_position_cap, industries, sizes, risk, asset_classes, geography, keywords
- `MatchCandidate` — symbol, name, logo, industry, size, location, match_score, why_match (string array)
- `BasketEntry` — match symbol + amount + timestamp

---

## 5. Engine (deterministic math)

In `packages/engine`. **No LLM calls.** All numbers shown to judges come from here.

### 5.1 Public API

```ts
simulateScenario(portfolio, scenarioName) → ScenarioResult
recommendRebalance(portfolio, target, source) → RebalanceRecommendation
computeFitScore(holding, userProfile) → number
computeGoalImpact(portfolio, trades, goals) → GoalImpact[]
generateMatches(filters, userProfile, portfolio) → MatchCandidate[]   // NEW for /Kuber discovery
```

### 5.2 generateMatches — the discovery engine

Given the user's filters and existing portfolio, produce 6–10 ranked match candidates from a hardcoded universe of ~40 fictional companies (we'll define them in `packages/engine/src/universe.ts`). Each candidate gets a match_score 0–100 based on:

- Industry overlap with filter chips (30%)
- Size match with filter (20%)
- Risk match with user's adjusted risk preference (20%)
- Diversification benefit (does it fill a gap in the current portfolio?) (20%)
- Keyword match (10%)

Output sorted by match_score desc.

The universe is fictional but plausible — names like "TechFin Holdings", "Bharat Energy Ltd", etc. We don't pretend to recommend real stocks for legal reasons.

### 5.3 Other functions

- **simulateScenario**: 5 scenarios. `market-drop-20` is the demo scenario; must be airtight.
- **recommendRebalance**: drift / scenario / panic / discover sources.
- **computeFitScore**: 0–100. Green ≥80, amber 60–79, coral <60.
- **computeGoalImpact**: simple expected-return model — equity 8%, debt 6%, gold 4%, cash 1%.

### 5.4 Out of scope

- Tax-lot accounting (flat 10% LTCG estimate)
- Real Monte Carlo
- International tax / regulations
- Real fees (always $0 in receipt)

---

## 6. Kuber (the agent)

In `packages/kuber`. Owned by Person 2.

### 6.1 LLM provider — Groq

Model `llama-3.3-70b-versatile`. OpenAI-compatible API. Env: `GROQ_API_KEY`.

### 6.2 Voice

- **STT:** Browser Web Speech API. In `apps/web` and `apps/extension`, NOT this package.
- **TTS:** ElevenLabs streaming. Voice **Daniel**. Model `eleven_turbo_v2_5`. Env: `ELEVENLABS_*`.

Latency budget: end of user speech → first audio: under 2s. Stream Groq sentence-by-sentence into ElevenLabs.

### 6.3 System prompt

Locked in `packages/kuber/src/prompts/index.ts`. Rules:

1. NEVER compute numbers. Engine produces them.
2. Three-layer jargon answers: human meaning, what it tells you, what it means for THIS user.
3. Connect macro events to specific holdings.
4. Default to "do nothing" when correct.
5. No specific stock recommendations outside engine output.

### 6.4 Public API

```ts
chat(messages, context) → AsyncIterable<string>          // for floating widget + extension
narrate(recommendation, context) → AsyncIterable<string> // for /rebalance
explainJargon(term, context) → AsyncIterable<string>     // for (i) tooltips
speak(text) → ReadableStream<Uint8Array>                 // ElevenLabs TTS
```

### 6.5 Demo-mode hardcoding

Hardcoded responses in `packages/kuber/src/demo-responses.ts` for:
- Day 1 article exchange (extension)
- Day 2 jargon question
- Day 3 panic narration

Live Groq is the default; hardcoded is the fallback if Groq is slow.

---

## 7. Web app (`apps/web`)

### 7.1 Stack

Next.js 16 App Router · TypeScript strict · Tailwind · shadcn/ui · Recharts · Clerk auth · Workspace deps (`@investiq/ui|data|engine|kuber`).

### 7.2 API routes

| Route | Method | Purpose |
|---|---|---|
| `/api/kuber/chat` | POST (SSE) | Streaming chat for widget + extension |
| `/api/kuber/narrate` | POST (SSE) | Narration for /rebalance |
| `/api/kuber/jargon` | POST (SSE) | Jargon explanation for tooltips |
| `/api/kuber/speak` | POST | ElevenLabs TTS audio stream |
| `/api/engine/scenario` | POST | Run a scenario, return ScenarioResult |
| `/api/engine/rebalance` | POST | Generate rebalance recommendation |
| `/api/engine/matches` | POST | Generate /Kuber matches based on filters |
| `/api/portfolio` | GET | Current portfolio state (reads fixture) |
| `/api/portfolio/commit` | POST | Commit basket from /Kuber to portfolio (in-memory) |

### 7.3 Auth

Clerk with one preloaded demo user (Priya). New signups land on empty state. **For live demo, ONLY use the Priya account.**

### 7.4 Floating Kuber widget

In `apps/web/src/components/FloatingKuber.tsx`, mounted in root layout. Hidden on `/Kuber/*`, `/rebalance/*`, and `/panic` via pathname check.

### 7.5 Source the Figma Make output

Figma Make export IS the design system. Don't redesign. Person 1 pastes export into `apps/web/src/app/*` and adapts:
- Replace inline hex codes with imports from `@investiq/ui/tokens`
- Wire data from `@investiq/data` fixtures via `loadDemoData()`
- Replace mock fetches with API route calls

---

## 8. Chrome extension (`apps/extension`)

### 8.1 Stack

Plasmo · React · Manifest V3 · content script + popup + background.

### 8.2 What it does

Click extension icon → injected overlay slides in from right side of current page → Kuber chat with page context → user voice/text-chats → close.

### 8.3 Demo path (Day 1)

1. Priya on a CNBC article about RBI rates
2. Clicks extension icon
3. Overlay appears, Kuber voice-greets, ties article to her bond fund
4. Closes overlay

Hardcode the response. Live `${NEXT_PUBLIC_APP_URL}/api/kuber/chat` for ad-hoc questions.

### 8.4 Settings popup

Toolbar popup ~320×400px. Sign-in status, voice on/off toggle, "Open full app" button. NOT a clone of /home.

---

## 9. Design tokens

In `packages/ui/src/tokens.ts`.

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
Radii: 8 / 12 / 16 / 24 / pill.
NO red except real errors. Today's Change negative is muted gray, not red.

---

## 10. Deployment

- **Web app:** Netlify, connected to GitHub `main` branch. Auto-deploy on push.
- **Extension:** Loaded unpacked from `apps/extension/build/chrome-mv3-prod` for the demo.

Env vars on Netlify match `.env.example`. Person 2 sets keys; Person 1 deploys.

---

## 11. Constraints — what we are NOT building

- No real database (static JSON fixtures only)
- No real brokerage integration (Plaid, etc.)
- No multi-user real-time portfolios
- No mobile native app
- No production security review
- No internationalization
- No real Monte Carlo
- No tax-lot accounting; flat LTCG estimate
- No analyst-rating data feeds
- No real-time price feed
- No paid voice cloning
- No production payment / billing
- No PWA / service worker / offline
- No accessibility audit
- No analytics

If a judge asks "how would you scale?": Postgres + Prisma, Plaid, real expected-return model, multi-tenant Clerk org, mobile via Expo, full WCAG AA. Three-month roadmap.

---

## 12. Definition of done for the demo

1. Priya logs in (or pre-logged on demo machine)
2. /home renders with hero, three numbers, journey chart, ask-Kuber chips, "what you should know today," holdings preview
3. Tap an "Ask Kuber" chip → floating widget opens with question pre-filled → Groq response streams + ElevenLabs voice plays within 2s
4. Navigate to /current → grid with one amber-bordered card
5. Tap amber card → /current/[symbol] detail with "How this fits your portfolio" panel
6. Tap (i) icon → popover with plain explanation
7. Back to /home → tap "I'm freaking out" → /panic with calm treatment
8. Tap "Run a scenario" → /rebalance with scenario picker → "What if the market drops 20%?"
9. /rebalance loads scenario mode. Kuber narrates. Receipt shows engine-computed before/after, two trade cards, line items, Confirm button.
10. Tap Confirm → animation → /home reloads with updated state
11. Bonus path: /Kuber → filters drawer → fill out → Apply & Start → matches appear → +Add → popup → Add to basket → Review & Confirm → /home updated

If steps 3, 9, or 10 break, demo fails. Everything else is recoverable on the fly.

---

*Update this document in the same PR as architecture changes.*

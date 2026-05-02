# Demo Script — Priya's Three Days with InvestIQ

Total runtime target: 5.5 minutes (30s intro + 4.5min demo + 30s outro).

## Intro (30s)

"Meet Priya. She's 38, teaches 7th grade in Pune, has $22,300 invested and no idea what most of those words mean on a typical brokerage screen. Her two goals: a house deposit in 3 years, and retirement in 26. Today we'll show you three days in her life with InvestIQ — three different moments where the app earned its place."

## Day 1 — Tuesday morning, reading the news (60s)

**Setting:** Priya is on her laptop. Browser open to CNBC. Article about RBI rates.

**Beats:**
1. Show the article on screen
2. Click extension icon — Kuber overlay slides in from right
3. Kuber speaks: "Hey Priya. I see you're reading about the RBI's rate decision. Here's the short version — rates staying steady is mildly good news for the bond fund you own, about 6% of your portfolio. Want me to walk you through why?"
4. Priya says yes (or operator clicks the affirm button)
5. Kuber gives a 30-second plain-English explanation tying macro event to her bond fund
6. Closes with: "Bottom line — you don't need to do anything. You're positioned for this."
7. Close overlay

**What this proves:** Extension works in-context. Kuber connects external events to specific holdings. Agent de-escalates instead of hyping action.

## Day 2 — Wednesday evening, checking in (90s)

**Setting:** Priya opens InvestIQ web app on her phone (or desktop, whichever demos cleaner).

**Beats:**
1. Land on /home — hero "Your portfolio is healthy"
2. Three numbers visible
3. Journey chart with annotations
4. "What you should know today" — one card with the connector sentence
5. Tap an "Ask Kuber" chip: "Why did my portfolio go down today?"
6. Kuber's voice response (text appears alongside): "It's down about $12 today, mostly from your equity funds tracking the broader market. Indian banks had a soft session. Nothing unusual — your portfolio swings $20-30 most days and ends up where it started over a week. You're fine."
7. Navigate to /current
8. Show holdings cards. Point out the amber-bordered card (ICICI Bluechip at 78% fit)
9. Tap into /current/ICICIPRUBLU
10. Show "How this fits your portfolio" panel — fees compounded over 26 years explanation
11. Tap an (i) icon next to a jargon term → popover with plain explanation
12. Tap "Ask Kuber more" → /Kuber pre-filled
13. Kuber gives the three-layer explanation tied to her actual holding

**What this proves:** Home dashboard. Ask-Kuber chip pattern. Jargon translation. Fit score concept. Radical transparency on fees.

## Day 3 — Thursday morning, the panic moment (120s)

**Setting:** Priya wakes up to a market-drop push notification.

**Beats:**
1. Open app — /home loads
2. Hero now reads: "Your portfolio is okay. Markets are jumpy today — let's talk about it."
3. "I'm freaking out" button is right there. Tap it.
4. Page transitions to /panic — visibly calmer color treatment
5. Sentence: "Take a breath. Most of the time, the right thing to do is nothing."
6. Pick "Run a scenario"
7. /rebalance opens in Scenario mode. Use the scenario chips and pick "Market drop 20%"
8. Scenario receipt + narration loads on /rebalance
9. Kuber speaks: "Okay. Let's actually look at this. If the market dropped 20% from here, your portfolio would go from $22,300 to about $19,500..."
10. Receipt below: house deposit timeline +4 months, retirement unchanged
11. Kuber: "You're 65% in stocks against your 60% target. We can rebalance..."
12. Two trade cards appear with "Why" expansions
13. Tax cost: $0. Fees: $0. Goal impact: house deposit +1 month improvement
14. Tap "Confirm"
15. Brief animation
16. /home reloads — hero: "Your portfolio is healthy and a bit more protected"
17. Kuber check-in: "Nice. Future Priya will thank you."

**What this proves:** Every rubric criterion. UX/empathy (panic + calmer page). Innovation in rebalancing (scenario-driven). Transparency (line-item receipt). Execution (working end-to-end commit).

## Outro (30s)

"That's InvestIQ. One product, three surfaces — extension on the web, app on your phone, and Kuber speaking across both. We didn't build a Bloomberg terminal made simpler. We built the first portfolio tool designed for someone who's never done this before, and we made every recommendation explain itself."

## Demo-day rules

- **Recorded backup video:** Person 4 owns this. Record the full flow the night before. If anything flakes live, switch to the recording.
- **Lock the demo Chrome profile:** logged into Supabase auth as Priya, extension installed, all keys cached. Do not use it for anything else.
- **No live signups.** Anyone who asks "can I try it" gets the deck-and-recording, not the running app.
- **No ad-libbing Kuber's responses live.** The three demo questions have curated responses. Off-script questions go to a "let me show you that after" deflection.

## Data note for presenters

- Runtime account data is loaded from Supabase seed (`02_supabase_seed_mock_data.sql`).
- Discovery candidates in `/Kuber` come from a fictional deterministic universe (mock by design) to avoid real-stock recommendation risk in demo.

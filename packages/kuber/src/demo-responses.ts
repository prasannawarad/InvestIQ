/** Curated replies for reliability (Groq slow / judges). Mirrors agent-style cadence without Python mocks. */

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

export function demoChatFallback(rawUserMessage: string): string | null {
  const s = norm(rawUserMessage);
  if (!s) return null;

  if (/^am i at risk\b/.test(s)) {
    return "Okay — um—so this is worth asking calmly. You're probably not staring at catastrophe; risk here means swings and timelines. You're diversified across equities, bonds, gold, cash in InvestIQ right now — day-to-day jitter is normal noise. Packing analogy — bumpy turbulence rarely means divert the flight; tighten seatbelt, watch instruments. Probabilistically, reacting on headlines alone often hurts more than drifting markets. Anchored step — breathe, review targets in-app, revisit only purposeful drift.";
  }

  if (/what should i know today/.test(s)) {
    return "Well, listen — the market screams daily while plans whisper yearly. Today's headline matters less than whether your glide path still matches Goals. Crockpot analogy — flavor builds slow; cracking the lid every minute wastes heat. Signals to peek: volatility regime card, holdings fit scores vs targets. Means for Priya pacing — sanity check timelines, maybe note drift, resist drama trades. Probabilistically, incremental reviews beat frantic toggles.";
  }

  if (/why did my portfolio drop|holdings dropped|portfolio dropped/.test(s)) {
    return "Yeah, I hear the stomach-drop feeling — honestly human. Blends of equity tilt, bonds smoothing, metals cushion — arithmetic not moral judgment today. Backpack analogy — you feel every stone when straps dig; loosen one buckle (rebalance hygiene) feels better before tossing gear. Signals: broad-market beta on equity sleeve, day's percent move vs longer arc. Means for timelines — modest red days seldom erase disciplined goals outright. Probabilistically, snap sells often mistime bottoms. Anchored beat — skim InvestIQ current page, hydrate, postpone hero trades.";
  }

  if (/should i worry about the news|\bworry\b.*news\b|headlines /.test(s)) {
    return "Headlines crave clicks; diversified sleeves crave patience — neither cancels overnight. Signals: curated market_event summaries already plain-spoken inside InvestIQ. Weather analogy — passing squall versus climate shift; umbrellas differ. Means for diversified demo portfolio — diversification exists because shocks arrive often. Probabilistically, staying near target allocations historically beats doom-scrolling reallocations.";
  }

  if (/explain p\/e|p\/e ratio|^\bp\/e\b|price.?to.?earnings/.test(s)) {
    return "P/E is price-per-dollar-of-earnings — quick valuation vibe check, not prophecy. Signals optimism embedded in multiples — bubbly vs bargain territory context-only. Backpack analogy — premium pack if trail miles justify cost. Means for mutual fund-heavy users — multiples hide inside aggregates; skim factsheets calmly. Probabilistically, cheap can stay cheap — pair with diversification story. Gentle next step — use Help glossary `(i)` tooltips paired with holdings view.";
  }

  if (/^explain beta\b|^what'?s beta\b|\bmarket beta\b/.test(s)) {
    return "Beta is how jumpy something feels compared with the broader market — think of volume on a headphone dial: beta above one means louder swings when headlines hit. Signals whether this slice of your lineup could drag or cushion the whole sled. Packing analogy — a stretchy bungie absorbs bumps better than rigid sticks. Means for diversified funds inside InvestIQ — you mostly care about sleeves, not one ticker meme. Probabilistically, tame betas blunt bad weeks but also trim euphoria runs. Chill next step — notice mix in Current, revisit only purposeful drift.";
  }

  if (/expense ratio|^what'?s an expense ratio|fund fee explanation/.test(s)) {
    return "Expense ratio is the annual skim funds keep — tiny percents stacking quietly like subscription creep. Signals operator efficiency and drag on compounding journeys. Loose-change jar analogy — a nickel daily becomes dinner money yearly. Means for Priya arcs — shaving fees lengthens timelines without heroic stock picking. Probabilistically, lower coherent fees tilt odds modestly upward historically.";
  }

  if (/\bmarket\b.*drop.*20|markets drop.*20|20%\b.*market/.test(s)) {
    return "Stress-testing a 20 percent equity dip is rehearsal, not prediction — engines plot timeline nudges with grown-up numbness. Fire-drill analogy — practice escape routes calmly so adrenaline has a script. Signals: simulated allocation math lives in Scenario mode only. Means for diversified sleeves — equities wobble hardest, bonds stabilize relative drag. Probabilistically, deep selloffs recur across careers — prepping beats panic texting brokers. Routed step — open Rebalance with Scenario market-drop-20 queued.";
  }

  if (/inflation\b.*high|stay.*high|sticky inflation/.test(s)) {
    return "Sticky inflation trims purchasing power like humidity warping doors — gradual, pervasive. Crockpot analogy — heat lingers after you lower the knob. Signals: CPI tone, volatility regime snippets in-app. Means for diversified mix — pacing beats hero trades chasing macro headlines.";
  }

  if (/\brebalance\b|\ballocation drift\b|\btoo (much|risk).*\bstock/.test(s)) {
    return "Rebalancing resets drift quietly — trims accidental bets before they scream. Vacuum analogy — tidy weekly avoids mold surprises. Engines own exact trade math; narration here channels calm. Signals: overweight equity vs mandates, chunky singles. Means for timelines — purposeful tweaks beat panic slashes. Routed step — open **`/rebalance`** with **`?source=scenario`** once you phrase a concrete scenario.";
  }

  return null;
}

export function demoJargonFallback(rawTerm: string): string | null {
  const t = norm(rawTerm);

  const jargonMap: Array<{ pattern: RegExp; prompt: string }> = [
    { pattern: /\bp\/e\b|^pe$|price.{0,8}earnings|pe ratio/, prompt: "Explain P/E ratio" },
    { pattern: /expense ratio|fund fee|annual fee.*fund/, prompt: "What's an expense ratio?" },
    { pattern: /^beta\b|stock beta/, prompt: "Explain beta" },
    { pattern: /dividend yield/, prompt: "Explain dividend yield" },
  ];

  for (const row of jargonMap) {
    if (row.pattern.test(t)) {
      return demoChatFallback(row.prompt);
    }
  }
  return null;
}

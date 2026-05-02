import type { PageContext } from "./page-context";

/** Lead Kuber line when the SPA navigates — text only (parent owns message IDs). */
export function getOpeningGreeting(ctx: PageContext, displayName: string): string {
  const dn = displayName.trim() || "there";
  if (ctx.classified.isDemoHeuristic) {
    return `Hey ${dn}. I see you're reading about rates and central-bank decisions. Here's the short version: rates staying steady is mildly good news for the bond sleeve in a diversified portfolio — including a modest bond allocation. Want me to walk you through why?`;
  }
  return `Hey ${dn}. I can read this page with you and translate what it means for your portfolio — or we can zoom out from the headlines. What's on your mind?`;
}

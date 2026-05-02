export * from "./schemas";

// Helper to load all three demo fixtures at once.
// Web: import directly. Extension: send via message passing.
export async function loadDemoData() {
  const [userProfile, portfolio, marketContext] = await Promise.all([
    import("./fixtures/user_profile.json"),
    import("./fixtures/portfolio.json"),
    import("./fixtures/market_context.json"),
  ]);
  return {
    userProfile: userProfile.default,
    portfolio: portfolio.default,
    marketContext: marketContext.default,
  };
}

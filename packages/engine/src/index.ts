import type {
  Portfolio,
  Holding,
  UserProfile,
  Goal,
  Trade,
  GoalImpact,
  RebalanceRecommendation,
} from "@investiq/data";

// ---------------------------------------------------------------------------
// Scenarios — Person 3 implements
// ---------------------------------------------------------------------------

export type ScenarioName =
  | "market-drop-20"
  | "market-drop-30"
  | "inflation-stays-high"
  | "withdraw-20-percent"
  | "lose-job-need-emergency";

export interface ScenarioResult {
  scenario: ScenarioName;
  projected_total_value: number;
  projected_allocation: Record<string, number>;
  goal_impacts: GoalImpact[];
  needs_action: boolean;
  human_summary: string; // engine-generated one-liner; Kuber rephrases
}

export function simulateScenario(
  _portfolio: Portfolio,
  _scenario: ScenarioName
): ScenarioResult {
  throw new Error("not implemented — Person 3");
}

// ---------------------------------------------------------------------------
// Rebalance — Person 3 implements
// ---------------------------------------------------------------------------

export type RebalanceSource = "drift" | "scenario" | "panic" | "discover";

export function recommendRebalance(
  _portfolio: Portfolio,
  _target: Record<string, number>,
  _source: RebalanceSource
): RebalanceRecommendation {
  throw new Error("not implemented — Person 3");
}

// ---------------------------------------------------------------------------
// Fit score — Person 3 implements
// ---------------------------------------------------------------------------

export function computeFitScore(_holding: Holding, _userProfile: UserProfile): number {
  throw new Error("not implemented — Person 3");
}

// ---------------------------------------------------------------------------
// Goal impact — Person 3 implements
// ---------------------------------------------------------------------------

export function computeGoalImpact(
  _portfolio: Portfolio,
  _trades: Trade[],
  _goals: Goal[]
): GoalImpact[] {
  throw new Error("not implemented — Person 3");
}

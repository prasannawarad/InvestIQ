import { NextRequest, NextResponse } from "next/server";
import type { Goal, Portfolio } from "@investiq/data";
import {
  computeGoalImpact,
  simulateScenario,
  type ScenarioName,
} from "@investiq/engine";

type ScenarioRequestBody = {
  portfolio: Portfolio;
  goals?: Goal[];
  scenario?: ScenarioName;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ScenarioRequestBody;
    const scenario = body.scenario ?? "market-drop-20";
    const result = simulateScenario(body.portfolio, scenario);
    const goalImpacts = computeGoalImpact(body.portfolio, [], body.goals ?? []);

    return NextResponse.json({
      scenario: { ...result, goal_impacts: goalImpacts },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to simulate scenario";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

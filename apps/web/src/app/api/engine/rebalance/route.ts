import { NextRequest, NextResponse } from "next/server";
import type { Portfolio } from "@investiq/data";
import {
  recommendRebalance,
  type RebalanceSource,
} from "@investiq/engine";

type RebalanceRequestBody = {
  portfolio: Portfolio;
  source?: RebalanceSource;
  target?: Record<string, number>;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RebalanceRequestBody;
    const source = body.source ?? "drift";
    const target = body.target ?? body.portfolio.allocation.target_allocation;
    const recommendation = recommendRebalance(body.portfolio, target, source);
    return NextResponse.json({ recommendation });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate rebalance recommendation";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import type { Portfolio, UserProfile } from "@investiq/data";
import {
  generateMatches,
  type DiscoveryFilters,
} from "@investiq/engine";

type MatchesRequestBody = {
  filters: DiscoveryFilters;
  userProfile: UserProfile;
  portfolio: Portfolio;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as MatchesRequestBody;
    const matches = generateMatches(body.filters, body.userProfile, body.portfolio);
    return NextResponse.json({ matches });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate matches";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

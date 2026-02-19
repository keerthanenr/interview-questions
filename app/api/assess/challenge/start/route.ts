import { logEvent } from "@/lib/events/logger";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { sessionId, challengeId, difficultyTier } = await request.json();

    if (!sessionId || !challengeId) {
      return Response.json(
        { error: "sessionId and challengeId are required" },
        { status: 400 },
      );
    }

    logEvent({
      sessionId,
      eventType: "challenge_started",
      payload: {
        challenge_id: challengeId,
        difficulty_tier: difficultyTier ?? 1,
        timestamp: new Date().toISOString(),
      },
    });

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

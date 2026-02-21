import type { NextRequest } from "next/server";
import { logEvent } from "@/lib/events/logger";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const { sessionId, code, challengeId, testResults } = await request.json();

    if (!sessionId || !code) {
      return Response.json(
        { error: "sessionId and code are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Save submission with test results
    const { error } = await supabase.from("submissions").insert({
      session_id: sessionId,
      phase: "build",
      code,
      metadata: {
        challenge_id: challengeId,
        submitted_at: new Date().toISOString(),
        test_results: testResults ?? null,
      },
    });

    if (error) {
      return Response.json(
        { error: "Failed to save submission" },
        { status: 500 }
      );
    }

    // Log the event (fire-and-forget)
    logEvent({
      sessionId,
      eventType: "challenge_submitted",
      payload: {
        code,
        challenge_id: challengeId,
        timestamp: new Date().toISOString(),
      },
    });

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

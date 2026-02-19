import { logEvent } from "@/lib/events/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { sessionId, fromPhase, toPhase } = await request.json();

    if (!sessionId || !fromPhase || !toPhase) {
      return Response.json(
        { error: "sessionId, fromPhase, and toPhase are required" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    // Update session phase
    const { data: session, error } = await supabase
      .from("sessions")
      .update({
        current_phase: toPhase,
        ...(toPhase === "complete"
          ? { completed_at: new Date().toISOString() }
          : {}),
      })
      .eq("id", sessionId)
      .select()
      .single();

    if (error || !session) {
      return Response.json(
        { error: "Failed to update session" },
        { status: 500 },
      );
    }

    // If completing, also update the candidate status
    if (toPhase === "complete") {
      const { data: sessionData } = await supabase
        .from("sessions")
        .select("candidate_id")
        .eq("id", sessionId)
        .single();

      if (sessionData) {
        await supabase
          .from("candidates")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", sessionData.candidate_id);
      }
    }

    // Log the phase transition event (fire-and-forget)
    logEvent({
      sessionId,
      eventType: "phase_transition",
      payload: {
        from_phase: fromPhase,
        to_phase: toPhase,
        timestamp: new Date().toISOString(),
      },
    });

    return Response.json({ session });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

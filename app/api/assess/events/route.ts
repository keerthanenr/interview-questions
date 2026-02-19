import { logEvent } from "@/lib/events/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EventType } from "@/lib/supabase/types";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { sessionId, eventType, payload } = await request.json();

    if (!sessionId || !eventType) {
      return Response.json(
        { error: "sessionId and eventType are required" },
        { status: 400 },
      );
    }

    // Validate session exists and is active
    const supabase = createAdminClient();
    const { data: session, error } = await supabase
      .from("sessions")
      .select("id, completed_at")
      .eq("id", sessionId)
      .single();

    if (error || !session) {
      return Response.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.completed_at) {
      return Response.json(
        { error: "Session is already completed" },
        { status: 400 },
      );
    }

    await logEvent({
      sessionId,
      eventType: eventType as EventType,
      payload: payload ?? {},
    });

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

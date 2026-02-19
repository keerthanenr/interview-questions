import { createAdminClient } from "@/lib/supabase/admin";
import type { EventType } from "@/lib/supabase/types";

const VALID_EVENT_TYPES: EventType[] = [
  "prompt_sent",
  "claude_response",
  "code_change",
  "claude_output_accepted",
  "challenge_started",
  "challenge_submitted",
  "quickfire_answered",
  "review_comment_added",
  "phase_transition",
];

interface LogEventParams {
  sessionId: string;
  eventType: EventType;
  payload: Record<string, unknown>;
}

export async function logEvent({
  sessionId,
  eventType,
  payload,
}: LogEventParams): Promise<void> {
  if (!VALID_EVENT_TYPES.includes(eventType)) {
    console.error(`[EventLogger] Invalid event type: ${eventType}`);
    return;
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("events").insert({
      session_id: sessionId,
      event_type: eventType,
      payload,
    });

    if (error) {
      console.error("[EventLogger] Failed to write event:", error.message);
    }
  } catch (err) {
    console.error("[EventLogger] Unexpected error:", err);
  }
}

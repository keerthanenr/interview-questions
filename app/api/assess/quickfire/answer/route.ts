import { logEvent } from "@/lib/events/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { sessionId, questionIndex, response, responseTimeMs, isCorrect } =
      await request.json();

    if (!sessionId || questionIndex === undefined) {
      return Response.json(
        { error: "sessionId and questionIndex are required" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    // Fetch the question from session metadata to store alongside the response
    const { data: session } = await supabase
      .from("sessions")
      .select("metadata")
      .eq("id", sessionId)
      .single();

    const metadata = (session?.metadata as Record<string, unknown>) ?? {};
    const questions = (metadata.questions as unknown[]) ?? [];
    const question = (questions[questionIndex] as Record<string, unknown>) ?? {};

    const { error } = await supabase.from("quickfire_responses").insert({
      session_id: sessionId,
      question_index: questionIndex,
      question,
      response: response ?? null,
      is_correct: isCorrect ?? null,
      response_time_ms: responseTimeMs ?? null,
    });

    if (error) {
      return Response.json(
        { error: "Failed to save response" },
        { status: 500 },
      );
    }

    logEvent({
      sessionId,
      eventType: "quickfire_answered",
      payload: {
        question_index: questionIndex,
        response_time_ms: responseTimeMs,
        is_correct: isCorrect,
        timestamp: new Date().toISOString(),
      },
    });

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

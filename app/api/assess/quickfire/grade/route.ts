import type { NextRequest } from "next/server";
import { gradeResponse } from "@/lib/claude/client";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return Response.json({ error: "sessionId is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Fetch all non-MC responses (is_correct is null for ungraded text responses)
    const { data: responses } = await supabase
      .from("quickfire_responses")
      .select("*")
      .eq("session_id", sessionId)
      .is("is_correct", null);

    if (!responses || responses.length === 0) {
      return Response.json({ success: true, graded: 0 });
    }

    let gradedCount = 0;

    for (const resp of responses) {
      const question = (resp.question as Record<string, unknown>) ?? {};

      const result = await gradeResponse(
        String(question.question ?? ""),
        String(resp.response ?? "(no answer)"),
        String(question.codeReference ?? "N/A"),
        resp.response_time_ms ?? 0,
        String(question.gradingCriteria ?? "")
      );

      await supabase
        .from("quickfire_responses")
        .update({
          is_correct: result.correct,
          // Store grading details in the question jsonb field
          question: {
            ...question,
            grading: {
              score: result.score,
              feedback: result.feedback,
            },
          },
        })
        .eq("id", resp.id);

      gradedCount++;
    }

    return Response.json({ success: true, graded: gradedCount });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

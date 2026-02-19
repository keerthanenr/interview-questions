import { logEvent } from "@/lib/events/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { sessionId, filePath, lineNumber, commentText } =
      await request.json();

    if (!sessionId || !filePath || lineNumber === undefined || !commentText) {
      return Response.json(
        {
          error:
            "sessionId, filePath, lineNumber, and commentText are required",
        },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("review_comments")
      .insert({
        session_id: sessionId,
        file_path: filePath,
        line_number: lineNumber,
        comment_text: commentText,
      })
      .select()
      .single();

    if (error) {
      return Response.json(
        { error: "Failed to save comment" },
        { status: 500 },
      );
    }

    logEvent({
      sessionId,
      eventType: "review_comment_added",
      payload: {
        line_number: lineNumber,
        comment_text: commentText,
        file_path: filePath,
        timestamp: new Date().toISOString(),
      },
    });

    return Response.json({ comment: data });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

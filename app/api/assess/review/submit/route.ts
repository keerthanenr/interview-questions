import type { NextRequest } from "next/server";
import { loadReviewScenario } from "@/lib/data/loaders";
import { logEvent } from "@/lib/events/logger";
import { createAdminClient } from "@/lib/supabase/admin";

interface ReviewComment {
  filePath: string;
  lineNumber: number;
  commentText: string;
}

interface SeededIssue {
  id: string;
  category: string;
  file: string;
  lineRange: [number, number];
  description: string;
  severity: string;
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId, summaryText, comments } = (await request.json()) as {
      sessionId: string;
      summaryText: string;
      comments: ReviewComment[];
    };

    if (!sessionId) {
      return Response.json({ error: "sessionId is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Save summary to submissions table
    await supabase.from("submissions").insert({
      session_id: sessionId,
      phase: "review",
      code: null,
      metadata: {
        summary_text: summaryText,
        comment_count: comments?.length ?? 0,
        submitted_at: new Date().toISOString(),
      },
    });

    // Load review scenario for auto-categorization
    let seededIssues: SeededIssue[] = [];
    try {
      const scenario = await loadReviewScenario();
      seededIssues = (scenario.seededIssues as unknown as SeededIssue[]) ?? [];
    } catch {
      // Proceed without categorization
    }

    // Batch-insert comments with auto-categorization
    if (comments && comments.length > 0) {
      const commentsToInsert = comments.map((c) => {
        let issueCategory: string | null = null;

        // Match comment line number to seeded issues
        for (const issue of seededIssues) {
          if (
            c.lineNumber >= issue.lineRange[0] &&
            c.lineNumber <= issue.lineRange[1]
          ) {
            issueCategory = issue.category;
            break;
          }
        }

        return {
          session_id: sessionId,
          file_path: c.filePath,
          line_number: c.lineNumber,
          comment_text: c.commentText,
          issue_category: issueCategory,
        };
      });

      await supabase.from("review_comments").insert(commentsToInsert);

      // Log each comment as an event
      for (const c of comments) {
        logEvent({
          sessionId,
          eventType: "review_comment_added",
          payload: {
            line_number: c.lineNumber,
            comment_text: c.commentText,
            file_path: c.filePath,
            timestamp: new Date().toISOString(),
          },
        });
      }
    }

    // Transition phase to complete
    const { data: session } = await supabase
      .from("sessions")
      .update({
        current_phase: "complete",
        completed_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .select("candidate_id")
      .single();

    if (session) {
      await supabase
        .from("candidates")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", session.candidate_id);
    }

    logEvent({
      sessionId,
      eventType: "phase_transition",
      payload: {
        from_phase: "review",
        to_phase: "complete",
        issues_found: comments?.length ?? 0,
        issues_categorized:
          comments?.filter((c) => {
            for (const issue of seededIssues) {
              if (
                c.lineNumber >= issue.lineRange[0] &&
                c.lineNumber <= issue.lineRange[1]
              ) {
                return true;
              }
            }
            return false;
          }).length ?? 0,
        total_seeded_issues: seededIssues.length,
        timestamp: new Date().toISOString(),
      },
    });

    // Kick off dossier generation (fire-and-forget)
    if (session?.candidate_id) {
      import("@/lib/scoring/dossier")
        .then((mod) => mod.generateDossier(session.candidate_id))
        .catch((err) =>
          console.error("[ReviewSubmit] Dossier generation failed:", err)
        );
    }

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

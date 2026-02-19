// ─── Dossier generation (V1) ──────────────────────────────────────

import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { DOSSIER_ANALYST_PROMPT } from "@/lib/claude/prompts";
import { calculateTechnicalScore } from "./technical";
import { calculateCollaborationScore } from "./collaboration";
import { calculateCommunicationScore } from "./communication";

// ─── Types ────────────────────────────────────────────────────────

interface SessionRow {
  id: string;
  candidate_id: string;
  current_phase: string;
  started_at: string;
  completed_at: string | null;
  metadata: Record<string, unknown>;
}

interface EventRow {
  id: string;
  session_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

interface SubmissionRow {
  id: string;
  session_id: string;
  phase: string;
  code: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface QuickfireRow {
  id: string;
  session_id: string;
  question_index: number;
  question: Record<string, unknown>;
  response: string | null;
  is_correct: boolean | null;
  response_time_ms: number | null;
  created_at: string;
}

interface ReviewCommentRow {
  id: string;
  session_id: string;
  file_path: string;
  line_number: number;
  comment_text: string;
  issue_category: string | null;
  created_at: string;
}

// ─── Main entry point ─────────────────────────────────────────────

/**
 * Generate a full candidate dossier. Fetches all assessment data,
 * runs the three scoring modules, calls the Claude API for narrative
 * sections, and persists the result to the `dossiers` table.
 */
export async function generateDossier(candidateId: string): Promise<void> {
  const supabase = createAdminClient();

  // ── 1. Fetch all session data ──────────────────────────────────

  const { data: sessions, error: sessionsErr } = await supabase
    .from("sessions")
    .select("*")
    .eq("candidate_id", candidateId)
    .order("started_at", { ascending: false });

  if (sessionsErr || !sessions || sessions.length === 0) {
    throw new Error(
      `No sessions found for candidate ${candidateId}: ${sessionsErr?.message ?? "empty result"}`,
    );
  }

  const sessionIds = (sessions as SessionRow[]).map((s) => s.id);

  // Fetch events, submissions, quickfire responses, and review
  // comments for all of the candidate's sessions in parallel.
  const [eventsRes, submissionsRes, quickfireRes, reviewRes] =
    await Promise.all([
      supabase
        .from("events")
        .select("*")
        .in("session_id", sessionIds)
        .order("created_at", { ascending: true }),
      supabase
        .from("submissions")
        .select("*")
        .in("session_id", sessionIds)
        .order("created_at", { ascending: true }),
      supabase
        .from("quickfire_responses")
        .select("*")
        .in("session_id", sessionIds)
        .order("question_index", { ascending: true }),
      supabase
        .from("review_comments")
        .select("*")
        .in("session_id", sessionIds)
        .order("created_at", { ascending: true }),
    ]);

  const events = (eventsRes.data ?? []) as EventRow[];
  const submissions = (submissionsRes.data ?? []) as SubmissionRow[];
  const quickfireResponses = (quickfireRes.data ?? []) as QuickfireRow[];
  const reviewComments = (reviewRes.data ?? []) as ReviewCommentRow[];

  // ── 2. Derive scoring inputs from raw data ─────────────────────

  const challengeResults = deriveChallengeResults(events);
  const quickfireResults = deriveQuickfireResults(quickfireResponses);
  const { found: reviewIssuesFound, total: reviewIssuesTotal } =
    deriveReviewStats(events, reviewComments);

  // ── 3. Run scoring functions ───────────────────────────────────

  const technicalScore = calculateTechnicalScore({
    challengeResults,
    quickfireResults,
    reviewIssuesFound,
    reviewIssuesTotal,
  });

  const collaborationScore = calculateCollaborationScore(
    events.map((e) => ({
      event_type: e.event_type,
      payload: e.payload,
    })),
  );

  const communicationScore = calculateCommunicationScore(
    reviewComments.map((c) => ({
      comment_text: c.comment_text,
      issue_category: c.issue_category,
    })),
  );

  // ── 4. Generate narrative via Claude API ───────────────────────

  const candidateData = {
    sessions: sessions.map((s: SessionRow) => ({
      phase: s.current_phase,
      started_at: s.started_at,
      completed_at: s.completed_at,
    })),
    technicalScore,
    collaborationScore,
    communicationScore,
    challengeResults,
    quickfireResults,
    reviewIssuesFound,
    reviewIssuesTotal,
    eventSummary: {
      totalEvents: events.length,
      promptsSent: events.filter((e) => e.event_type === "prompt_sent").length,
      claudeResponses: events.filter((e) => e.event_type === "claude_response")
        .length,
      codeChanges: events.filter((e) => e.event_type === "code_change").length,
      outputAcceptances: events.filter(
        (e) => e.event_type === "claude_output_accepted",
      ).length,
    },
    submissionCount: submissions.length,
    reviewCommentCount: reviewComments.length,
  };

  const prompt = DOSSIER_ANALYST_PROMPT.replace(
    "{candidateData}",
    JSON.stringify(candidateData, null, 2),
  );

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  const narrative = textBlock?.type === "text" ? textBlock.text : "";

  // ── 5. Persist dossier ─────────────────────────────────────────

  const scores = {
    technical: technicalScore,
    collaboration: collaborationScore,
    communication: communicationScore,
  };

  const profile = {
    independenceRatio: collaborationScore.independenceRatio,
    promptQuality: collaborationScore.promptQuality,
    verificationScore: collaborationScore.verificationScore,
    narrative,
  };

  const { error: upsertErr } = await supabase.from("dossiers").upsert(
    {
      candidate_id: candidateId,
      scores,
      profile,
      summary: narrative,
      generated_at: new Date().toISOString(),
    },
    { onConflict: "candidate_id" },
  );

  if (upsertErr) {
    throw new Error(`Failed to save dossier: ${upsertErr.message}`);
  }
}

// ─── Data derivation helpers ──────────────────────────────────────

/**
 * Build challenge results from events. Each challenge_started /
 * challenge_submitted pair produces one result entry.
 */
function deriveChallengeResults(
  events: EventRow[],
): { tier: number; completed: boolean; timeUsed: number; timeLimit: number }[] {
  const starts = events.filter((e) => e.event_type === "challenge_started");
  const completions = events.filter(
    (e) => e.event_type === "challenge_submitted",
  );

  return starts.map((start) => {
    const challengeId = start.payload.challenge_id as string | undefined;
    const tier = (start.payload.tier as number) ?? 1;
    const timeLimit = (start.payload.time_limit as number) ?? 0;

    const completion = completions.find(
      (c) => c.payload.challenge_id === challengeId,
    );

    const startTime = new Date(start.created_at).getTime();
    const endTime = completion
      ? new Date(completion.created_at).getTime()
      : startTime + timeLimit * 1000;
    const timeUsed = (endTime - startTime) / 1000;

    return {
      tier,
      completed: !!completion,
      timeUsed,
      timeLimit,
    };
  });
}

/**
 * Derive quickfire results from stored responses.
 */
function deriveQuickfireResults(
  responses: QuickfireRow[],
): { correct: boolean; difficulty: number }[] {
  return responses.map((r) => ({
    correct: r.is_correct === true,
    difficulty: (r.question.difficulty as number) ?? 1,
  }));
}

/**
 * Derive review stats. "Total issues" comes from the review event
 * metadata; "found" is the number of comments the candidate left.
 */
function deriveReviewStats(
  events: EventRow[],
  comments: ReviewCommentRow[],
): { found: number; total: number } {
  // Look for a phase_transition event entering the review phase that
  // may contain total_issues in its payload.
  const reviewPhaseEvent = events.find(
    (e) =>
      e.event_type === "phase_transition" &&
      e.payload.to_phase === "review",
  );

  const total =
    (reviewPhaseEvent?.payload.total_issues as number) ?? comments.length;

  return {
    found: comments.length,
    total: Math.max(total, comments.length),
  };
}

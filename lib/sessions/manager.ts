import { createAdminClient } from "@/lib/supabase/admin";
import type { Assessment, Candidate, Session } from "@/lib/supabase/types";

export async function startSession(candidateToken: string): Promise<Session> {
  const supabase = createAdminClient();

  const { data: candidate, error: candidateErr } = await supabase
    .from("candidates")
    .select("*")
    .eq("token", candidateToken)
    .single();

  if (candidateErr || !candidate) {
    throw new Error("Invalid candidate token");
  }

  if (candidate.status === "completed") {
    throw new Error("Assessment already completed");
  }

  if (candidate.status === "expired") {
    throw new Error("Assessment link has expired");
  }

  if (candidate.status === "in_progress") {
    const { data: existingSession, error: sessionErr } = await supabase
      .from("sessions")
      .select("*")
      .eq("candidate_id", candidate.id)
      .is("completed_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .single();

    if (sessionErr || !existingSession) {
      throw new Error("Session not found for in-progress candidate");
    }

    return existingSession as Session;
  }

  // Status is 'invited' — create a new session
  const { data: session, error: sessionErr } = await supabase
    .from("sessions")
    .insert({
      candidate_id: candidate.id,
      current_phase: "build",
    })
    .select()
    .single();

  if (sessionErr || !session) {
    throw new Error("Failed to create session");
  }

  // Update candidate status
  await supabase
    .from("candidates")
    .update({
      status: "in_progress",
      started_at: new Date().toISOString(),
    })
    .eq("id", candidate.id);

  return session as Session;
}

export async function getSessionWithCandidate(token: string): Promise<{
  session: Session;
  candidate: Candidate;
  assessment: Assessment;
}> {
  const supabase = createAdminClient();

  const { data: candidate, error: candidateErr } = await supabase
    .from("candidates")
    .select("*, assessments(*)")
    .eq("token", token)
    .single();

  if (candidateErr || !candidate) {
    throw new Error("Invalid candidate token");
  }

  const assessment = (candidate as Record<string, unknown>)
    .assessments as Assessment;

  const { data: session, error: sessionErr } = await supabase
    .from("sessions")
    .select("*")
    .eq("candidate_id", candidate.id)
    .order("started_at", { ascending: false })
    .limit(1)
    .single();

  if (sessionErr || !session) {
    throw new Error("No session found for this candidate");
  }

  const { assessments: _, ...candidateData } = candidate as Record<
    string,
    unknown
  >;

  return {
    session: session as Session,
    candidate: candidateData as unknown as Candidate,
    assessment,
  };
}

// ─── Constrained field types ───────────────────────────────────────

export type Plan = "starter" | "professional" | "enterprise";
export type UserRole = "admin" | "manager" | "recruiter";
export type CandidateStatus =
  | "invited"
  | "in_progress"
  | "completed"
  | "expired";
export type AssessmentPhase = "build" | "explain" | "review" | "complete";
export type SubmissionPhase = "build" | "explain" | "review";
export type AssessmentStatus = "active" | "paused" | "archived";

export type EventType =
  | "prompt_sent"
  | "claude_response"
  | "code_change"
  | "claude_output_accepted"
  | "challenge_started"
  | "challenge_submitted"
  | "quickfire_answered"
  | "review_comment_added"
  | "phase_transition"
  | "terminal_command"
  | "claude_code_interaction"
  | "test_run_result"
  | "file_tree_action";

export type IssueCategory =
  | "logic_bug"
  | "performance_antipattern"
  | "state_management_issue"
  | "accessibility_gap"
  | "security_concern"
  | "code_style";

// ─── Table interfaces ──────────────────────────────────────────────

export interface Organization {
  id: string;
  name: string;
  plan: Plan;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  org_id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
}

export interface Assessment {
  id: string;
  org_id: string;
  created_by: string;
  title: string;
  challenge_pool: string[];
  settings: Record<string, unknown>;
  status: AssessmentStatus;
  created_at: string;
  updated_at: string;
}

export interface Candidate {
  id: string;
  assessment_id: string;
  email: string;
  full_name: string | null;
  token: string;
  status: CandidateStatus;
  invited_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface Session {
  id: string;
  candidate_id: string;
  current_phase: AssessmentPhase;
  started_at: string;
  completed_at: string | null;
  metadata: Record<string, unknown>;
}

export interface Event {
  id: string;
  session_id: string;
  event_type: EventType;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface Submission {
  id: string;
  session_id: string;
  phase: SubmissionPhase;
  code: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface QuickfireResponse {
  id: string;
  session_id: string;
  question_index: number;
  question: Record<string, unknown>;
  response: string | null;
  is_correct: boolean | null;
  response_time_ms: number | null;
  created_at: string;
}

export interface ReviewComment {
  id: string;
  session_id: string;
  file_path: string;
  line_number: number;
  comment_text: string;
  issue_category: IssueCategory | null;
  created_at: string;
}

export interface Dossier {
  id: string;
  candidate_id: string;
  scores: Record<string, unknown>;
  profile: Record<string, unknown>;
  summary: string | null;
  generated_at: string;
}

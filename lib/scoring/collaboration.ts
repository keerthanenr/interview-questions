// ─── Collaboration scoring heuristics (V1) ────────────────────────

interface CollaborationEvent {
  event_type: string;
  payload: Record<string, unknown>;
}

interface IndependenceRatio {
  selfWritten: number;
  modified: number;
  verbatimAccepted: number;
}

interface CollaborationScore {
  promptQuality: number;
  verificationScore: number;
  independenceRatio: IndependenceRatio;
}

/**
 * Evaluate how a candidate collaborated with the AI assistant during
 * the Build phase. Returns prompt quality (1–5), verification score
 * (1–5), and an independence ratio breakdown.
 */
export function calculateCollaborationScore(
  events: CollaborationEvent[],
): CollaborationScore {
  return {
    promptQuality: scorePromptQuality(events),
    verificationScore: scoreVerification(events),
    independenceRatio: computeIndependenceRatio(events),
  };
}

// ─── Prompt quality (1–5) ─────────────────────────────────────────

/**
 * Heuristic: higher-quality prompts are longer, include code blocks,
 * and ask specific questions (contain "?" or keywords like "why",
 * "how", "what if", "should I").
 *
 * - Length > 50 chars                 → +1
 * - Contains a code block (```)       → +1
 * - Asks a specific question          → +1
 *
 * Average the per-prompt scores (0–3), then map to 1–5.
 */
function scorePromptQuality(events: CollaborationEvent[]): number {
  const prompts = events.filter((e) => e.event_type === "prompt_sent");
  if (prompts.length === 0) return 1;

  const SPECIFICITY_PATTERNS = [
    /\?/,
    /\bwhy\b/i,
    /\bhow\b/i,
    /\bwhat if\b/i,
    /\bshould\b/i,
    /\binstead\b/i,
    /\bspecifically\b/i,
    /\breturn\b/i,
    /\bcomponent\b/i,
    /\bfunction\b/i,
    /\bhook\b/i,
  ];

  let totalQuality = 0;

  for (const prompt of prompts) {
    const text = String(prompt.payload.text ?? prompt.payload.content ?? "");
    let quality = 0;

    if (text.length > 50) quality += 1;
    if (text.includes("```")) quality += 1;
    if (SPECIFICITY_PATTERNS.some((p) => p.test(text))) quality += 1;

    totalQuality += quality;
  }

  const avgQuality = totalQuality / prompts.length; // 0–3
  // Map 0–3 → 1–5
  return clamp(1 + (avgQuality / 3) * 4, 1, 5);
}

// ─── Verification score (1–5) ─────────────────────────────────────

/**
 * Heuristic based on `claude_output_accepted` events.
 *
 * Each acceptance event should carry a payload flag indicating whether
 * the output was accepted verbatim (`modified: false`) or modified
 * before acceptance (`modified: true`).
 *
 * High verbatim acceptance rate (>70%)  → weak verification  → 1–2
 * High modification rate (>50%)         → strong verification → 4–5
 */
function scoreVerification(events: CollaborationEvent[]): number {
  const acceptances = events.filter(
    (e) => e.event_type === "claude_output_accepted",
  );
  if (acceptances.length === 0) return 3; // neutral when no data

  const modifiedCount = acceptances.filter(
    (e) => e.payload.modified === true,
  ).length;
  const verbatimCount = acceptances.length - modifiedCount;

  const modificationRate = modifiedCount / acceptances.length;
  const verbatimRate = verbatimCount / acceptances.length;

  // Map rates to 1–5 scale
  if (verbatimRate > 0.7) return clamp(1 + (1 - verbatimRate) * 3.33, 1, 2);
  if (modificationRate > 0.5) return clamp(3 + modificationRate * 4, 4, 5);

  // Middle ground
  return clamp(2 + modificationRate * 3, 2, 4);
}

// ─── Independence ratio ───────────────────────────────────────────

/**
 * Break down final code authorship into three buckets:
 *
 *  - selfWritten:       `code_change` events not preceded by a Claude response
 *  - modified:          `claude_output_accepted` with `modified: true`
 *  - verbatimAccepted:  `claude_output_accepted` with `modified: false`
 *
 * Returns percentages (0–1) that sum to 1.
 */
function computeIndependenceRatio(
  events: CollaborationEvent[],
): IndependenceRatio {
  const codeChanges = events.filter((e) => e.event_type === "code_change");
  const acceptances = events.filter(
    (e) => e.event_type === "claude_output_accepted",
  );

  const modifiedCount = acceptances.filter(
    (e) => e.payload.modified === true,
  ).length;
  const verbatimCount = acceptances.length - modifiedCount;

  // Self-written = code changes that are not acceptances of Claude output.
  // Simple heuristic: total code changes minus all acceptances.
  const selfWrittenCount = Math.max(0, codeChanges.length - acceptances.length);

  const total = selfWrittenCount + modifiedCount + verbatimCount;

  if (total === 0) {
    return { selfWritten: 1, modified: 0, verbatimAccepted: 0 };
  }

  return {
    selfWritten: round(selfWrittenCount / total),
    modified: round(modifiedCount / total),
    verbatimAccepted: round(verbatimCount / total),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.round(Math.min(max, Math.max(min, value)) * 100) / 100;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

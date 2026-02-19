// ─── Communication scoring heuristics (V1) ────────────────────────

interface ReviewComment {
  comment_text: string;
  issue_category: string | null;
}

interface CommunicationScore {
  overall: number;
  clarity: number;
  constructiveness: number;
  specificity: number;
}

/**
 * Score a candidate's code-review comments on clarity,
 * constructiveness, and specificity. All scores are on a 1–10 scale.
 */
export function calculateCommunicationScore(
  reviewComments: ReviewComment[],
): CommunicationScore {
  if (reviewComments.length === 0) {
    return { overall: 1, clarity: 1, constructiveness: 1, specificity: 1 };
  }

  const clarity = scoreClarity(reviewComments);
  const constructiveness = scoreConstructiveness(reviewComments);
  const specificity = scoreSpecificity(reviewComments);
  const overall = clamp((clarity + constructiveness + specificity) / 3);

  return { overall, clarity, constructiveness, specificity };
}

// ─── Clarity (1–10) ───────────────────────────────────────────────

/**
 * Average comment length mapped to a score.
 *
 * Sweet spot is 50–200 chars. Shorter or much longer comments score
 * progressively lower.
 *
 *   <20 chars   → 1–3
 *   20–49 chars → 3–6
 *   50–200 chars→ 7–10
 *   201–500     → 5–7
 *   >500 chars  → 3–5
 */
function scoreClarity(comments: ReviewComment[]): number {
  const avg =
    comments.reduce((sum, c) => sum + c.comment_text.length, 0) /
    comments.length;

  if (avg < 20) return clamp(1 + (avg / 20) * 2);
  if (avg < 50) return clamp(3 + ((avg - 20) / 30) * 3);
  if (avg <= 200) return clamp(7 + ((avg - 50) / 150) * 3);
  if (avg <= 500) return clamp(7 - ((avg - 200) / 300) * 2);
  return clamp(5 - Math.min((avg - 500) / 500, 1) * 2);
}

// ─── Constructiveness (1–10) ──────────────────────────────────────

/**
 * Does the comment suggest a fix or improvement?
 *
 * Check each comment for suggestion keywords. The proportion of
 * constructive comments is scaled to 1–10.
 */
const CONSTRUCTIVE_PATTERNS = [
  /\binstead\b/i,
  /\bshould\b/i,
  /\bconsider\b/i,
  /\btry\b/i,
  /\bfix\s+by\b/i,
  /\breplace\b/i,
  /\buse\b/i,
  /\bwould be better\b/i,
  /\bsugg(est|estion)\b/i,
  /\brecommend\b/i,
  /\brefactor\b/i,
  /\bextract\b/i,
  /\bmove\b/i,
  /\bwrap\b/i,
  /\badd\b/i,
  /\bremove\b/i,
];

function scoreConstructiveness(comments: ReviewComment[]): number {
  let constructiveCount = 0;

  for (const c of comments) {
    if (CONSTRUCTIVE_PATTERNS.some((p) => p.test(c.comment_text))) {
      constructiveCount++;
    }
  }

  const ratio = constructiveCount / comments.length;
  // Map ratio (0–1) → 1–10
  return clamp(1 + ratio * 9);
}

// ─── Specificity (1–10) ──────────────────────────────────────────

/**
 * Does the comment reference concrete code elements?
 *
 * Look for mentions of "line", "function", "variable", "prop",
 * "hook", "state", "component", or code-like tokens (camelCase,
 * backtick-wrapped identifiers, etc.).
 */
const SPECIFICITY_PATTERNS = [
  /\bline\s*\d+/i,
  /\bfunction\b/i,
  /\bvariable\b/i,
  /\bprop\b/i,
  /\bhook\b/i,
  /\bstate\b/i,
  /\bcomponent\b/i,
  /\buseEffect\b/,
  /\buseState\b/,
  /\buseMemo\b/,
  /\buseCallback\b/,
  /\buseRef\b/,
  /`[^`]+`/,                    // backtick-wrapped identifiers
  /\b[a-z]+[A-Z][a-zA-Z]*\b/,  // camelCase tokens
];

function scoreSpecificity(comments: ReviewComment[]): number {
  let specificCount = 0;

  for (const c of comments) {
    if (SPECIFICITY_PATTERNS.some((p) => p.test(c.comment_text))) {
      specificCount++;
    }
  }

  const ratio = specificCount / comments.length;
  // Map ratio (0–1) → 1–10
  return clamp(1 + ratio * 9);
}

// ─── Helpers ──────────────────────────────────────────────────────

/** Clamp a value to the 1–10 scale, rounded to two decimal places. */
function clamp(value: number): number {
  return Math.round(Math.min(10, Math.max(1, value)) * 100) / 100;
}

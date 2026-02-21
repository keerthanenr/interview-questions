// ─── Technical scoring heuristics (V1) ────────────────────────────

interface ChallengeResult {
  tier: number;
  completed: boolean;
  timeUsed: number;
  timeLimit: number;
}

interface QuickfireResult {
  correct: boolean;
  difficulty: number;
}

interface TechnicalInput {
  challengeResults: ChallengeResult[];
  quickfireResults: QuickfireResult[];
  reviewIssuesFound: number;
  reviewIssuesTotal: number;
}

interface TechnicalScore {
  overall: number;
  breakdown: Record<string, number>;
}

/**
 * Calculate a candidate's technical score from challenge completions,
 * quickfire accuracy, and MR review performance.
 *
 * Weights: challenges 40%, quickfire 35%, review 25%.
 * All component scores are normalised to a 1–10 scale.
 */
export function calculateTechnicalScore(data: TechnicalInput): TechnicalScore {
  const challengeScore = scoreChallenges(data.challengeResults);
  const quickfireScore = scoreQuickfire(data.quickfireResults);
  const reviewScore = scoreReview(
    data.reviewIssuesFound,
    data.reviewIssuesTotal
  );

  const weightedOverall =
    challengeScore * 0.4 + quickfireScore * 0.35 + reviewScore * 0.25;

  return {
    overall: clamp(weightedOverall),
    breakdown: {
      challenges: clamp(challengeScore),
      quickfire: clamp(quickfireScore),
      review: clamp(reviewScore),
    },
  };
}

// ─── Component scorers ────────────────────────────────────────────

/**
 * Challenge completion score.
 *
 * Each completed challenge earns points equal to its tier (1–5).
 * A time-efficiency bonus of 1.2x applies when the candidate finishes
 * in under 60% of the allotted time. The raw score is then normalised
 * against the maximum possible (sum of all attempted tiers) and scaled
 * to 1–10.
 */
function scoreChallenges(results: ChallengeResult[]): number {
  if (results.length === 0) return 1;

  const maxPossible = results.reduce((sum, r) => sum + r.tier, 0);
  if (maxPossible === 0) return 1;

  let earned = 0;
  for (const r of results) {
    if (!r.completed) continue;

    let points = r.tier;

    // Time efficiency bonus: completed in under 60% of limit
    if (r.timeLimit > 0 && r.timeUsed / r.timeLimit < 0.6) {
      points *= 1.2;
    }

    earned += points;
  }

  // Normalise to 1–10
  return 1 + (earned / maxPossible) * 9;
}

/**
 * Quickfire accuracy score.
 *
 * Base formula: (correct / total) x 10, weighted by difficulty.
 * Difficulty acts as a multiplier on each correct answer's contribution.
 */
function scoreQuickfire(results: QuickfireResult[]): number {
  if (results.length === 0) return 1;

  const totalWeight = results.reduce((sum, r) => sum + r.difficulty, 0);
  if (totalWeight === 0) return 1;

  const earnedWeight = results
    .filter((r) => r.correct)
    .reduce((sum, r) => sum + r.difficulty, 0);

  // Weighted accuracy scaled to 10
  const raw = (earnedWeight / totalWeight) * 10;

  // Ensure we stay in the 1–10 range
  return Math.max(1, raw);
}

/**
 * MR review score.
 *
 * Simple ratio: (issues found / total issues) x 10, floored at 1.
 */
function scoreReview(found: number, total: number): number {
  if (total === 0) return 1;
  const raw = (found / total) * 10;
  return Math.max(1, raw);
}

// ─── Helpers ──────────────────────────────────────────────────────

/** Clamp a value to the 1–10 scale, rounded to two decimal places. */
function clamp(value: number): number {
  return Math.round(Math.min(10, Math.max(1, value)) * 100) / 100;
}

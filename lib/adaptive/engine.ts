import type { Challenge } from "@/lib/challenges/loader";

// ─── Types ────────────────────────────────────────────────────

export interface ChallengeResult {
  challengeId: string;
  tier: number;
  completed: boolean;
  timeUsedMs: number;
  timeLimitMs: number;
  codeQualityScore: number; // 0-1
  aiRelianceRatio: number; // 0-1
  topics: string[];
}

export interface NextChallengeDecision {
  challengeId: string;
  tier: number;
  reason: string;
  flagHighAIReliance?: boolean;
}

// ─── Decision Logic ───────────────────────────────────────────

const MIN_TIER = 1;
const MAX_TIER = 5;

/**
 * Rule-based adaptive engine that selects the next challenge based on
 * the candidate's performance on previous challenges.
 */
export function selectNextChallenge(
  previousResults: ChallengeResult[],
  availableChallenges: Challenge[],
  currentTier: number,
): NextChallengeDecision {
  if (previousResults.length === 0) {
    // First challenge — pick from the current tier
    const challenge = pickFromTier(availableChallenges, currentTier, []);
    return {
      challengeId: challenge.id,
      tier: challenge.tier,
      reason: "First challenge — starting at default tier",
    };
  }

  const latest = previousResults[previousResults.length - 1];
  const previousTopics = previousResults.flatMap((r) => r.topics);
  const timeRatio = latest.timeUsedMs / latest.timeLimitMs;

  // Rule 1: Escalate — completed quickly with good quality
  if (latest.completed && timeRatio < 0.6 && latest.codeQualityScore > 0.6) {
    const targetTier = Math.min(currentTier + 1, MAX_TIER);
    const challenge = pickFromTier(
      availableChallenges,
      targetTier,
      previousTopics,
    );
    return {
      challengeId: challenge.id,
      tier: challenge.tier,
      reason: `Escalating: completed in ${Math.round(timeRatio * 100)}% of time with quality ${latest.codeQualityScore.toFixed(2)}`,
    };
  }

  // Rule 2: De-escalate — failed or low quality
  if (!latest.completed || latest.codeQualityScore < 0.4) {
    const targetTier = Math.max(currentTier - 1, MIN_TIER);
    const challenge = pickFromTier(
      availableChallenges,
      targetTier,
      previousTopics,
    );
    return {
      challengeId: challenge.id,
      tier: challenge.tier,
      reason: `De-escalating: ${!latest.completed ? "did not complete" : `low quality score ${latest.codeQualityScore.toFixed(2)}`}`,
    };
  }

  // Rule 3: Flag high AI reliance — completed but heavy AI usage
  if (latest.completed && latest.aiRelianceRatio > 0.7) {
    const challenge = pickFromTier(
      availableChallenges,
      currentTier,
      previousTopics,
    );
    return {
      challengeId: challenge.id,
      tier: challenge.tier,
      reason: `Maintaining tier: high AI reliance ratio ${latest.aiRelianceRatio.toFixed(2)} — flagging for deeper probing`,
      flagHighAIReliance: true,
    };
  }

  // Rule 4: Default path — move up if completed, stay if not
  const targetTier = latest.completed
    ? Math.min(currentTier + 1, MAX_TIER)
    : currentTier;
  const challenge = pickFromTier(
    availableChallenges,
    targetTier,
    previousTopics,
  );
  return {
    challengeId: challenge.id,
    tier: challenge.tier,
    reason: `Default path: ${latest.completed ? "completed, moving up" : "not completed, staying at tier"}`,
  };
}

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Pick a challenge at (or near) the target tier, avoiding topics
 * that have already been covered.
 */
function pickFromTier(
  available: Challenge[],
  targetTier: number,
  previousTopics: string[],
): Challenge {
  const previousTopicSet = new Set(previousTopics);

  // Filter out challenges whose topics overlap with previous ones
  const differentTopic = available.filter(
    (c) => !c.topics.some((t) => previousTopicSet.has(t)),
  );

  // Prefer challenges with different topics; fall back to all available
  const pool = differentTopic.length > 0 ? differentTopic : available;

  // Try exact tier match first
  const exactTier = pool.filter((c) => c.tier === targetTier);
  if (exactTier.length > 0) return exactTier[0];

  // Try closest tier
  const sorted = [...pool].sort(
    (a, b) => Math.abs(a.tier - targetTier) - Math.abs(b.tier - targetTier),
  );
  return sorted[0];
}

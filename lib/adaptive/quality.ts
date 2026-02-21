import type { Challenge } from "@/lib/challenges/loader";

/**
 * Test results from real test runner execution.
 */
export interface TestResults {
  passed: number;
  failed: number;
  total: number;
  tests: Array<{ name: string; status: string; duration: number }>;
}

/**
 * Keyword patterns per challenge topic for quick heuristic scoring.
 * Each entry maps a topic tag to an array of regex patterns that
 * indicate the code addresses that topic.
 */
const TOPIC_PATTERNS: Record<string, RegExp[]> = {
  // Tier 1 — Todo list
  state_basics: [/useState/],
  event_handling: [/onClick|onChange|onSubmit|addEventListener/],
  list_rendering: [/\.map\s*\(/],
  // Tier 2 — Data dashboard
  data_fetching: [/useEffect/],
  async: [/fetch\s*\(|async\s|await\s/],
  loading_states: [/loading|isLoading|setLoading|error|setError/i],
  // Tier 3 — Form validation
  forms: [/onChange|onSubmit|handleChange|handleSubmit/],
  custom_hooks: [/function\s+use[A-Z]/],
  validation: [/valid|validate|error|required/i],
  // Tier 4 — Infinite scroll
  performance: [/useMemo|useCallback|React\.memo/],
  intersection_observer: [/IntersectionObserver/],
  pagination: [/page|offset|cursor|loadMore|fetchMore/i],
  // Tier 5 — Collaborative counter
  state_advanced: [/useReducer/],
  context: [/useContext|createContext|\.Provider/],
  optimistic_updates: [/optimistic|pending|rollback|confirm/i],
};

/**
 * Combined code quality score using real test results (primary)
 * and heuristic analysis (secondary).
 *
 * When test results are available, they contribute 60% of the score.
 * The heuristic analysis contributes the remaining 40%.
 */
export function quickCodeQualityScore(
  code: string,
  challenge: Challenge,
  testResults?: TestResults | null
): number {
  if (!code || code.trim().length === 0) return 0;

  // ── Primary: Test results (0.6 weight when available) ───────
  let testScore = 0;
  const hasTests = testResults && testResults.total > 0;

  if (hasTests) {
    testScore = testResults.passed / testResults.total;
  }

  // ── Secondary: Heuristic analysis ──────────────────────────
  let heuristicScore = 0;

  // 1. Keyword pattern match for challenge topics
  const topicPatterns = challenge.topics.flatMap(
    (topic) => TOPIC_PATTERNS[topic] ?? []
  );
  if (topicPatterns.length > 0) {
    const matched = topicPatterns.filter((pattern) => pattern.test(code));
    const ratio = matched.length / topicPatterns.length;
    heuristicScore += ratio * 0.3;
  }

  // 2. Code structure — has some decomposition
  const functionCount = (
    code.match(/function\s+\w+|const\s+\w+\s*=\s*\(|=>\s*\{/g) ?? []
  ).length;
  if (functionCount >= 3) {
    heuristicScore += 0.2;
  } else if (functionCount >= 2) {
    heuristicScore += 0.1;
  }

  // 3. Reasonable length
  const lineCount = code.split("\n").length;
  if (lineCount >= 20 && lineCount <= 500) {
    heuristicScore += 0.2;
  } else if (lineCount > 500) {
    heuristicScore += 0.1;
  }

  // 4. Basic syntax sanity
  const openBraces = (code.match(/\{/g) ?? []).length;
  const closeBraces = (code.match(/\}/g) ?? []).length;
  const openParens = (code.match(/\(/g) ?? []).length;
  const closeParens = (code.match(/\)/g) ?? []).length;

  const braceBalance = Math.abs(openBraces - closeBraces);
  const parenBalance = Math.abs(openParens - closeParens);

  if (braceBalance <= 1 && parenBalance <= 1) {
    heuristicScore += 0.3;
  } else if (braceBalance <= 3 && parenBalance <= 3) {
    heuristicScore += 0.15;
  }

  heuristicScore = Math.min(heuristicScore, 1);

  // ── Combine scores ─────────────────────────────────────────
  if (hasTests) {
    // 60% test results, 40% heuristic
    return Math.min(testScore * 0.6 + heuristicScore * 0.4, 1);
  }

  // Fallback to pure heuristic when no test results available
  return heuristicScore;
}

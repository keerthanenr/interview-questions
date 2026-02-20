import type { Challenge } from "@/lib/challenges/loader";

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
 * Fast heuristic code quality score (0-1).
 * NOT a Claude call — designed for zero-latency between challenges.
 */
export function quickCodeQualityScore(
  code: string,
  challenge: Challenge,
): number {
  if (!code || code.trim().length === 0) return 0;

  let score = 0;

  // ── 1. Keyword pattern match for challenge topics (0.3) ─────
  const topicPatterns = challenge.topics.flatMap(
    (topic) => TOPIC_PATTERNS[topic] ?? [],
  );
  if (topicPatterns.length > 0) {
    const matched = topicPatterns.filter((pattern) => pattern.test(code));
    const ratio = matched.length / topicPatterns.length;
    score += ratio * 0.3;
  }

  // ── 2. Code structure — has some decomposition (0.2) ────────
  const functionCount = (
    code.match(/function\s+\w+|const\s+\w+\s*=\s*\(|=>\s*\{/g) ?? []
  ).length;
  if (functionCount >= 3) {
    score += 0.2;
  } else if (functionCount >= 2) {
    score += 0.1;
  }

  // ── 3. Reasonable length (0.2) ──────────────────────────────
  const lineCount = code.split("\n").length;
  if (lineCount >= 20 && lineCount <= 500) {
    score += 0.2;
  } else if (lineCount > 500) {
    score += 0.1; // Too long, partial credit
  }
  // Under 20 lines gets 0

  // ── 4. Basic syntax sanity (0.3) ────────────────────────────
  // Check for balanced braces and parens as a rough proxy for compilability
  const openBraces = (code.match(/\{/g) ?? []).length;
  const closeBraces = (code.match(/\}/g) ?? []).length;
  const openParens = (code.match(/\(/g) ?? []).length;
  const closeParens = (code.match(/\)/g) ?? []).length;

  const braceBalance = Math.abs(openBraces - closeBraces);
  const parenBalance = Math.abs(openParens - closeParens);

  if (braceBalance <= 1 && parenBalance <= 1) {
    score += 0.3;
  } else if (braceBalance <= 3 && parenBalance <= 3) {
    score += 0.15;
  }

  return Math.min(score, 1);
}

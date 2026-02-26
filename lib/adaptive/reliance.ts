import type { TerminalMetrics } from "@/lib/scoring/terminal-analyzer";
import { terminalAIRelianceScore } from "@/lib/scoring/terminal-analyzer";

/**
 * Combined AI reliance score using event-based tracking (Claude chat panel)
 * and terminal I/O analysis (Claude Code CLI usage).
 *
 * When terminal metrics are available, they provide the more accurate signal
 * since they capture actual Claude Code CLI interactions, not just the web
 * chat panel. The two sources are weighted accordingly:
 * - Terminal metrics available: 70% terminal, 30% events
 * - Terminal only:             100% terminal
 * - Events only:               100% events
 */
export function quickAIRelianceScore(
  events: { event_type: string; payload: Record<string, unknown> }[],
  finalCode: string,
  terminalMetrics?: TerminalMetrics | null
): number {
  if (!finalCode || finalCode.trim().length === 0) return 0;

  // ── Event-based reliance (Claude chat panel) ────────────────
  let eventReliance = 0;

  const acceptedEvents = events.filter(
    (e) => e.event_type === "claude_output_accepted"
  );

  if (acceptedEvents.length > 0) {
    const totalLines = finalCode.split("\n").length;
    if (totalLines > 0) {
      let verbatimLines = 0;
      for (const event of acceptedEvents) {
        const acceptanceType = event.payload.acceptance_type as
          | string
          | undefined;
        const original = event.payload.original as string | undefined;

        if (acceptanceType === "full" && original) {
          verbatimLines += original.split("\n").length;
        } else if (acceptanceType === "partial" && original) {
          verbatimLines += Math.floor(original.split("\n").length * 0.5);
        }
      }
      eventReliance = Math.min(verbatimLines / totalLines, 1);
    }
  }

  // ── Terminal-based reliance (Claude Code CLI) ───────────────
  const hasTerminal = terminalMetrics && terminalMetrics.totalDurationMs > 0;
  const terminalReliance = hasTerminal
    ? terminalAIRelianceScore(terminalMetrics)
    : 0;

  // ── Combine sources ─────────────────────────────────────────
  if (hasTerminal && acceptedEvents.length > 0) {
    // Both signals available — terminal is more reliable
    return Math.min(terminalReliance * 0.7 + eventReliance * 0.3, 1);
  }

  if (hasTerminal) {
    return terminalReliance;
  }

  // Fallback to event-based only
  return eventReliance;
}

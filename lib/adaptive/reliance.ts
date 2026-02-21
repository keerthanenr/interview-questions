/**
 * Quick AI reliance score — calculates the ratio of code
 * accepted verbatim from Claude vs. total code written.
 */
export function quickAIRelianceScore(
  events: { event_type: string; payload: Record<string, unknown> }[],
  finalCode: string
): number {
  if (!finalCode || finalCode.trim().length === 0) return 0;

  const acceptedEvents = events.filter(
    (e) => e.event_type === "claude_output_accepted"
  );

  if (acceptedEvents.length === 0) return 0;

  const totalLines = finalCode.split("\n").length;
  if (totalLines === 0) return 0;

  // Count lines accepted verbatim (full acceptance)
  let verbatimLines = 0;
  for (const event of acceptedEvents) {
    const acceptanceType = event.payload.acceptance_type as string | undefined;
    const original = event.payload.original as string | undefined;

    if (acceptanceType === "full" && original) {
      verbatimLines += original.split("\n").length;
    } else if (acceptanceType === "partial" && original) {
      // Partial acceptance counts as half
      verbatimLines += Math.floor(original.split("\n").length * 0.5);
    }
  }

  return Math.min(verbatimLines / totalLines, 1);
}

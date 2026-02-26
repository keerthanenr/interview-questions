import type { NextRequest } from "next/server";
import type { ChallengeResult } from "@/lib/adaptive/engine";
import { selectNextChallenge } from "@/lib/adaptive/engine";
import { quickCodeQualityScore } from "@/lib/adaptive/quality";
import { quickAIRelianceScore } from "@/lib/adaptive/reliance";
import { getChallenge, getChallengePool } from "@/lib/challenges/loader";
import type { TerminalMetrics } from "@/lib/scoring/terminal-analyzer";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const {
      sessionId,
      challengeId,
      code,
      completed,
      timeUsedMs,
      timeLimitMs,
      testResults,
      terminalMetrics,
    } = await request.json();

    if (!sessionId || !challengeId) {
      return Response.json(
        { error: "sessionId and challengeId are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Fetch events for AI reliance scoring
    const { data: events } = await supabase
      .from("events")
      .select("event_type, payload")
      .eq("session_id", sessionId)
      .in("event_type", ["claude_output_accepted"]);

    const eventList = (events ?? []) as {
      event_type: string;
      payload: Record<string, unknown>;
    }[];

    // Get the current challenge for quality scoring
    const currentChallenge = await getChallenge(challengeId);
    const allChallenges = await getChallengePool();

    // Cast terminal metrics (comes as JSON from request body)
    const tMetrics = (terminalMetrics as TerminalMetrics) ?? null;

    // Calculate scores — use real test results and terminal metrics when available
    const codeQualityScore = quickCodeQualityScore(
      code ?? "",
      currentChallenge,
      testResults ?? null,
      tMetrics
    );
    const aiRelianceRatio = quickAIRelianceScore(
      eventList,
      code ?? "",
      tMetrics
    );

    // Get previous results from session metadata
    const { data: session } = await supabase
      .from("sessions")
      .select("metadata")
      .eq("id", sessionId)
      .single();

    const metadata = (session?.metadata as Record<string, unknown>) ?? {};
    const previousResults = (
      (metadata.challengeResults as ChallengeResult[]) ?? []
    ).concat([
      {
        challengeId,
        tier: currentChallenge.tier,
        completed: completed ?? true,
        timeUsedMs: timeUsedMs ?? 0,
        timeLimitMs: timeLimitMs ?? currentChallenge.timeLimit * 60 * 1000,
        codeQualityScore,
        aiRelianceRatio,
        topics: currentChallenge.topics,
      },
    ]);

    // Filter out already-completed challenges from the pool
    const completedIds = new Set(previousResults.map((r) => r.challengeId));
    const available = allChallenges.filter((c) => !completedIds.has(c.id));

    if (available.length === 0) {
      // No more challenges available — end build phase
      return Response.json({
        done: true,
        reason: "No more challenges available",
      });
    }

    // Run the adaptive engine
    const decision = selectNextChallenge(
      previousResults,
      available,
      currentChallenge.tier
    );

    // Update session metadata with challenge results and flags
    const updatedMetadata = {
      ...metadata,
      challengeResults: previousResults,
      currentChallengeIndex:
        ((metadata.currentChallengeIndex as number) ?? 0) + 1,
      ...(decision.flagHighAIReliance ? { highAIRelianceFlag: true } : {}),
    };

    await supabase
      .from("sessions")
      .update({ metadata: updatedMetadata })
      .eq("id", sessionId);

    // Load the next challenge data
    const nextChallenge = await getChallenge(decision.challengeId);

    return Response.json({
      done: false,
      decision,
      challenge: nextChallenge,
    });
  } catch (err) {
    console.error("Failed to get next challenge:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

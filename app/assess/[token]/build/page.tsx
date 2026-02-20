import { AssessmentLayout } from "@/components/assessment/AssessmentLayout";
import { getChallengeForSession } from "@/lib/challenges/loader";
import { startSession } from "@/lib/sessions/manager";
import { logEvent } from "@/lib/events/logger";
import { BUILD_PHASE_MINUTES } from "@/lib/constants";
import { redirect } from "next/navigation";

export default async function BuildPhasePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let session;
  try {
    session = await startSession(token);
  } catch {
    redirect(`/assess/${token}`);
  }

  // Redirect if not in build phase
  if (session.current_phase !== "build") {
    redirect(`/assess/${token}/${session.current_phase}`);
  }

  const metadata = (session.metadata as Record<string, unknown>) ?? {};
  const challengeIndex = (metadata.currentChallengeIndex as number) ?? 0;

  const challenge = await getChallengeForSession(session);

  // Log the first challenge start (fire-and-forget)
  if (challengeIndex === 0) {
    logEvent({
      sessionId: session.id,
      eventType: "challenge_started",
      payload: {
        challenge_id: challenge.id,
        difficulty_tier: challenge.tier,
        timestamp: new Date().toISOString(),
      },
    });
  }

  return (
    <AssessmentLayout
      challenge={{
        id: challenge.id,
        title: challenge.title,
        description: challenge.description,
        requirements: challenge.requirements,
        tier: challenge.tier,
        timeLimit: challenge.timeLimit,
        starterCode: challenge.starterCode,
      }}
      currentPhase="build"
      sessionId={session.id}
      token={token}
      startedAt={session.started_at ?? undefined}
      buildPhaseMinutes={BUILD_PHASE_MINUTES}
      initialChallengeIndex={challengeIndex}
    />
  );
}

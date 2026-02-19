import { MRReviewPanel } from "@/components/assessment/MRReviewPanel";
import { getSessionWithCandidate } from "@/lib/sessions/manager";
import { redirect } from "next/navigation";
import fs from "node:fs/promises";
import path from "node:path";

export default async function ReviewPhasePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let session;
  try {
    const result = await getSessionWithCandidate(token);
    session = result.session;
  } catch {
    redirect(`/assess/${token}`);
  }

  // Redirect if not in review phase
  if (session.current_phase !== "review") {
    redirect(
      `/assess/${token}/${session.current_phase === "complete" ? "complete" : session.current_phase}`,
    );
  }

  // Load the review scenario
  const scenarioRaw = await fs.readFile(
    path.join(
      process.cwd(),
      "data",
      "review-scenarios",
      "react-dashboard-mr.json",
    ),
    "utf-8",
  );
  const scenario = JSON.parse(scenarioRaw);

  return (
    <MRReviewPanel
      scenario={scenario}
      sessionId={session.id}
      token={token}
    />
  );
}

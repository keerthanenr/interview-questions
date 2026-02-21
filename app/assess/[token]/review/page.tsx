import { redirect } from "next/navigation";
import { MRReviewPanel } from "@/components/assessment/MRReviewPanel";
import { loadReviewScenario } from "@/lib/data/loaders";
import { getSessionWithCandidate } from "@/lib/sessions/manager";

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
      `/assess/${token}/${session.current_phase === "complete" ? "complete" : session.current_phase}`
    );
  }

  const scenario = await loadReviewScenario();

  return (
    <MRReviewPanel scenario={scenario} sessionId={session.id} token={token} />
  );
}

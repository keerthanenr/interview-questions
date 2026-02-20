import { QuickfireRound } from "@/components/assessment/QuickfireRound";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionWithCandidate } from "@/lib/sessions/manager";
import { redirect } from "next/navigation";

export default async function ExplainPhasePage({
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

  // Redirect if not in explain phase
  if (session.current_phase !== "explain") {
    redirect(
      `/assess/${token}/${session.current_phase === "complete" ? "complete" : session.current_phase}`,
    );
  }

  const metadata = (session.metadata as Record<string, unknown>) ?? {};

  // If questions already exist in session metadata, use them
  if (metadata.questions && Array.isArray(metadata.questions)) {
    return (
      <QuickfireRound
        questions={metadata.questions as import("@/lib/claude/client").QuickfireQuestion[]}
        sessionId={session.id}
        token={token}
      />
    );
  }

  // Fetch ALL build submissions for multi-challenge question generation
  const supabase = createAdminClient();
  const { data: submissions } = await supabase
    .from("submissions")
    .select("code, metadata")
    .eq("session_id", session.id)
    .eq("phase", "build")
    .order("created_at", { ascending: true });

  // Combine all submission code
  let combinedCode = "";
  if (submissions && submissions.length > 0) {
    combinedCode = submissions
      .map((s, i) => {
        const meta = (s.metadata as Record<string, unknown>) ?? {};
        const challengeId = (meta.challenge_id as string) ?? `challenge-${i + 1}`;
        return `// ─── Challenge: ${challengeId} ───\n${s.code ?? ""}`;
      })
      .join("\n\n");
  }

  // Call the question generation API — it now handles multi-challenge internally
  const { getBaseUrl } = await import("@/lib/utils");
  const baseUrl = getBaseUrl();

  const res = await fetch(`${baseUrl}/api/assess/questions/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId: session.id, code: combinedCode }),
    cache: "no-store",
  });

  const { questions } = await res.json();

  return (
    <QuickfireRound
      questions={questions ?? []}
      sessionId={session.id}
      token={token}
    />
  );
}

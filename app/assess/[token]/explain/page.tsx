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

  // Generate questions from the candidate's build submission
  const supabase = createAdminClient();
  const { data: submission } = await supabase
    .from("submissions")
    .select("code")
    .eq("session_id", session.id)
    .eq("phase", "build")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const code = submission?.code ?? "";

  // Call the question generation API
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  const res = await fetch(`${baseUrl}/api/assess/questions/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId: session.id, code }),
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

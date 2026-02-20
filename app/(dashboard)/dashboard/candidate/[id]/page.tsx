import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { DossierCharts } from "@/components/dashboard/dossier-charts";
import { DossierPolling } from "@/components/dashboard/dossier-polling";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function CandidateDossierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  // Fetch candidate with assessment
  const { data: candidate } = await supabase
    .from("candidates")
    .select("*, assessments(title)")
    .eq("id", id)
    .single();

  if (!candidate) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-muted-foreground">Candidate not found.</p>
        <Link href="/dashboard"><Button variant="ghost" className="mt-4">Back to Dashboard</Button></Link>
      </div>
    );
  }

  const assessment = (candidate as Record<string, unknown>).assessments as { title: string } | null;

  // Fetch session
  const { data: sessions } = await supabase
    .from("sessions")
    .select("*")
    .eq("candidate_id", id)
    .order("started_at", { ascending: false })
    .limit(1);

  const session = sessions?.[0];

  // Fetch events, submissions, quickfire responses, review comments, dossier
  const [eventsRes, submissionsRes, quickfireRes, reviewRes, dossierRes] = await Promise.all([
    session ? supabase.from("events").select("*").eq("session_id", session.id).order("created_at") : { data: [] },
    session ? supabase.from("submissions").select("*").eq("session_id", session.id) : { data: [] },
    session ? supabase.from("quickfire_responses").select("*").eq("session_id", session.id).order("question_index") : { data: [] },
    session ? supabase.from("review_comments").select("*").eq("session_id", session.id) : { data: [] },
    supabase.from("dossiers").select("*").eq("candidate_id", id).single(),
  ]);

  const events = eventsRes.data ?? [];
  const submissions = submissionsRes.data ?? [];
  const quickfireResponses = quickfireRes.data ?? [];
  const reviewComments = reviewRes.data ?? [];
  const dossier = dossierRes.data;

  const scores = (dossier?.scores ?? {}) as Record<string, unknown>;
  const profile = (dossier?.profile ?? {}) as Record<string, unknown>;

  // Compute basic stats from events
  const promptEvents = events.filter((e: Record<string, unknown>) => e.event_type === "prompt_sent");
  const codeChangeEvents = events.filter((e: Record<string, unknown>) => e.event_type === "code_change");
  const claudeAcceptedEvents = events.filter((e: Record<string, unknown>) => e.event_type === "claude_output_accepted");

  const technicalBreakdown = (scores.breakdown ?? {}) as Record<string, number>;

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      {/* Back link */}
      <Link href="/dashboard" className="text-xs text-muted-foreground hover:text-foreground transition-colors mb-6 inline-flex items-center gap-1">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Back to Dashboard
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold mb-1">
              {candidate.full_name ?? candidate.email}
            </h1>
            {candidate.full_name && (
              <p className="text-sm text-muted-foreground">{candidate.email}</p>
            )}
          </div>
          <Badge variant="outline" className={
            candidate.status === "completed"
              ? "bg-success/15 text-success border-success/30"
              : "bg-amber-500/15 text-amber-400 border-amber-500/30"
          }>
            {candidate.status.replace("_", " ")}
          </Badge>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {assessment && <span>{assessment.title}</span>}
          {candidate.completed_at && (
            <span>Completed {new Date(candidate.completed_at).toLocaleDateString()}</span>
          )}
          {dossier && (
            <span>Dossier generated {new Date(dossier.generated_at).toLocaleDateString()}</span>
          )}
        </div>
        {(profile.recommendation as string) && (
          <div className="mt-3">
            <Badge className={
              profile.recommendation === "strong_hire" ? "bg-success text-success-foreground" :
              profile.recommendation === "hire" ? "bg-success/70 text-success-foreground" :
              profile.recommendation === "lean_hire" ? "bg-warning text-warning-foreground" :
              "bg-destructive text-destructive-foreground"
            }>
              {(profile.recommendation as string).replace("_", " ").toUpperCase()}
            </Badge>
          </div>
        )}
      </div>

      {!dossier && candidate.status === "completed" && <DossierPolling />}

      <div className="grid gap-6">
        {/* Technical Proficiency Score */}
        <section className="rounded-xl border bg-card/50 p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
            </svg>
            Technical Proficiency
          </h2>
          <div className="flex items-start gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary">
                {typeof scores.overall === "number" ? scores.overall.toFixed(1) : "—"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">out of 10</p>
            </div>
            <div className="flex-1">
              {Object.keys(technicalBreakdown).length > 0 ? (
                <DossierCharts breakdown={technicalBreakdown} />
              ) : (
                <p className="text-sm text-muted-foreground">No breakdown data available yet.</p>
              )}
            </div>
          </div>
          {submissions.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-2">Submissions: {submissions.length}</p>
            </div>
          )}
        </section>

        {/* AI Collaboration Profile */}
        <section className="rounded-xl border bg-card/50 p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
            AI Collaboration Profile
          </h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="rounded-lg bg-secondary/50 p-3 text-center">
              <p className="text-2xl font-bold">{typeof scores.promptQuality === "number" ? scores.promptQuality : "—"}</p>
              <p className="text-xs text-muted-foreground">Prompt Quality (1-5)</p>
            </div>
            <div className="rounded-lg bg-secondary/50 p-3 text-center">
              <p className="text-2xl font-bold">{typeof scores.verificationScore === "number" ? scores.verificationScore : "—"}</p>
              <p className="text-xs text-muted-foreground">Verification (1-5)</p>
            </div>
            <div className="rounded-lg bg-secondary/50 p-3 text-center">
              <p className="text-2xl font-bold">{promptEvents.length}</p>
              <p className="text-xs text-muted-foreground">Prompts Sent</p>
            </div>
          </div>

          {/* Independence ratio bar */}
          {scores.independenceRatio != null && (
            <div className="mb-4">
              <p className="text-xs text-muted-foreground mb-2">Independence Ratio</p>
              <div className="flex h-6 rounded-full overflow-hidden text-[10px] font-medium">
                {(() => {
                  const ratio = scores.independenceRatio as { selfWritten: number; modified: number; verbatimAccepted: number };
                  return (
                    <>
                      <div className="bg-success flex items-center justify-center text-success-foreground" style={{ width: `${ratio.selfWritten}%` }}>
                        {ratio.selfWritten > 10 ? `Wrote ${Math.round(ratio.selfWritten)}%` : ""}
                      </div>
                      <div className="bg-amber-500 flex items-center justify-center text-black" style={{ width: `${ratio.modified}%` }}>
                        {ratio.modified > 10 ? `Modified ${Math.round(ratio.modified)}%` : ""}
                      </div>
                      <div className="bg-sky-500 flex items-center justify-center text-white" style={{ width: `${ratio.verbatimAccepted}%` }}>
                        {ratio.verbatimAccepted > 10 ? `Verbatim ${Math.round(ratio.verbatimAccepted)}%` : ""}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          <div className="text-sm text-muted-foreground italic">
            {(profile.ai_collaboration_narrative as string) ??
              "[AI-generated collaboration narrative will appear here]"}
          </div>
        </section>

        {/* Code Comprehension */}
        <section className="rounded-xl border bg-card/50 p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
            </svg>
            Code Comprehension
          </h2>
          {quickfireResponses.length > 0 ? (
            <>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="rounded-lg bg-secondary/50 p-3 text-center">
                  <p className="text-2xl font-bold">
                    {quickfireResponses.filter((q: Record<string, unknown>) => q.is_correct).length}/{quickfireResponses.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Correct</p>
                </div>
                <div className="rounded-lg bg-secondary/50 p-3 text-center">
                  <p className="text-2xl font-bold">
                    {quickfireResponses.length > 0
                      ? Math.round(quickfireResponses.reduce((acc: number, q: Record<string, unknown>) => acc + ((q.response_time_ms as number) ?? 0), 0) / quickfireResponses.length / 1000)
                      : "—"}s
                  </p>
                  <p className="text-xs text-muted-foreground">Avg Response Time</p>
                </div>
                <div className="rounded-lg bg-secondary/50 p-3 text-center">
                  <p className="text-2xl font-bold">
                    {quickfireResponses.length > 0
                      ? Math.round((quickfireResponses.filter((q: Record<string, unknown>) => q.is_correct).length / quickfireResponses.length) * 100)
                      : 0}%
                  </p>
                  <p className="text-xs text-muted-foreground">Accuracy</p>
                </div>
              </div>
              <div className="space-y-2">
                {quickfireResponses.map((q: Record<string, unknown>, i: number) => (
                  <div key={q.id as string} className="flex items-center gap-3 text-sm py-1">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${q.is_correct ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
                      {q.is_correct ? "✓" : "✗"}
                    </span>
                    <span className="flex-1 truncate text-muted-foreground">Q{i + 1}</span>
                    {q.response_time_ms != null && (
                      <span className="text-xs text-muted-foreground">{((q.response_time_ms as number) / 1000).toFixed(1)}s</span>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No quickfire data available yet.</p>
          )}
        </section>

        {/* Communication & Collaboration */}
        <section className="rounded-xl border bg-card/50 p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
            </svg>
            Communication & Collaboration
          </h2>
          {reviewComments.length > 0 ? (
            <>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="rounded-lg bg-secondary/50 p-3 text-center">
                  <p className="text-2xl font-bold">{typeof scores.communicationOverall === "number" ? scores.communicationOverall.toFixed(1) : "—"}</p>
                  <p className="text-xs text-muted-foreground">Overall (1-10)</p>
                </div>
                <div className="rounded-lg bg-secondary/50 p-3 text-center">
                  <p className="text-2xl font-bold">{reviewComments.length}</p>
                  <p className="text-xs text-muted-foreground">Comments</p>
                </div>
                <div className="rounded-lg bg-secondary/50 p-3 text-center">
                  <p className="text-2xl font-bold">
                    {reviewComments.filter((c: Record<string, unknown>) => c.issue_category).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Issues Found</p>
                </div>
              </div>
              <div className="space-y-2">
                {reviewComments.slice(0, 5).map((c: Record<string, unknown>) => (
                  <div key={c.id as string} className="rounded-lg bg-secondary/30 p-3 text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-muted-foreground">{c.file_path as string}:{c.line_number as number}</span>
                      {c.issue_category != null && (
                        <Badge variant="outline" className="text-[10px]">
                          {(c.issue_category as string).replace("_", " ")}
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground">{c.comment_text as string}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No review comments available yet.</p>
          )}
        </section>

        {/* Behavioral Insights */}
        <section className="rounded-xl border bg-card/50 p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
            </svg>
            Behavioral Insights
          </h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="rounded-lg bg-secondary/50 p-3 text-center">
              <p className="text-2xl font-bold">{codeChangeEvents.length}</p>
              <p className="text-xs text-muted-foreground">Code Changes</p>
            </div>
            <div className="rounded-lg bg-secondary/50 p-3 text-center">
              <p className="text-2xl font-bold">{promptEvents.length}</p>
              <p className="text-xs text-muted-foreground">AI Interactions</p>
            </div>
            <div className="rounded-lg bg-secondary/50 p-3 text-center">
              <p className="text-2xl font-bold">{claudeAcceptedEvents.length}</p>
              <p className="text-xs text-muted-foreground">Code Acceptances</p>
            </div>
          </div>
          <div className="text-sm text-muted-foreground italic">
            {dossier?.summary ?? "[AI-generated behavioral insights will appear here]"}
          </div>
        </section>

        {/* Session Replay — gated behind Professional plan */}
        <section className="rounded-xl border bg-card/50 p-6 relative overflow-hidden">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
            </svg>
            Session Replay
          </h2>
          <div className="absolute inset-0 bg-card/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-xl">
            <svg className="w-8 h-8 text-muted-foreground mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <p className="text-sm font-medium mb-1">Session Replay</p>
            <p className="text-xs text-muted-foreground mb-3">Available on Professional and Enterprise plans</p>
            <Link href="/dashboard/billing">
              <Button size="sm" variant="outline">
                Upgrade to Professional
              </Button>
            </Link>
          </div>
          <div className="opacity-30 pointer-events-none">
            <div className="h-48 rounded-lg bg-secondary/30 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Timeline visualization of key coding moments</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

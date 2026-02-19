import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { InviteCandidateButton } from "@/components/dashboard/invite-candidate";

const statusColors: Record<string, string> = {
  active: "bg-success/15 text-success border-success/30",
  paused: "bg-warning/15 text-warning border-warning/30",
  archived: "bg-muted text-muted-foreground border-muted",
};

const candidateStatusColors: Record<string, string> = {
  invited: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  in_progress: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  completed: "bg-success/15 text-success border-success/30",
  expired: "bg-muted text-muted-foreground border-muted",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Get user's org
  const { data: dbUser } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();

  let assessments: Array<{
    id: string;
    title: string;
    status: string;
    created_at: string;
    candidates: Array<{
      id: string;
      email: string;
      full_name: string | null;
      status: string;
    }>;
  }> = [];

  if (dbUser) {
    const { data } = await supabase
      .from("assessments")
      .select("id, title, status, created_at, candidates(id, email, full_name, status)")
      .eq("org_id", dbUser.org_id)
      .order("created_at", { ascending: false });

    assessments = (data as typeof assessments) ?? [];
  }

  if (assessments.length === 0) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Your Assessments</h1>
          <Link href="/dashboard/new">
            <Button>
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Create Assessment
            </Button>
          </Link>
        </div>

        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold mb-2">No assessments yet</h2>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">
            Create your first assessment to start evaluating React developers with AI-augmented challenges.
          </p>
          <Link href="/dashboard/new">
            <Button>Create your first assessment</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Your Assessments</h1>
        <Link href="/dashboard/new">
          <Button>
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Create Assessment
          </Button>
        </Link>
      </div>

      <div className="space-y-4">
        {assessments.map((assessment) => {
          const candidates = assessment.candidates ?? [];
          const invited = candidates.filter((c) => c.status === "invited").length;
          const inProgress = candidates.filter((c) => c.status === "in_progress").length;
          const completed = candidates.filter((c) => c.status === "completed").length;

          return (
            <div key={assessment.id} className="rounded-xl border bg-card/50 overflow-hidden">
              {/* Assessment header */}
              <div className="px-5 py-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm truncate">{assessment.title}</h3>
                    <Badge variant="outline" className={statusColors[assessment.status] ?? ""}>
                      {assessment.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Created {new Date(assessment.created_at).toLocaleDateString()}</span>
                    <span>{invited} invited</span>
                    <span>{inProgress} in progress</span>
                    <span>{completed} completed</span>
                  </div>
                </div>
                <InviteCandidateButton assessmentId={assessment.id} />
              </div>

              {/* Candidates list */}
              {candidates.length > 0 && (
                <div className="border-t divide-y">
                  {candidates.map((candidate) => (
                    <div key={candidate.id} className="px-5 py-3 flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-medium">
                        {(candidate.full_name ?? candidate.email)[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {candidate.full_name ?? candidate.email}
                        </p>
                        {candidate.full_name && (
                          <p className="text-xs text-muted-foreground truncate">{candidate.email}</p>
                        )}
                      </div>
                      <Badge variant="outline" className={candidateStatusColors[candidate.status] ?? ""}>
                        {candidate.status.replace("_", " ")}
                      </Badge>
                      {candidate.status === "completed" && (
                        <Link href={`/dashboard/candidate/${candidate.id}`}>
                          <Button variant="ghost" size="sm" className="text-xs">
                            View Dossier
                          </Button>
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

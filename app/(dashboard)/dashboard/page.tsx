import Link from "next/link";
import { CopyLinkButton } from "@/components/dashboard/copy-link-button";
import { InviteCandidateButton } from "@/components/dashboard/invite-candidate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

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
      token: string;
    }>;
  }> = [];

  if (dbUser) {
    const { data } = await supabase
      .from("assessments")
      .select(
        "id, title, status, created_at, candidates(id, email, full_name, status, token)"
      )
      .eq("org_id", dbUser.org_id)
      .order("created_at", { ascending: false });

    assessments = (data as typeof assessments) ?? [];
  }

  if (assessments.length === 0) {
    return (
      <div className="p-6 lg:p-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="font-bold text-2xl">Your Assessments</h1>
          <Link href="/dashboard/new">
            <Button>
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  d="M12 4.5v15m7.5-7.5h-15"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Create Assessment
            </Button>
          </Link>
        </div>

        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
            <svg
              className="h-8 w-8 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h2 className="mb-2 font-semibold text-lg">No assessments yet</h2>
          <p className="mb-6 max-w-sm text-muted-foreground text-sm">
            Create your first assessment to start evaluating React developers
            with AI-augmented challenges.
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
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-bold text-2xl">Your Assessments</h1>
        <Link href="/dashboard/new">
          <Button>
            <svg
              className="mr-2 h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                d="M12 4.5v15m7.5-7.5h-15"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Create Assessment
          </Button>
        </Link>
      </div>

      <div className="space-y-4">
        {assessments.map((assessment) => {
          const candidates = assessment.candidates ?? [];
          const invited = candidates.filter(
            (c) => c.status === "invited"
          ).length;
          const inProgress = candidates.filter(
            (c) => c.status === "in_progress"
          ).length;
          const completed = candidates.filter(
            (c) => c.status === "completed"
          ).length;

          return (
            <div
              className="overflow-hidden rounded-xl border bg-card/50"
              key={assessment.id}
            >
              {/* Assessment header */}
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="truncate font-semibold text-sm">
                      {assessment.title}
                    </h3>
                    <Badge
                      className={statusColors[assessment.status] ?? ""}
                      variant="outline"
                    >
                      {assessment.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-muted-foreground text-xs">
                    <span>
                      Created{" "}
                      {new Date(assessment.created_at).toLocaleDateString()}
                    </span>
                    <span>{invited} invited</span>
                    <span>{inProgress} in progress</span>
                    <span>{completed} completed</span>
                  </div>
                </div>
                <InviteCandidateButton assessmentId={assessment.id} />
              </div>

              {/* Candidates list */}
              {candidates.length > 0 && (
                <div className="divide-y border-t">
                  {candidates.map((candidate) => (
                    <div
                      className="flex items-center gap-3 px-5 py-3"
                      key={candidate.id}
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary font-medium text-xs">
                        {(candidate.full_name ??
                          candidate.email)[0].toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-sm">
                          {candidate.full_name ?? candidate.email}
                        </p>
                        {candidate.full_name && (
                          <p className="truncate text-muted-foreground text-xs">
                            {candidate.email}
                          </p>
                        )}
                      </div>
                      <Badge
                        className={
                          candidateStatusColors[candidate.status] ?? ""
                        }
                        variant="outline"
                      >
                        {candidate.status.replace("_", " ")}
                      </Badge>
                      <CopyLinkButton token={candidate.token} />
                      {candidate.status === "completed" && (
                        <Link href={`/dashboard/candidate/${candidate.id}`}>
                          <Button className="text-xs" size="sm" variant="ghost">
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

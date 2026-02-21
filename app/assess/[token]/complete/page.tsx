import { redirect } from "next/navigation";
import { APP_NAME } from "@/lib/constants";
import { getSessionWithCandidate } from "@/lib/sessions/manager";

const phases = [
  { label: "Build", description: "Coded a React challenge" },
  { label: "Explain", description: "Answered quickfire questions" },
  { label: "Review", description: "Reviewed a merge request" },
];

export default async function CompletePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Validate session — allow access if completed or if current_phase is 'complete'
  try {
    const { session } = await getSessionWithCandidate(token);
    if (session.current_phase !== "complete") {
      redirect(`/assess/${token}/${session.current_phase}`);
    }
  } catch {
    // If session lookup fails, still show the complete page (may have been completed)
  }

  return (
    <main className="mesh-gradient flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-lg animate-slide-up text-center">
        <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-success/10">
          <svg
            className="h-10 w-10 text-success"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <path
              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h1 className="mb-3 font-bold font-display text-3xl tracking-tight sm:text-4xl">
          Assessment Complete &mdash; Thank You!
        </h1>
        <p className="mx-auto mb-8 max-w-md text-muted-foreground text-sm">
          Your results have been submitted and are being reviewed by the hiring
          team. Great work making it through all three phases!
        </p>

        {/* Completed phases */}
        <div className="glass-card mb-6 rounded-xl p-5">
          <div className="flex items-center justify-center gap-4">
            {phases.map((phase, i) => (
              <div className="flex items-center gap-3" key={phase.label}>
                <div className="text-center">
                  <div className="mx-auto mb-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-success/15">
                    <svg
                      className="h-4 w-4 text-success"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M4.5 12.75l6 6 9-13.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <p className="font-semibold text-xs">{phase.label}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {phase.description}
                  </p>
                </div>
                {i < phases.length - 1 && (
                  <div className="-mt-6 h-px w-8 bg-success/30" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* What happens next */}
        <div className="glass-card mb-8 rounded-xl p-6">
          <h3 className="mb-3 font-semibold text-sm">What happens next?</h3>
          <ul className="space-y-2.5 text-left text-muted-foreground text-sm">
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary text-xs">
                1
              </span>
              <span>
                Your code, responses, and review comments are being analyzed to
                build your candidate profile
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary text-xs">
                2
              </span>
              <span>
                The hiring team will receive a comprehensive dossier
                highlighting your strengths and collaboration style
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary text-xs">
                3
              </span>
              <span>
                You should hear back within a few days with next steps
              </span>
            </li>
          </ul>
        </div>

        <p className="text-muted-foreground text-xs">Powered by {APP_NAME}</p>
      </div>
    </main>
  );
}

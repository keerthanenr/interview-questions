import { APP_NAME } from "@/lib/constants";
import { getSessionWithCandidate } from "@/lib/sessions/manager";
import { redirect } from "next/navigation";

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
    <main className="mesh-gradient min-h-dvh flex items-center justify-center px-4">
      <div className="w-full max-w-lg text-center animate-slide-up">
        <div className="w-20 h-20 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-8">
          <svg
            className="w-10 h-10 text-success"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3 font-display">
          Assessment Complete &mdash; Thank You!
        </h1>
        <p className="text-muted-foreground text-sm max-w-md mx-auto mb-8">
          Your results have been submitted and are being reviewed by the hiring
          team. Great work making it through all three phases!
        </p>

        {/* Completed phases */}
        <div className="glass-card rounded-xl p-5 mb-6">
          <div className="flex items-center justify-center gap-4">
            {phases.map((phase, i) => (
              <div key={phase.label} className="flex items-center gap-3">
                <div className="text-center">
                  <div className="w-9 h-9 rounded-full bg-success/15 flex items-center justify-center mx-auto mb-1.5">
                    <svg
                      className="w-4 h-4 text-success"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                  </div>
                  <p className="text-xs font-semibold">{phase.label}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {phase.description}
                  </p>
                </div>
                {i < phases.length - 1 && (
                  <div className="w-8 h-px bg-success/30 -mt-6" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* What happens next */}
        <div className="glass-card rounded-xl p-6 mb-8">
          <h3 className="font-semibold text-sm mb-3">What happens next?</h3>
          <ul className="space-y-2.5 text-sm text-muted-foreground text-left">
            <li className="flex items-start gap-2.5">
              <span className="text-primary mt-0.5 font-bold text-xs w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                1
              </span>
              <span>
                Your code, responses, and review comments are being analyzed to
                build your candidate profile
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-primary mt-0.5 font-bold text-xs w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                2
              </span>
              <span>
                The hiring team will receive a comprehensive dossier
                highlighting your strengths and collaboration style
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-primary mt-0.5 font-bold text-xs w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                3
              </span>
              <span>
                You should hear back within a few days with next steps
              </span>
            </li>
          </ul>
        </div>

        <p className="text-xs text-muted-foreground">Powered by {APP_NAME}</p>
      </div>
    </main>
  );
}

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  BUILD_PHASE_MINUTES,
  EXPLAIN_PHASE_MINUTES,
  REVIEW_PHASE_MINUTES,
  APP_NAME,
} from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/admin";

const phases = [
  {
    name: "Build",
    duration: BUILD_PHASE_MINUTES,
    description:
      "Write React code in a live editor with Claude AI as your pair programmer. Solve a hands-on coding challenge while the editor captures your work in real time.",
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
        />
      </svg>
    ),
  },
  {
    name: "Explain",
    duration: EXPLAIN_PHASE_MINUTES,
    description:
      "Answer rapid-fire questions about your code to demonstrate your understanding. Questions are generated from your actual implementation.",
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
        />
      </svg>
    ),
  },
  {
    name: "Review",
    duration: REVIEW_PHASE_MINUTES,
    description:
      "Review a merge request with intentional issues. Leave comments identifying bugs, performance problems, and code quality concerns.",
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
        />
      </svg>
    ),
  },
];

export default async function AssessmentLandingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Look up the candidate by token
  const supabase = createAdminClient();
  const { data: candidate, error } = await supabase
    .from("candidates")
    .select("*, assessments(title)")
    .eq("token", token)
    .single();

  if (error || !candidate) {
    return (
      <main className="mesh-gradient min-h-dvh flex items-center justify-center px-4">
        <div className="text-center animate-slide-up">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">Invalid Assessment Link</h1>
          <p className="text-muted-foreground text-sm">This link is invalid or has expired. Please contact your recruiter for a new link.</p>
        </div>
      </main>
    );
  }

  if (candidate.status === "completed") {
    return (
      <main className="mesh-gradient min-h-dvh flex items-center justify-center px-4">
        <div className="text-center animate-slide-up">
          <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">Assessment Already Completed</h1>
          <p className="text-muted-foreground text-sm">You&apos;ve already completed this assessment. Your results have been submitted.</p>
        </div>
      </main>
    );
  }

  if (candidate.status === "expired") {
    return (
      <main className="mesh-gradient min-h-dvh flex items-center justify-center px-4">
        <div className="text-center animate-slide-up">
          <div className="w-16 h-16 rounded-2xl bg-warning/10 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">Assessment Expired</h1>
          <p className="text-muted-foreground text-sm">This assessment link has expired. Please contact your recruiter for a new invitation.</p>
        </div>
      </main>
    );
  }

  const totalMinutes =
    BUILD_PHASE_MINUTES + EXPLAIN_PHASE_MINUTES + REVIEW_PHASE_MINUTES;

  return (
    <main className="mesh-gradient min-h-dvh flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl animate-slide-up">
        <div className="text-center mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
            {APP_NAME}
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            Welcome to your assessment
          </h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            This assessment has three phases and takes approximately{" "}
            <strong className="text-foreground">{totalMinutes} minutes</strong>.
            Take a breath — you&apos;ve got this.
          </p>
        </div>

        {/* Phase cards */}
        <div className="space-y-3 mb-10">
          {phases.map((phase, i) => (
            <div
              key={phase.name}
              className="glass-card rounded-xl p-5 flex items-start gap-4 animate-slide-up"
              style={{ animationDelay: `${(i + 1) * 100}ms` }}
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
                {phase.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-sm">{phase.name} Phase</h3>
                  <span className="text-xs text-muted-foreground">
                    ~{phase.duration} min
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {phase.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* What to expect */}
        <div className="glass-card rounded-xl p-5 mb-8">
          <h3 className="font-semibold text-sm mb-3">What to expect</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-success mt-0.5">&#10003;</span>
              <span>
                <strong className="text-foreground">Claude AI</strong> is
                available as your pair programmer during the Build phase — use it
                however you like
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-success mt-0.5">&#10003;</span>
              <span>
                Each phase is timed, but the timer is generous — focus on quality
                over speed
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-success mt-0.5">&#10003;</span>
              <span>
                Your code, AI interactions, and responses are captured to build a
                holistic profile
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-success mt-0.5">&#10003;</span>
              <span>
                There are no trick questions — we want to see how you actually
                work
              </span>
            </li>
          </ul>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link href={`/assess/${token}/build`}>
            <Button size="lg" className="px-8">
              Start Assessment
              <svg
                className="w-4 h-4 ml-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </Button>
          </Link>
          <p className="text-xs text-muted-foreground mt-3">
            Once you start, the timer begins. Make sure you&apos;re ready.
          </p>
        </div>
      </div>
    </main>
  );
}

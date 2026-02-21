import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  APP_NAME,
  BUILD_PHASE_MINUTES,
  EXPLAIN_PHASE_MINUTES,
  REVIEW_PHASE_MINUTES,
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
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        viewBox="0 0 24 24"
      >
        <path
          d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
          strokeLinecap="round"
          strokeLinejoin="round"
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
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        viewBox="0 0 24 24"
      >
        <path
          d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
          strokeLinecap="round"
          strokeLinejoin="round"
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
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        viewBox="0 0 24 24"
      >
        <path
          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
          strokeLinecap="round"
          strokeLinejoin="round"
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
      <main className="mesh-gradient flex min-h-dvh items-center justify-center px-4">
        <div className="animate-slide-up text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
            <svg
              className="h-8 w-8 text-destructive"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="mb-2 font-bold text-2xl">Invalid Assessment Link</h1>
          <p className="text-muted-foreground text-sm">
            This link is invalid or has expired. Please contact your recruiter
            for a new link.
          </p>
        </div>
      </main>
    );
  }

  if (candidate.status === "completed") {
    return (
      <main className="mesh-gradient flex min-h-dvh items-center justify-center px-4">
        <div className="animate-slide-up text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-success/10">
            <svg
              className="h-8 w-8 text-success"
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
          <h1 className="mb-2 font-bold text-2xl">
            Assessment Already Completed
          </h1>
          <p className="text-muted-foreground text-sm">
            You&apos;ve already completed this assessment. Your results have
            been submitted.
          </p>
        </div>
      </main>
    );
  }

  if (candidate.status === "expired") {
    return (
      <main className="mesh-gradient flex min-h-dvh items-center justify-center px-4">
        <div className="animate-slide-up text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-warning/10">
            <svg
              className="h-8 w-8 text-warning"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path
                d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="mb-2 font-bold text-2xl">Assessment Expired</h1>
          <p className="text-muted-foreground text-sm">
            This assessment link has expired. Please contact your recruiter for
            a new invitation.
          </p>
        </div>
      </main>
    );
  }

  const totalMinutes =
    BUILD_PHASE_MINUTES + EXPLAIN_PHASE_MINUTES + REVIEW_PHASE_MINUTES;

  return (
    <main className="mesh-gradient flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl animate-slide-up">
        <div className="mb-10 text-center">
          <p className="mb-3 font-semibold text-primary text-xs uppercase tracking-widest">
            {APP_NAME}
          </p>
          <h1 className="mb-3 font-bold text-3xl tracking-tight sm:text-4xl">
            Welcome to your assessment
          </h1>
          <p className="mx-auto max-w-md text-muted-foreground text-sm">
            This assessment has three phases and takes approximately{" "}
            <strong className="text-foreground">{totalMinutes} minutes</strong>.
            Take a breath — you&apos;ve got this.
          </p>
        </div>

        {/* Phase cards */}
        <div className="mb-10 space-y-3">
          {phases.map((phase, i) => (
            <div
              className="glass-card flex animate-slide-up items-start gap-4 rounded-xl p-5"
              key={phase.name}
              style={{ animationDelay: `${(i + 1) * 100}ms` }}
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {phase.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <h3 className="font-semibold text-sm">{phase.name} Phase</h3>
                  <span className="text-muted-foreground text-xs">
                    ~{phase.duration} min
                  </span>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {phase.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* What to expect */}
        <div className="glass-card mb-8 rounded-xl p-5">
          <h3 className="mb-3 font-semibold text-sm">What to expect</h3>
          <ul className="space-y-2 text-muted-foreground text-sm">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-success">&#10003;</span>
              <span>
                <strong className="text-foreground">Claude AI</strong> is
                available as your pair programmer during the Build phase — use
                it however you like
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-success">&#10003;</span>
              <span>
                Each phase is timed, but the timer is generous — focus on
                quality over speed
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-success">&#10003;</span>
              <span>
                Your code, AI interactions, and responses are captured to build
                a holistic profile
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-success">&#10003;</span>
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
            <Button className="px-8" size="lg">
              Start Assessment
              <svg
                className="ml-2 h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Button>
          </Link>
          <p className="mt-3 text-muted-foreground text-xs">
            Once you start, the timer begins. Make sure you&apos;re ready.
          </p>
        </div>
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Intersection-Observer hook for scroll-triggered reveals            */
/* ------------------------------------------------------------------ */
function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.unobserve(el);
        }
      },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return { ref, visible };
}

/* ------------------------------------------------------------------ */
/*  Reusable reveal wrapper                                            */
/* ------------------------------------------------------------------ */
function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, visible } = useReveal(0.1);
  return (
    <div
      className={`transition-all duration-700 ease-out ${
        visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      } ${className}`}
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Inline SVG icons                                                    */
/* ------------------------------------------------------------------ */
function IconBrain({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path d="M12 2a5 5 0 0 1 4.546 2.914A4 4 0 0 1 18 11a4.002 4.002 0 0 1-1.382 3.025A3.5 3.5 0 0 1 13 17.5V22h-2v-4.5a3.5 3.5 0 0 1-3.618-3.475A4.002 4.002 0 0 1 6 11a4 4 0 0 1 1.454-6.086A5 5 0 0 1 12 2Z" />
      <path d="M12 2v5" />
      <path d="M9.5 7.5 12 7l2.5.5" />
    </svg>
  );
}

function IconTarget({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function IconEyeOff({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" x2="23" y1="1" y2="23" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
    </svg>
  );
}

function IconCode({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function IconZap({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function IconGitMerge({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <circle cx="18" cy="18" r="3" />
      <circle cx="6" cy="6" r="3" />
      <path d="M6 21V9a9 9 0 0 0 9 9" />
    </svg>
  );
}

function IconCheck({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconArrowDown({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <line x1="12" x2="12" y1="5" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Animated score bar for dossier preview                             */
/* ------------------------------------------------------------------ */
function ScoreBar({ score, label }: { score: number; label: string }) {
  const { ref, visible } = useReveal(0.2);
  return (
    <div className="space-y-2" ref={ref}>
      <div className="flex justify-between text-sm">
        <span className="text-[var(--muted-foreground)]">{label}</span>
        <span className="font-semibold text-[var(--foreground)]">
          {score}/100
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--secondary)]">
        <div
          className="score-gradient h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: visible ? `${score}%` : "0%" }}
        />
      </div>
    </div>
  );
}

/* ================================================================== */
/*  MAIN LANDING PAGE                                                  */
/* ================================================================== */
export default function LandingPage() {
  return (
    <main className="mesh-gradient min-h-dvh overflow-hidden">
      {/* ---- Ambient decoration ---- */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        {/* Large indigo glow top-right */}
        <div className="-top-40 -right-40 absolute h-[700px] w-[700px] rounded-full bg-[var(--primary)] opacity-[0.04] blur-[120px]" />
        {/* Smaller accent glow bottom-left */}
        <div className="-bottom-60 -left-40 absolute h-[500px] w-[500px] rounded-full bg-[var(--accent)] opacity-[0.03] blur-[100px]" />
      </div>

      {/* ---- Noise texture overlay ---- */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[1] opacity-[0.035]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "256px 256px",
        }}
      />

      <div className="relative z-10">
        {/* ============================================================ */}
        {/*  NAV                                                          */}
        {/* ============================================================ */}
        <nav className="sticky top-0 z-50 border-[var(--border)]/40 border-b bg-[var(--background)]/70 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
            <Link className="group flex items-center gap-2.5" href="/">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)] font-bold font-display text-sm text-white tracking-tight">
                R
              </div>
              <span className="font-display font-semibold text-[var(--foreground)] text-lg tracking-tight transition-colors group-hover:text-[var(--accent)]">
                ReactAssess
              </span>
            </Link>
            <div className="flex items-center gap-3">
              <Link
                className="hidden px-4 py-2 font-medium text-[var(--muted-foreground)] text-sm transition-colors hover:text-[var(--foreground)] sm:inline-flex"
                href="/login"
              >
                Sign in
              </Link>
              <Link
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-5 py-2.5 font-semibold text-sm text-white shadow-[0_0_24px_rgba(99,102,241,0.25)] transition-all duration-200 hover:bg-[var(--primary)]/85 hover:shadow-[0_0_32px_rgba(99,102,241,0.4)]"
                href="/login"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </nav>

        {/* ============================================================ */}
        {/*  HERO                                                         */}
        {/* ============================================================ */}
        <section className="relative px-6 pt-24 pb-32 md:pt-36 md:pb-44">
          {/* Decorative grid lines */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
              backgroundSize: "80px 80px",
            }}
          />

          <div className="relative mx-auto max-w-4xl text-center">
            {/* Tag line */}
            <div className="mb-8 inline-flex animate-slide-up items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--secondary)]/60 px-4 py-1.5 font-medium text-[var(--accent)] text-xs uppercase tracking-wide">
              <span className="h-1.5 w-1.5 animate-pulse-warm rounded-full bg-[var(--primary)]" />
              AI-Augmented Technical Assessment
            </div>

            {/* Headline */}
            <h1 className="animate-slide-up text-balance font-bold text-4xl text-[var(--foreground)] leading-[1.08] tracking-tight delay-100 sm:text-5xl md:text-6xl lg:text-[4.25rem]">
              Stop testing memory.{" "}
              <span className="relative">
                <span className="bg-gradient-to-r from-[var(--primary)] via-[var(--accent)] to-[var(--primary)] bg-clip-text text-transparent">
                  Start measuring
                </span>
              </span>{" "}
              how developers actually work.
            </h1>

            {/* Sub-headline */}
            <p className="mx-auto mt-8 max-w-2xl animate-slide-up text-balance text-[var(--muted-foreground)] text-lg leading-relaxed delay-200 md:text-xl">
              ReactAssess evaluates React developers using adaptive AI-augmented
              challenges, real code review, and behavioral analysis. See how
              candidates build, think, and collaborate&nbsp;&mdash; not just
              whether they can invert a binary tree.
            </p>

            {/* CTAs */}
            <div className="mt-12 flex animate-slide-up flex-col items-center justify-center gap-4 delay-300 sm:flex-row">
              <Link
                className="group hover:-translate-y-0.5 relative inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-8 py-3.5 font-semibold text-base text-white shadow-[0_0_32px_rgba(99,102,241,0.3)] transition-all duration-300 hover:bg-[var(--primary)]/85 hover:shadow-[0_0_48px_rgba(99,102,241,0.5)]"
                href="/login"
              >
                Start Free Trial
                <svg
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  viewBox="0 0 24 24"
                >
                  <line x1="5" x2="19" y1="12" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
              <a
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-6 py-3.5 font-medium text-[var(--muted-foreground)] text-base transition-all duration-300 hover:border-[var(--primary)]/40 hover:bg-[var(--secondary)]/50 hover:text-[var(--foreground)]"
                href="#dossier-preview"
              >
                See a sample dossier
                <IconArrowDown className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  PROBLEM SECTION                                              */}
        {/* ============================================================ */}
        <section className="relative px-6 py-28 md:py-36">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <p className="mb-4 text-center font-semibold text-[var(--primary)] text-sm uppercase tracking-widest">
                The problem
              </p>
            </Reveal>
            <Reveal delay={100}>
              <h2 className="mb-16 text-balance text-center font-bold text-3xl text-[var(--foreground)] sm:text-4xl md:text-5xl">
                Traditional coding assessments{" "}
                <span className="text-[var(--destructive)]">are broken</span>
              </h2>
            </Reveal>

            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  icon: <IconBrain className="h-8 w-8" />,
                  title: "Tests artificial skills",
                  desc: "Candidates write from memory, not how they actually work. You're measuring trivia recall, not engineering ability.",
                },
                {
                  icon: <IconTarget className="h-8 w-8" />,
                  title: "One-dimensional scoring",
                  desc: "A single pass/fail number tells you nothing about how someone thinks, communicates, or solves problems under real conditions.",
                },
                {
                  icon: <IconEyeOff className="h-8 w-8" />,
                  title: "AI-blind",
                  desc: "Modern developers use AI tools every day. Ignoring that reality means your assessments are testing for a world that no longer exists.",
                },
              ].map((card, i) => (
                <Reveal delay={i * 120} key={card.title}>
                  <div className="glass-card group hover:-translate-y-1 h-full rounded-2xl p-8 transition-all duration-300 hover:border-[var(--primary)]/30">
                    <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--destructive)]/10 text-[var(--destructive)] transition-transform duration-300 group-hover:scale-110">
                      {card.icon}
                    </div>
                    <h3 className="mb-3 font-semibold text-[var(--foreground)] text-xl">
                      {card.title}
                    </h3>
                    <p className="text-[var(--muted-foreground)] leading-relaxed">
                      {card.desc}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  HOW IT WORKS                                                 */}
        {/* ============================================================ */}
        <section className="relative px-6 py-28 md:py-36">
          {/* Subtle section separator */}
          <div
            aria-hidden
            className="-translate-x-1/2 absolute top-0 left-1/2 h-px w-[60%] bg-gradient-to-r from-transparent via-[var(--border)] to-transparent"
          />

          <div className="mx-auto max-w-6xl">
            <Reveal>
              <p className="mb-4 text-center font-semibold text-[var(--primary)] text-sm uppercase tracking-widest">
                How it works
              </p>
            </Reveal>
            <Reveal delay={100}>
              <h2 className="mb-6 text-balance text-center font-bold text-3xl text-[var(--foreground)] sm:text-4xl md:text-5xl">
                Three phases. One complete picture.
              </h2>
            </Reveal>
            <Reveal delay={150}>
              <p className="mx-auto mb-16 max-w-2xl text-center text-[var(--muted-foreground)] text-lg">
                Each assessment takes candidates through three distinct
                evaluation modes, designed to surface signal no single test
                could capture alone.
              </p>
            </Reveal>

            <div className="grid gap-8 md:grid-cols-3">
              {[
                {
                  step: "01",
                  icon: <IconCode className="h-7 w-7" />,
                  title: "Build",
                  desc: "Candidates solve React challenges with an AI assistant. We measure how they collaborate with tools, structure their work, and ship working code.",
                  accent: "var(--primary)",
                },
                {
                  step: "02",
                  icon: <IconZap className="h-7 w-7" />,
                  title: "Explain",
                  desc: "Timed quickfire questions generated from their own code. No cheating possible \u2014 they must understand what they built and articulate why.",
                  accent: "var(--warning)",
                },
                {
                  step: "03",
                  icon: <IconGitMerge className="h-7 w-7" />,
                  title: "Review",
                  desc: "Evaluate a merge request with real bugs, style issues, and architectural decisions. Tests code comprehension and communication skills.",
                  accent: "var(--success)",
                },
              ].map((phase, i) => (
                <Reveal delay={i * 140} key={phase.step}>
                  <div className="glass-card group hover:-translate-y-1 relative h-full rounded-2xl p-8 transition-all duration-300 hover:border-[var(--primary)]/30">
                    {/* Step number watermark */}
                    <span
                      className="absolute top-6 right-8 select-none font-bold font-display text-6xl opacity-[0.06]"
                      style={{ color: phase.accent }}
                    >
                      {phase.step}
                    </span>

                    <div
                      className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${phase.accent} 12%, transparent)`,
                        color: phase.accent,
                      }}
                    >
                      {phase.icon}
                    </div>

                    <h3 className="mb-3 font-bold text-2xl text-[var(--foreground)]">
                      {phase.title}
                    </h3>
                    <p className="text-[var(--muted-foreground)] leading-relaxed">
                      {phase.desc}
                    </p>

                    {/* Connecting line between cards (visible on md+) */}
                    {i < 2 && (
                      <div
                        aria-hidden
                        className="-right-4 absolute top-1/2 hidden h-px w-8 bg-[var(--border)] md:block"
                      />
                    )}
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  DOSSIER PREVIEW                                              */}
        {/* ============================================================ */}
        <section
          className="relative scroll-mt-20 px-6 py-28 md:py-36"
          id="dossier-preview"
        >
          <div
            aria-hidden
            className="-translate-x-1/2 absolute top-0 left-1/2 h-px w-[60%] bg-gradient-to-r from-transparent via-[var(--border)] to-transparent"
          />

          <div className="mx-auto max-w-6xl">
            <Reveal>
              <p className="mb-4 text-center font-semibold text-[var(--primary)] text-sm uppercase tracking-widest">
                The output
              </p>
            </Reveal>
            <Reveal delay={100}>
              <h2 className="mb-4 text-balance text-center font-bold text-3xl text-[var(--foreground)] sm:text-4xl md:text-5xl">
                Not a score.{" "}
                <span className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] bg-clip-text text-transparent">
                  A complete picture.
                </span>
              </h2>
            </Reveal>
            <Reveal delay={150}>
              <p className="mx-auto mb-16 max-w-2xl text-center text-[var(--muted-foreground)] text-lg">
                Every candidate receives a multi-dimensional dossier that gives
                hiring managers real insight, not just a number.
              </p>
            </Reveal>

            {/* Dossier mockup */}
            <Reveal delay={200}>
              <div className="glass-card mx-auto max-w-4xl overflow-hidden rounded-2xl border border-[var(--border)]">
                {/* Mockup header bar */}
                <div className="flex items-center gap-3 border-[var(--border)] border-b bg-[var(--secondary)]/30 px-6 py-4">
                  <div className="flex gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-[var(--destructive)]/60" />
                    <span className="h-3 w-3 rounded-full bg-[var(--warning)]/60" />
                    <span className="h-3 w-3 rounded-full bg-[var(--success)]/60" />
                  </div>
                  <span className="ml-2 font-mono text-[var(--muted-foreground)] text-xs">
                    candidate-dossier-2026-02.pdf
                  </span>
                </div>

                <div className="grid gap-6 p-6 md:grid-cols-2 md:p-10">
                  {/* Card: Technical Proficiency */}
                  <div className="space-y-5 rounded-xl border border-[var(--border)] bg-[var(--secondary)]/20 p-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
                        <IconCode className="h-5 w-5" />
                      </div>
                      <h4 className="font-semibold text-[var(--foreground)]">
                        Technical Proficiency
                      </h4>
                    </div>
                    <ScoreBar label="React Architecture" score={82} />
                    <ScoreBar label="State Management" score={91} />
                    <ScoreBar label="TypeScript Usage" score={74} />
                  </div>

                  {/* Card: AI Collaboration Profile */}
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--secondary)]/20 p-6">
                    <div className="mb-5 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
                        <IconBrain className="h-5 w-5" />
                      </div>
                      <h4 className="font-semibold text-[var(--foreground)]">
                        AI Collaboration Profile
                      </h4>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--muted-foreground)] text-sm">
                          Independence Ratio
                        </span>
                        <span className="font-bold font-display text-2xl text-[var(--accent)]">
                          72%
                        </span>
                      </div>
                      <div className="h-px bg-[var(--border)]" />
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-[var(--muted-foreground)]">
                            AI Prompts
                          </p>
                          <p className="font-semibold text-[var(--foreground)] text-lg">
                            14
                          </p>
                        </div>
                        <div>
                          <p className="text-[var(--muted-foreground)]">
                            Accepted Verbatim
                          </p>
                          <p className="font-semibold text-[var(--foreground)] text-lg">
                            3
                          </p>
                        </div>
                      </div>
                      <p className="text-[var(--muted-foreground)] text-xs leading-relaxed">
                        Uses AI as a thought partner, not a crutch. Consistently
                        modifies suggestions before implementing.
                      </p>
                    </div>
                  </div>

                  {/* Card: Communication Style */}
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--secondary)]/20 p-6">
                    <div className="mb-5 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--success)]/10 text-[var(--success)]">
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          viewBox="0 0 24 24"
                        >
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                      </div>
                      <h4 className="font-semibold text-[var(--foreground)]">
                        Communication Style
                      </h4>
                    </div>
                    <div className="space-y-3">
                      {[
                        "Clear & concise PR comments",
                        "Explains trade-offs",
                        "Asks clarifying questions",
                      ].map((trait) => (
                        <div
                          className="flex items-center gap-2.5 text-sm"
                          key={trait}
                        >
                          <IconCheck className="h-4 w-4 shrink-0 text-[var(--success)]" />
                          <span className="text-[var(--foreground)]">
                            {trait}
                          </span>
                        </div>
                      ))}
                      <div className="mt-4 rounded-lg bg-[var(--secondary)]/60 px-3 py-2.5 text-[var(--muted-foreground)] text-xs italic leading-relaxed">
                        &ldquo;This candidate communicates with the precision of
                        a senior engineer. Review comments are actionable and
                        well-reasoned.&rdquo;
                      </div>
                    </div>
                  </div>

                  {/* Card: Behavioral Insights */}
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--secondary)]/20 p-6">
                    <div className="mb-5 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--warning)]/10 text-[var(--warning)]">
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          viewBox="0 0 24 24"
                        >
                          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                        </svg>
                      </div>
                      <h4 className="font-semibold text-[var(--foreground)]">
                        Behavioral Insights
                      </h4>
                    </div>
                    <div className="space-y-3">
                      {[
                        {
                          label: "Approach",
                          value: "Iterative builder",
                        },
                        {
                          label: "Under pressure",
                          value: "Stays methodical",
                        },
                        {
                          label: "Edge cases",
                          value: "Proactively addressed",
                        },
                        {
                          label: "Time management",
                          value: "Strong",
                        },
                      ].map((row) => (
                        <div
                          className="flex items-center justify-between text-sm"
                          key={row.label}
                        >
                          <span className="text-[var(--muted-foreground)]">
                            {row.label}
                          </span>
                          <span className="rounded-md bg-[var(--secondary)]/60 px-2.5 py-0.5 font-medium text-[var(--foreground)] text-xs">
                            {row.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  PRICING                                                      */}
        {/* ============================================================ */}
        <section className="relative px-6 py-28 md:py-36">
          <div
            aria-hidden
            className="-translate-x-1/2 absolute top-0 left-1/2 h-px w-[60%] bg-gradient-to-r from-transparent via-[var(--border)] to-transparent"
          />

          <div className="mx-auto max-w-6xl">
            <Reveal>
              <p className="mb-4 text-center font-semibold text-[var(--primary)] text-sm uppercase tracking-widest">
                Pricing
              </p>
            </Reveal>
            <Reveal delay={100}>
              <h2 className="mb-4 text-balance text-center font-bold text-3xl text-[var(--foreground)] sm:text-4xl md:text-5xl">
                Simple, transparent pricing
              </h2>
            </Reveal>
            <Reveal delay={150}>
              <p className="mx-auto mb-16 max-w-xl text-center text-[var(--muted-foreground)] text-lg">
                Start small. Scale when you&rsquo;re ready. Every plan includes
                our core AI-augmented assessment engine.
              </p>
            </Reveal>

            <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
              {[
                {
                  name: "Starter",
                  price: "\u00a350",
                  period: "/month",
                  desc: "For small teams starting to modernize hiring.",
                  features: [
                    "10 assessments per month",
                    "Core React challenges",
                    "AI collaboration analysis",
                    "Candidate dossiers",
                    "Email support",
                  ],
                  cta: "Get Started",
                  href: "/login",
                  highlighted: false,
                },
                {
                  name: "Professional",
                  price: "\u00a3200",
                  period: "/month",
                  desc: "For growing engineering teams hiring regularly.",
                  features: [
                    "50 assessments per month",
                    "Advanced challenge library",
                    "Session replay & timeline",
                    "Team analytics dashboard",
                    "Priority support",
                    "Custom branding",
                  ],
                  cta: "Get Started",
                  href: "/login",
                  highlighted: true,
                },
                {
                  name: "Enterprise",
                  price: "Custom",
                  period: "",
                  desc: "For organizations with bespoke requirements.",
                  features: [
                    "Unlimited assessments",
                    "Custom challenge authoring",
                    "SSO / SAML integration",
                    "Dedicated account manager",
                    "SLA guarantee",
                    "On-premise deployment",
                  ],
                  cta: "Contact Us",
                  href: "#",
                  highlighted: false,
                },
              ].map((plan, i) => (
                <Reveal delay={i * 120} key={plan.name}>
                  <div
                    className={`glass-card hover:-translate-y-1 relative flex h-full flex-col rounded-2xl p-8 transition-all duration-300 ${
                      plan.highlighted
                        ? "border-[var(--primary)]/50 shadow-[0_0_40px_rgba(99,102,241,0.12)]"
                        : "hover:border-[var(--primary)]/20"
                    }`}
                  >
                    {plan.highlighted && (
                      <div className="-top-3.5 -translate-x-1/2 absolute left-1/2 rounded-full bg-[var(--primary)] px-4 py-1 font-semibold text-white text-xs uppercase tracking-wide">
                        Recommended
                      </div>
                    )}

                    <h3 className="mb-1 font-semibold text-[var(--foreground)] text-lg">
                      {plan.name}
                    </h3>
                    <p className="mb-6 text-[var(--muted-foreground)] text-sm">
                      {plan.desc}
                    </p>

                    <div className="mb-8">
                      <span className="font-bold font-display text-4xl text-[var(--foreground)]">
                        {plan.price}
                      </span>
                      {plan.period && (
                        <span className="ml-1 text-[var(--muted-foreground)] text-sm">
                          {plan.period}
                        </span>
                      )}
                    </div>

                    <ul className="mb-10 flex-1 space-y-3">
                      {plan.features.map((f) => (
                        <li
                          className="flex items-start gap-2.5 text-[var(--foreground)] text-sm"
                          key={f}
                        >
                          <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    <Link
                      className={`inline-flex items-center justify-center rounded-xl px-6 py-3 font-semibold text-sm transition-all duration-300 ${
                        plan.highlighted
                          ? "bg-[var(--primary)] text-white shadow-[0_0_24px_rgba(99,102,241,0.25)] hover:bg-[var(--primary)]/85 hover:shadow-[0_0_32px_rgba(99,102,241,0.4)]"
                          : "border border-[var(--border)] text-[var(--foreground)] hover:border-[var(--primary)]/40 hover:bg-[var(--secondary)]/50"
                      }`}
                      href={plan.href}
                    >
                      {plan.cta}
                    </Link>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  CTA BAND                                                     */}
        {/* ============================================================ */}
        <section className="relative px-6 py-28 md:py-36">
          <div
            aria-hidden
            className="-translate-x-1/2 absolute top-0 left-1/2 h-px w-[60%] bg-gradient-to-r from-transparent via-[var(--border)] to-transparent"
          />

          <Reveal>
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="mb-6 text-balance font-bold text-3xl text-[var(--foreground)] sm:text-4xl md:text-5xl">
                Ready to hire React developers{" "}
                <span className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] bg-clip-text text-transparent">
                  with confidence?
                </span>
              </h2>
              <p className="mx-auto mb-10 max-w-xl text-[var(--muted-foreground)] text-lg">
                Join engineering teams that have moved beyond leetcode. Your
                first 3 assessments are on us.
              </p>
              <Link
                className="group hover:-translate-y-0.5 relative inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-10 py-4 font-semibold text-base text-white shadow-[0_0_40px_rgba(99,102,241,0.3)] transition-all duration-300 hover:bg-[var(--primary)]/85 hover:shadow-[0_0_60px_rgba(99,102,241,0.5)]"
                href="/login"
              >
                Start Free Trial
                <svg
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  viewBox="0 0 24 24"
                >
                  <line x1="5" x2="19" y1="12" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            </div>
          </Reveal>
        </section>

        {/* ============================================================ */}
        {/*  FOOTER                                                       */}
        {/* ============================================================ */}
        <footer className="border-[var(--border)]/40 border-t px-6 py-12">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--primary)] font-bold font-display text-white text-xs">
                R
              </div>
              <span className="font-display font-semibold text-[var(--foreground)]">
                ReactAssess
              </span>
            </div>

            <div className="flex items-center gap-6 text-[var(--muted-foreground)] text-sm">
              <a
                className="transition-colors hover:text-[var(--foreground)]"
                href="#"
              >
                Privacy Policy
              </a>
              <a
                className="transition-colors hover:text-[var(--foreground)]"
                href="#"
              >
                Terms of Service
              </a>
              <a
                className="transition-colors hover:text-[var(--foreground)]"
                href="mailto:hello@reactassess.com"
              >
                hello@reactassess.com
              </a>
            </div>

            <p className="text-[var(--muted-foreground)] text-xs">
              &copy; {new Date().getFullYear()} ReactAssess. All rights
              reserved.
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}

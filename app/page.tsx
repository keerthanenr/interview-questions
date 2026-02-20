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
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-8"
      } ${className}`}
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
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
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
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
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
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
    </svg>
  );
}

function IconCode({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
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
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function IconGitMerge({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
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
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconArrowDown({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
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
    <div ref={ref} className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-[var(--muted-foreground)]">{label}</span>
        <span className="font-semibold text-[var(--foreground)]">
          {score}/100
        </span>
      </div>
      <div className="h-2 rounded-full bg-[var(--secondary)] overflow-hidden">
        <div
          className="h-full rounded-full score-gradient transition-all duration-1000 ease-out"
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
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
      >
        {/* Large indigo glow top-right */}
        <div className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full bg-[var(--primary)] opacity-[0.04] blur-[120px]" />
        {/* Smaller accent glow bottom-left */}
        <div className="absolute -bottom-60 -left-40 w-[500px] h-[500px] rounded-full bg-[var(--accent)] opacity-[0.03] blur-[100px]" />
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
        <nav className="sticky top-0 z-50 border-b border-[var(--border)]/40 backdrop-blur-xl bg-[var(--background)]/70">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2.5 group"
            >
              <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center text-white font-bold text-sm font-display tracking-tight">
                R
              </div>
              <span className="font-display font-semibold text-lg tracking-tight text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors">
                ReactAssess
              </span>
            </Link>
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="hidden sm:inline-flex text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors px-4 py-2"
              >
                Sign in
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm font-semibold bg-[var(--primary)] text-white px-5 py-2.5 rounded-lg hover:bg-[var(--primary)]/85 transition-all duration-200 shadow-[0_0_24px_rgba(99,102,241,0.25)] hover:shadow-[0_0_32px_rgba(99,102,241,0.4)]"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </nav>

        {/* ============================================================ */}
        {/*  HERO                                                         */}
        {/* ============================================================ */}
        <section className="relative pt-24 pb-32 md:pt-36 md:pb-44 px-6">
          {/* Decorative grid lines */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
              backgroundSize: "80px 80px",
            }}
          />

          <div className="max-w-4xl mx-auto text-center relative">
            {/* Tag line */}
            <div className="animate-slide-up mb-8 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[var(--border)] bg-[var(--secondary)]/60 text-xs font-medium text-[var(--accent)] tracking-wide uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-pulse-warm" />
              AI-Augmented Technical Assessment
            </div>

            {/* Headline */}
            <h1 className="animate-slide-up delay-100 text-4xl sm:text-5xl md:text-6xl lg:text-[4.25rem] font-bold leading-[1.08] tracking-tight text-balance text-[var(--foreground)]">
              Stop testing memory.{" "}
              <span className="relative">
                <span className="bg-gradient-to-r from-[var(--primary)] via-[var(--accent)] to-[var(--primary)] bg-clip-text text-transparent">
                  Start measuring
                </span>
              </span>{" "}
              how developers actually work.
            </h1>

            {/* Sub-headline */}
            <p className="animate-slide-up delay-200 mt-8 text-lg md:text-xl leading-relaxed text-[var(--muted-foreground)] max-w-2xl mx-auto text-balance">
              ReactAssess evaluates React developers using adaptive
              AI-augmented challenges, real code review, and behavioral
              analysis. See how candidates build, think, and
              collaborate&nbsp;&mdash; not just whether they can invert a
              binary tree.
            </p>

            {/* CTAs */}
            <div className="animate-slide-up delay-300 mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/login"
                className="group relative inline-flex items-center gap-2 text-base font-semibold bg-[var(--primary)] text-white px-8 py-3.5 rounded-xl hover:bg-[var(--primary)]/85 transition-all duration-300 shadow-[0_0_32px_rgba(99,102,241,0.3)] hover:shadow-[0_0_48px_rgba(99,102,241,0.5)] hover:-translate-y-0.5"
              >
                Start Free Trial
                <svg
                  className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
              <a
                href="#dossier-preview"
                className="inline-flex items-center gap-2 text-base font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] px-6 py-3.5 rounded-xl border border-[var(--border)] hover:border-[var(--primary)]/40 transition-all duration-300 hover:bg-[var(--secondary)]/50"
              >
                See a sample dossier
                <IconArrowDown className="w-4 h-4" />
              </a>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  PROBLEM SECTION                                              */}
        {/* ============================================================ */}
        <section className="relative py-28 md:py-36 px-6">
          <div className="max-w-6xl mx-auto">
            <Reveal>
              <p className="text-sm font-semibold uppercase tracking-widest text-[var(--primary)] mb-4 text-center">
                The problem
              </p>
            </Reveal>
            <Reveal delay={100}>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center text-balance mb-16 text-[var(--foreground)]">
                Traditional coding assessments{" "}
                <span className="text-[var(--destructive)]">are broken</span>
              </h2>
            </Reveal>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: <IconBrain className="w-8 h-8" />,
                  title: "Tests artificial skills",
                  desc: "Candidates write from memory, not how they actually work. You're measuring trivia recall, not engineering ability.",
                },
                {
                  icon: <IconTarget className="w-8 h-8" />,
                  title: "One-dimensional scoring",
                  desc: "A single pass/fail number tells you nothing about how someone thinks, communicates, or solves problems under real conditions.",
                },
                {
                  icon: <IconEyeOff className="w-8 h-8" />,
                  title: "AI-blind",
                  desc: "Modern developers use AI tools every day. Ignoring that reality means your assessments are testing for a world that no longer exists.",
                },
              ].map((card, i) => (
                <Reveal key={card.title} delay={i * 120}>
                  <div className="glass-card rounded-2xl p-8 h-full group hover:border-[var(--primary)]/30 transition-all duration-300 hover:-translate-y-1">
                    <div className="w-14 h-14 rounded-xl bg-[var(--destructive)]/10 flex items-center justify-center text-[var(--destructive)] mb-6 group-hover:scale-110 transition-transform duration-300">
                      {card.icon}
                    </div>
                    <h3 className="text-xl font-semibold mb-3 text-[var(--foreground)]">
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
        <section className="relative py-28 md:py-36 px-6">
          {/* Subtle section separator */}
          <div
            aria-hidden
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent"
          />

          <div className="max-w-6xl mx-auto">
            <Reveal>
              <p className="text-sm font-semibold uppercase tracking-widest text-[var(--primary)] mb-4 text-center">
                How it works
              </p>
            </Reveal>
            <Reveal delay={100}>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center text-balance mb-6 text-[var(--foreground)]">
                Three phases. One complete picture.
              </h2>
            </Reveal>
            <Reveal delay={150}>
              <p className="text-center text-[var(--muted-foreground)] max-w-2xl mx-auto mb-16 text-lg">
                Each assessment takes candidates through three distinct
                evaluation modes, designed to surface signal no single test
                could capture alone.
              </p>
            </Reveal>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  step: "01",
                  icon: <IconCode className="w-7 h-7" />,
                  title: "Build",
                  desc: "Candidates solve React challenges with an AI assistant. We measure how they collaborate with tools, structure their work, and ship working code.",
                  accent: "var(--primary)",
                },
                {
                  step: "02",
                  icon: <IconZap className="w-7 h-7" />,
                  title: "Explain",
                  desc: "Timed quickfire questions generated from their own code. No cheating possible \u2014 they must understand what they built and articulate why.",
                  accent: "var(--warning)",
                },
                {
                  step: "03",
                  icon: <IconGitMerge className="w-7 h-7" />,
                  title: "Review",
                  desc: "Evaluate a merge request with real bugs, style issues, and architectural decisions. Tests code comprehension and communication skills.",
                  accent: "var(--success)",
                },
              ].map((phase, i) => (
                <Reveal key={phase.step} delay={i * 140}>
                  <div className="relative glass-card rounded-2xl p-8 h-full group hover:border-[var(--primary)]/30 transition-all duration-300 hover:-translate-y-1">
                    {/* Step number watermark */}
                    <span
                      className="absolute top-6 right-8 font-display text-6xl font-bold opacity-[0.06] select-none"
                      style={{ color: phase.accent }}
                    >
                      {phase.step}
                    </span>

                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${phase.accent} 12%, transparent)`,
                        color: phase.accent,
                      }}
                    >
                      {phase.icon}
                    </div>

                    <h3 className="text-2xl font-bold mb-3 text-[var(--foreground)]">
                      {phase.title}
                    </h3>
                    <p className="text-[var(--muted-foreground)] leading-relaxed">
                      {phase.desc}
                    </p>

                    {/* Connecting line between cards (visible on md+) */}
                    {i < 2 && (
                      <div
                        aria-hidden
                        className="hidden md:block absolute top-1/2 -right-4 w-8 h-px bg-[var(--border)]"
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
          id="dossier-preview"
          className="relative py-28 md:py-36 px-6 scroll-mt-20"
        >
          <div
            aria-hidden
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent"
          />

          <div className="max-w-6xl mx-auto">
            <Reveal>
              <p className="text-sm font-semibold uppercase tracking-widest text-[var(--primary)] mb-4 text-center">
                The output
              </p>
            </Reveal>
            <Reveal delay={100}>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center text-balance mb-4 text-[var(--foreground)]">
                Not a score.{" "}
                <span className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] bg-clip-text text-transparent">
                  A complete picture.
                </span>
              </h2>
            </Reveal>
            <Reveal delay={150}>
              <p className="text-center text-[var(--muted-foreground)] max-w-2xl mx-auto mb-16 text-lg">
                Every candidate receives a multi-dimensional dossier that gives
                hiring managers real insight, not just a number.
              </p>
            </Reveal>

            {/* Dossier mockup */}
            <Reveal delay={200}>
              <div className="max-w-4xl mx-auto glass-card rounded-2xl border border-[var(--border)] overflow-hidden">
                {/* Mockup header bar */}
                <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--border)] bg-[var(--secondary)]/30">
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[var(--destructive)]/60" />
                    <span className="w-3 h-3 rounded-full bg-[var(--warning)]/60" />
                    <span className="w-3 h-3 rounded-full bg-[var(--success)]/60" />
                  </div>
                  <span className="text-xs text-[var(--muted-foreground)] font-mono ml-2">
                    candidate-dossier-2026-02.pdf
                  </span>
                </div>

                <div className="p-6 md:p-10 grid md:grid-cols-2 gap-6">
                  {/* Card: Technical Proficiency */}
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--secondary)]/20 p-6 space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)]">
                        <IconCode className="w-5 h-5" />
                      </div>
                      <h4 className="font-semibold text-[var(--foreground)]">
                        Technical Proficiency
                      </h4>
                    </div>
                    <ScoreBar score={82} label="React Architecture" />
                    <ScoreBar score={91} label="State Management" />
                    <ScoreBar score={74} label="TypeScript Usage" />
                  </div>

                  {/* Card: AI Collaboration Profile */}
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--secondary)]/20 p-6">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)]">
                        <IconBrain className="w-5 h-5" />
                      </div>
                      <h4 className="font-semibold text-[var(--foreground)]">
                        AI Collaboration Profile
                      </h4>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[var(--muted-foreground)]">
                          Independence Ratio
                        </span>
                        <span className="text-2xl font-bold font-display text-[var(--accent)]">
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
                      <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                        Uses AI as a thought partner, not a crutch. Consistently
                        modifies suggestions before implementing.
                      </p>
                    </div>
                  </div>

                  {/* Card: Communication Style */}
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--secondary)]/20 p-6">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 rounded-lg bg-[var(--success)]/10 flex items-center justify-center text-[var(--success)]">
                        <svg
                          className="w-5 h-5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.5}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                      </div>
                      <h4 className="font-semibold text-[var(--foreground)]">
                        Communication Style
                      </h4>
                    </div>
                    <div className="space-y-3">
                      {["Clear & concise PR comments", "Explains trade-offs", "Asks clarifying questions"].map(
                        (trait) => (
                          <div
                            key={trait}
                            className="flex items-center gap-2.5 text-sm"
                          >
                            <IconCheck className="w-4 h-4 text-[var(--success)] shrink-0" />
                            <span className="text-[var(--foreground)]">
                              {trait}
                            </span>
                          </div>
                        )
                      )}
                      <div className="mt-4 px-3 py-2.5 rounded-lg bg-[var(--secondary)]/60 text-xs text-[var(--muted-foreground)] leading-relaxed italic">
                        &ldquo;This candidate communicates with the precision of
                        a senior engineer. Review comments are actionable and
                        well-reasoned.&rdquo;
                      </div>
                    </div>
                  </div>

                  {/* Card: Behavioral Insights */}
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--secondary)]/20 p-6">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 rounded-lg bg-[var(--warning)]/10 flex items-center justify-center text-[var(--warning)]">
                        <svg
                          className="w-5 h-5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.5}
                          strokeLinecap="round"
                          strokeLinejoin="round"
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
                          key={row.label}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-[var(--muted-foreground)]">
                            {row.label}
                          </span>
                          <span className="font-medium text-[var(--foreground)] bg-[var(--secondary)]/60 px-2.5 py-0.5 rounded-md text-xs">
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
        <section className="relative py-28 md:py-36 px-6">
          <div
            aria-hidden
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent"
          />

          <div className="max-w-6xl mx-auto">
            <Reveal>
              <p className="text-sm font-semibold uppercase tracking-widest text-[var(--primary)] mb-4 text-center">
                Pricing
              </p>
            </Reveal>
            <Reveal delay={100}>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center text-balance mb-4 text-[var(--foreground)]">
                Simple, transparent pricing
              </h2>
            </Reveal>
            <Reveal delay={150}>
              <p className="text-center text-[var(--muted-foreground)] max-w-xl mx-auto mb-16 text-lg">
                Start small. Scale when you&rsquo;re ready. Every plan
                includes our core AI-augmented assessment engine.
              </p>
            </Reveal>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
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
                <Reveal key={plan.name} delay={i * 120}>
                  <div
                    className={`relative glass-card rounded-2xl p-8 h-full flex flex-col transition-all duration-300 hover:-translate-y-1 ${
                      plan.highlighted
                        ? "border-[var(--primary)]/50 shadow-[0_0_40px_rgba(99,102,241,0.12)]"
                        : "hover:border-[var(--primary)]/20"
                    }`}
                  >
                    {plan.highlighted && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[var(--primary)] text-white text-xs font-semibold tracking-wide uppercase">
                        Recommended
                      </div>
                    )}

                    <h3 className="text-lg font-semibold text-[var(--foreground)] mb-1">
                      {plan.name}
                    </h3>
                    <p className="text-sm text-[var(--muted-foreground)] mb-6">
                      {plan.desc}
                    </p>

                    <div className="mb-8">
                      <span className="text-4xl font-bold font-display text-[var(--foreground)]">
                        {plan.price}
                      </span>
                      {plan.period && (
                        <span className="text-[var(--muted-foreground)] text-sm ml-1">
                          {plan.period}
                        </span>
                      )}
                    </div>

                    <ul className="space-y-3 mb-10 flex-1">
                      {plan.features.map((f) => (
                        <li
                          key={f}
                          className="flex items-start gap-2.5 text-sm text-[var(--foreground)]"
                        >
                          <IconCheck className="w-4 h-4 text-[var(--primary)] shrink-0 mt-0.5" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    <Link
                      href={plan.href}
                      className={`inline-flex items-center justify-center text-sm font-semibold px-6 py-3 rounded-xl transition-all duration-300 ${
                        plan.highlighted
                          ? "bg-[var(--primary)] text-white hover:bg-[var(--primary)]/85 shadow-[0_0_24px_rgba(99,102,241,0.25)] hover:shadow-[0_0_32px_rgba(99,102,241,0.4)]"
                          : "border border-[var(--border)] text-[var(--foreground)] hover:border-[var(--primary)]/40 hover:bg-[var(--secondary)]/50"
                      }`}
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
        <section className="relative py-28 md:py-36 px-6">
          <div
            aria-hidden
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent"
          />

          <Reveal>
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-balance mb-6 text-[var(--foreground)]">
                Ready to hire React developers{" "}
                <span className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] bg-clip-text text-transparent">
                  with confidence?
                </span>
              </h2>
              <p className="text-[var(--muted-foreground)] text-lg mb-10 max-w-xl mx-auto">
                Join engineering teams that have moved beyond leetcode.
                Your first 3 assessments are on us.
              </p>
              <Link
                href="/login"
                className="group relative inline-flex items-center gap-2 text-base font-semibold bg-[var(--primary)] text-white px-10 py-4 rounded-xl hover:bg-[var(--primary)]/85 transition-all duration-300 shadow-[0_0_40px_rgba(99,102,241,0.3)] hover:shadow-[0_0_60px_rgba(99,102,241,0.5)] hover:-translate-y-0.5"
              >
                Start Free Trial
                <svg
                  className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            </div>
          </Reveal>
        </section>

        {/* ============================================================ */}
        {/*  FOOTER                                                       */}
        {/* ============================================================ */}
        <footer className="border-t border-[var(--border)]/40 py-12 px-6">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-[var(--primary)] flex items-center justify-center text-white font-bold text-xs font-display">
                R
              </div>
              <span className="font-display font-semibold text-[var(--foreground)]">
                ReactAssess
              </span>
            </div>

            <div className="flex items-center gap-6 text-sm text-[var(--muted-foreground)]">
              <a
                href="#"
                className="hover:text-[var(--foreground)] transition-colors"
              >
                Privacy Policy
              </a>
              <a
                href="#"
                className="hover:text-[var(--foreground)] transition-colors"
              >
                Terms of Service
              </a>
              <a
                href="mailto:hello@reactassess.com"
                className="hover:text-[var(--foreground)] transition-colors"
              >
                hello@reactassess.com
              </a>
            </div>

            <p className="text-xs text-[var(--muted-foreground)]">
              &copy; {new Date().getFullYear()} ReactAssess. All rights
              reserved.
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}

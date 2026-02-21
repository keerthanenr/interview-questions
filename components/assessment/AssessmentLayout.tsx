"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getTestFileContent } from "@/lib/challenges/tests";
import { cn } from "@/lib/utils";
import { ChallengePanel } from "./ChallengePanel";
import { SandboxIDE } from "./SandboxIDE";
import { ScreenSizeGuard } from "./ScreenSizeGuard";

type Phase = "build" | "explain" | "review";

const phases: { key: Phase; label: string }[] = [
  { key: "build", label: "Build" },
  { key: "explain", label: "Explain" },
  { key: "review", label: "Review" },
];

const MAX_CHALLENGES = 3;

export interface ChallengeData {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  tier: number;
  timeLimit: number;
  starterCode: Record<string, string>;
}

interface AssessmentLayoutProps {
  challenge: ChallengeData;
  currentPhase?: Phase;
  sessionId?: string;
  token?: string;
  startedAt?: string;
  buildPhaseMinutes?: number;
  initialChallengeIndex?: number;
}

export function AssessmentLayout({
  challenge: initialChallenge,
  currentPhase = "build",
  sessionId = "demo-session",
  token,
  startedAt,
  buildPhaseMinutes = 30,
  initialChallengeIndex = 0,
}: AssessmentLayoutProps) {
  const router = useRouter();
  const [currentChallenge, setCurrentChallenge] =
    useState<ChallengeData>(initialChallenge);
  const [challengeIndex, setChallengeIndex] = useState(initialChallengeIndex);
  const [challengeTimeLeft, setChallengeTimeLeft] = useState(
    initialChallenge.timeLimit * 60
  );
  const [overallTimeLeft, setOverallTimeLeft] = useState(() => {
    if (startedAt) {
      const elapsed = Math.floor(
        (Date.now() - new Date(startedAt).getTime()) / 1000
      );
      return Math.max(buildPhaseMinutes * 60 - elapsed, 0);
    }
    return buildPhaseMinutes * 60;
  });
  const [codeState, setCodeState] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const codeStateRef = useRef(codeState);
  codeStateRef.current = codeState;
  const isSubmittingRef = useRef(false);

  const phaseLabel =
    currentPhase.charAt(0).toUpperCase() + currentPhase.slice(1);

  const handleCodeChange = useCallback(
    (files: Record<string, string>) => {
      setCodeState(files);
      try {
        sessionStorage.setItem(
          `ra_code_${sessionId}_${currentChallenge.id}`,
          JSON.stringify(files)
        );
      } catch {}
    },
    [sessionId, currentChallenge.id]
  );

  // Restore code from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(
        `ra_code_${sessionId}_${currentChallenge.id}`
      );
      if (stored) {
        const parsed = JSON.parse(stored);
        setCodeState(parsed);
      }
    } catch {}
  }, [sessionId, currentChallenge.id]);

  // Load next challenge via adaptive engine
  const loadNextChallenge = useCallback(
    async (completed: boolean, timeUsedMs: number) => {
      if (challengeIndex >= MAX_CHALLENGES - 1 || overallTimeLeft <= 0) {
        return true;
      }

      try {
        const res = await fetch("/api/assess/challenge/next", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            challengeId: currentChallenge.id,
            code:
              codeStateRef.current["/workspace/project/src/App.jsx"] ??
              codeStateRef.current["/App.js"] ??
              "",
            completed,
            timeUsedMs,
            timeLimitMs: currentChallenge.timeLimit * 60 * 1000,
          }),
        });

        const data = await res.json();

        if (data.done) {
          return true;
        }

        setShowTransition(true);
        await new Promise((resolve) => setTimeout(resolve, 3000));
        setShowTransition(false);

        const next = data.challenge;
        setCurrentChallenge({
          id: next.id,
          title: next.title,
          description: next.description,
          requirements: next.requirements,
          tier: next.tier,
          timeLimit: next.timeLimit,
          starterCode: next.starterCode,
        });
        setChallengeIndex((prev) => prev + 1);
        setChallengeTimeLeft(next.timeLimit * 60);
        setCodeState({});
        setEditorKey((prev) => prev + 1);

        fetch("/api/assess/challenge/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            challengeId: next.id,
            difficultyTier: next.tier,
          }),
        }).catch(() => {});

        return false;
      } catch {
        toast.error(
          "Failed to load next challenge. Continuing to explain phase."
        );
        return true;
      }
    },
    [challengeIndex, overallTimeLeft, sessionId, currentChallenge]
  );

  // Submit current challenge
  const handleSubmit = useCallback(async () => {
    if (!token || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const challengeStartTime =
        (currentChallenge.timeLimit * 60 - challengeTimeLeft) * 1000;

      if (currentPhase === "build") {
        // Get the main code from sandbox (fallback to local state)
        const mainCode =
          codeStateRef.current["/workspace/project/src/App.jsx"] ??
          codeStateRef.current["/App.js"] ??
          "";

        // Run tests in the sandbox and capture results
        let testResults = null;
        try {
          const sandboxUrl = process.env.NEXT_PUBLIC_SANDBOX_WORKER_URL || "";
          const sandboxSecret =
            process.env.NEXT_PUBLIC_SANDBOX_APP_SECRET || "";
          const testRes = await fetch(`${sandboxUrl}/sandbox/test`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${sandboxSecret}`,
            },
            body: JSON.stringify({ sessionId }),
          });
          if (testRes.ok) {
            const testData = await testRes.json();
            testResults = testData.testResults;
          }
        } catch {
          // Test run failure shouldn't block submission
        }

        await fetch("/api/assess/challenge/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            code: mainCode,
            challengeId: currentChallenge.id,
            testResults,
          }),
        });

        // Log test results as an event
        if (testResults) {
          fetch("/api/assess/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId,
              eventType: "test_run_result",
              payload: {
                challenge_id: currentChallenge.id,
                passed: testResults.passed,
                failed: testResults.failed,
                total: testResults.total,
                tests: testResults.tests,
                timestamp: new Date().toISOString(),
              },
            }),
          }).catch(() => {});
        }

        const isDone = await loadNextChallenge(true, challengeStartTime);

        if (!isDone) {
          isSubmittingRef.current = false;
          setIsSubmitting(false);
          return;
        }
      }

      const nextPhaseMap: Record<Phase, string> = {
        build: "explain",
        explain: "review",
        review: "complete",
      };
      const toPhase = nextPhaseMap[currentPhase];

      await fetch("/api/assess/transition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, fromPhase: currentPhase, toPhase }),
      });

      if (toPhase === "complete") {
        router.push(`/assess/${token}/complete`);
      } else {
        router.push(`/assess/${token}/${toPhase}`);
      }
    } catch {
      toast.error("Failed to submit. Please try again.");
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [
    token,
    currentPhase,
    sessionId,
    currentChallenge,
    challengeTimeLeft,
    loadNextChallenge,
    router,
  ]);

  // Per-challenge countdown timer
  useEffect(() => {
    if (currentPhase !== "build") return;
    const interval = setInterval(() => {
      setChallengeTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          toast("Time's up for this challenge! Auto-submitting...");
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [handleSubmit, currentPhase, editorKey]);

  // Overall build phase countdown
  useEffect(() => {
    if (currentPhase !== "build") return;
    const interval = setInterval(() => {
      setOverallTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          toast("Build phase time is up! Moving to Explain phase...");
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [handleSubmit, currentPhase]);

  // Intercept Ctrl+S / Cmd+S
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        toast.success("Progress saved");
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Warn on browser back/close
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const challengeMinutes = Math.floor(challengeTimeLeft / 60);
  const challengeSeconds = challengeTimeLeft % 60;
  const overallMinutes = Math.floor(overallTimeLeft / 60);
  const overallSeconds = overallTimeLeft % 60;

  // Transition screen between challenges
  if (showTransition) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background">
        <div className="animate-scale-in space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-success/15">
            <svg
              className="h-8 w-8 text-success"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                d="M4.5 12.75l6 6 9-13.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h2 className="font-bold font-display text-xl">Nice work!</h2>
          <p className="text-muted-foreground">
            Loading your next challenge...
          </p>
          <div className="flex justify-center gap-1">
            <div className="h-2 w-2 animate-bounce rounded-full bg-primary" />
            <div className="h-2 w-2 animate-bounce rounded-full bg-primary delay-100" />
            <div className="h-2 w-2 animate-bounce rounded-full bg-primary delay-200" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <ScreenSizeGuard>
      <div className="flex h-screen flex-col overflow-hidden bg-background">
        {/* Header */}
        <header className="flex h-12 flex-shrink-0 items-center gap-4 border-b bg-card/80 px-4 backdrop-blur-md">
          <h2 className="font-display font-semibold text-sm">
            {phaseLabel} Phase
          </h2>

          {/* Phase progress */}
          <div className="ml-2 flex items-center gap-1">
            {phases.map((phase, i) => (
              <div className="flex items-center" key={phase.key}>
                <div
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium text-xs transition-colors",
                    phase.key === currentPhase
                      ? "bg-primary/15 text-primary"
                      : phases.indexOf(
                            phases.find((p) => p.key === currentPhase)!
                          ) > i
                        ? "text-success"
                        : "text-muted-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded-full border font-bold text-[10px]",
                      phase.key === currentPhase
                        ? "border-primary bg-primary text-primary-foreground"
                        : phases.indexOf(
                              phases.find((p) => p.key === currentPhase)!
                            ) > i
                          ? "border-success bg-success text-success-foreground"
                          : "border-muted-foreground/30"
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className="hidden sm:inline">{phase.label}</span>
                </div>
                {i < phases.length - 1 && (
                  <div className="mx-0.5 h-px w-4 bg-border" />
                )}
              </div>
            ))}
          </div>

          {/* Challenge progress (build phase only) */}
          {currentPhase === "build" && (
            <div className="ml-2 flex items-center gap-1.5 text-muted-foreground text-xs">
              <span className="hidden md:inline">Challenge</span>
              <span className="font-medium font-mono text-foreground">
                {challengeIndex + 1} of {MAX_CHALLENGES}
              </span>
            </div>
          )}

          <div className="flex-1" />

          {/* Timers */}
          <div className="flex items-center gap-3 font-mono text-sm">
            {currentPhase === "build" && (
              <>
                <div
                  className="flex items-center gap-1.5"
                  title="Challenge time remaining"
                >
                  <svg
                    className="h-3.5 w-3.5 text-muted-foreground"
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
                  <span
                    className={cn(
                      "text-xs",
                      challengeTimeLeft <= 120
                        ? "text-destructive"
                        : "text-foreground"
                    )}
                  >
                    {String(challengeMinutes).padStart(2, "0")}:
                    {String(challengeSeconds).padStart(2, "0")}
                  </span>
                </div>
                <div className="h-4 w-px bg-border" />
              </>
            )}
            <div
              className="flex items-center gap-1.5"
              title="Overall time remaining"
            >
              <svg
                className="h-4 w-4 text-muted-foreground"
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
              <span
                className={cn(
                  overallTimeLeft <= 300
                    ? "text-destructive"
                    : "text-foreground"
                )}
              >
                {String(overallMinutes).padStart(2, "0")}:
                {String(overallSeconds).padStart(2, "0")}
              </span>
            </div>
          </div>
        </header>

        {/* Two-panel layout */}
        <div className="flex flex-1 overflow-hidden">
          <div className="w-[22%] min-w-[260px] flex-shrink-0 overflow-y-auto border-r">
            <ChallengePanel
              challengeNumber={challengeIndex + 1}
              description={currentChallenge.description}
              difficulty={currentChallenge.tier as 1 | 2 | 3 | 4 | 5}
              requirements={currentChallenge.requirements}
              timeLimit={currentChallenge.timeLimit}
              title={currentChallenge.title}
              totalChallenges={MAX_CHALLENGES}
            />
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <SandboxIDE
              challengeId={currentChallenge.id}
              key={editorKey}
              onCodeChange={handleCodeChange}
              readmeContent={`# ${currentChallenge.title}\n\n${currentChallenge.description.replace(/<[^>]*>/g, "")}\n\n## Requirements\n\n${currentChallenge.requirements.map((r) => `- ${r}`).join("\n")}\n\n## Testing\n\nRun \`npm test\` in the terminal to check your solution.`}
              sessionId={sessionId}
              starterCode={currentChallenge.starterCode}
              testFileContent={getTestFileContent(currentChallenge.id)}
            />
          </div>
        </div>

        {/* Footer */}
        <footer className="flex h-12 flex-shrink-0 items-center justify-between border-t bg-card/80 px-4 backdrop-blur-md">
          <p className="text-muted-foreground text-xs">
            Your progress is saved automatically
          </p>
          <Button disabled={isSubmitting} onClick={handleSubmit} size="sm">
            {isSubmitting
              ? "Submitting..."
              : challengeIndex < MAX_CHALLENGES - 1
                ? "Submit Challenge"
                : "Submit & Continue"}
          </Button>
        </footer>
      </div>
    </ScreenSizeGuard>
  );
}

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChallengePanel } from "./ChallengePanel";
import { CodeEditorPanel } from "./CodeEditorPanel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
    initialChallenge.timeLimit * 60,
  );
  const [overallTimeLeft, setOverallTimeLeft] = useState(() => {
    if (startedAt) {
      const elapsed = Math.floor(
        (Date.now() - new Date(startedAt).getTime()) / 1000,
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
          JSON.stringify(files),
        );
      } catch {}
    },
    [sessionId, currentChallenge.id],
  );

  // Restore code from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(
        `ra_code_${sessionId}_${currentChallenge.id}`,
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
            code: codeStateRef.current["/App.js"] ?? "",
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
          "Failed to load next challenge. Continuing to explain phase.",
        );
        return true;
      }
    },
    [challengeIndex, overallTimeLeft, sessionId, currentChallenge],
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
        const mainCode = codeStateRef.current["/App.js"] ?? "";

        await fetch("/api/assess/challenge/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            code: mainCode,
            challengeId: currentChallenge.id,
          }),
        });

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
      <div className="h-screen flex flex-col items-center justify-center bg-background">
        <div className="animate-scale-in text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-success/15 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-success"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
          </div>
          <h2 className="text-xl font-display font-bold">Nice work!</h2>
          <p className="text-muted-foreground">
            Loading your next challenge...
          </p>
          <div className="flex gap-1 justify-center">
            <div className="w-2 h-2 rounded-full bg-primary animate-bounce" />
            <div className="w-2 h-2 rounded-full bg-primary animate-bounce delay-100" />
            <div className="w-2 h-2 rounded-full bg-primary animate-bounce delay-200" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <ScreenSizeGuard>
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="h-12 flex-shrink-0 border-b bg-card/80 backdrop-blur-md flex items-center px-4 gap-4">
        <h2 className="font-display font-semibold text-sm">
          {phaseLabel} Phase
        </h2>

        {/* Phase progress */}
        <div className="flex items-center gap-1 ml-2">
          {phases.map((phase, i) => (
            <div key={phase.key} className="flex items-center">
              <div
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                  phase.key === currentPhase
                    ? "bg-primary/15 text-primary"
                    : phases.indexOf(
                          phases.find((p) => p.key === currentPhase)!,
                        ) > i
                      ? "text-success"
                      : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold border",
                    phase.key === currentPhase
                      ? "border-primary bg-primary text-primary-foreground"
                      : phases.indexOf(
                            phases.find((p) => p.key === currentPhase)!,
                          ) > i
                        ? "border-success bg-success text-success-foreground"
                        : "border-muted-foreground/30",
                  )}
                >
                  {i + 1}
                </span>
                <span className="hidden sm:inline">{phase.label}</span>
              </div>
              {i < phases.length - 1 && (
                <div className="w-4 h-px bg-border mx-0.5" />
              )}
            </div>
          ))}
        </div>

        {/* Challenge progress (build phase only) */}
        {currentPhase === "build" && (
          <div className="flex items-center gap-1.5 ml-2 text-xs text-muted-foreground">
            <span className="hidden md:inline">Challenge</span>
            <span className="font-mono font-medium text-foreground">
              {challengeIndex + 1} of {MAX_CHALLENGES}
            </span>
          </div>
        )}

        <div className="flex-1" />

        {/* Timers */}
        <div className="flex items-center gap-3 text-sm font-mono">
          {currentPhase === "build" && (
            <>
              <div
                className="flex items-center gap-1.5"
                title="Challenge time remaining"
              >
                <svg
                  className="w-3.5 h-3.5 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span
                  className={cn(
                    "text-xs",
                    challengeTimeLeft <= 120
                      ? "text-destructive"
                      : "text-foreground",
                  )}
                >
                  {String(challengeMinutes).padStart(2, "0")}:
                  {String(challengeSeconds).padStart(2, "0")}
                </span>
              </div>
              <div className="w-px h-4 bg-border" />
            </>
          )}
          <div
            className="flex items-center gap-1.5"
            title="Overall time remaining"
          >
            <svg
              className="w-4 h-4 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span
              className={cn(
                overallTimeLeft <= 300
                  ? "text-destructive"
                  : "text-foreground",
              )}
            >
              {String(overallMinutes).padStart(2, "0")}:
              {String(overallSeconds).padStart(2, "0")}
            </span>
          </div>
        </div>
      </header>

      {/* Two-panel layout */}
      <div className="flex-1 flex overflow-hidden">
        <div className="w-[22%] min-w-[260px] border-r overflow-y-auto flex-shrink-0">
          <ChallengePanel
            title={currentChallenge.title}
            description={currentChallenge.description}
            requirements={currentChallenge.requirements}
            difficulty={currentChallenge.tier as 1 | 2 | 3 | 4 | 5}
            timeLimit={currentChallenge.timeLimit}
            challengeNumber={challengeIndex + 1}
            totalChallenges={MAX_CHALLENGES}
          />
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">
          <CodeEditorPanel
            key={editorKey}
            starterCode={currentChallenge.starterCode}
            onCodeChange={handleCodeChange}
            sessionId={sessionId}
          />
        </div>
      </div>

      {/* Footer */}
      <footer className="h-12 flex-shrink-0 border-t bg-card/80 backdrop-blur-md flex items-center justify-between px-4">
        <p className="text-xs text-muted-foreground">
          Your progress is saved automatically
        </p>
        <Button size="sm" disabled={isSubmitting} onClick={handleSubmit}>
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

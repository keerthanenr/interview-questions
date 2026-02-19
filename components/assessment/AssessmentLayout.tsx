"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { ChallengePanel } from "./ChallengePanel";
import { CodeEditorPanel } from "./CodeEditorPanel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Phase = "build" | "explain" | "review";

const phases: { key: Phase; label: string }[] = [
  { key: "build", label: "Build" },
  { key: "explain", label: "Explain" },
  { key: "review", label: "Review" },
];

interface AssessmentLayoutProps {
  challenge: {
    title: string;
    description: string;
    requirements: string[];
    difficulty: 1 | 2 | 3 | 4 | 5;
    timeLimit: number;
  };
  starterCode?: Record<string, string>;
  currentPhase?: Phase;
  sessionId?: string;
}

export function AssessmentLayout({
  challenge,
  starterCode,
  currentPhase = "build",
  sessionId = "demo-session",
}: AssessmentLayoutProps) {
  const [timeLeft, setTimeLeft] = useState(challenge.timeLimit * 60);
  const [codeState, setCodeState] = useState<Record<string, string>>({});
  const codeStateRef = useRef(codeState);
  codeStateRef.current = codeState;

  const phaseLabel =
    currentPhase.charAt(0).toUpperCase() + currentPhase.slice(1);

  const handleCodeChange = useCallback(
    (files: Record<string, string>) => {
      setCodeState(files);
    },
    [],
  );

  // Intercept Ctrl+S / Cmd+S — save progress instead of browser "Save Page"
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        console.log({
          event_type: "progress_saved",
          payload: {
            files: codeStateRef.current,
            timestamp: new Date().toISOString(),
          },
        });
        toast.success("Progress saved");
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="h-12 flex-shrink-0 border-b bg-card/80 backdrop-blur-md flex items-center px-4 gap-4">
        <h2 className="font-display font-semibold text-sm">
          {phaseLabel} Phase
        </h2>

        {/* Phase progress indicator */}
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

        <div className="flex-1" />

        {/* Timer */}
        <div className="flex items-center gap-2 text-sm font-mono">
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
              timeLeft <= 300 ? "text-destructive" : "text-foreground",
            )}
          >
            {String(minutes).padStart(2, "0")}:
            {String(seconds).padStart(2, "0")}
          </span>
        </div>
      </header>

      {/* Two-panel layout: Challenge | Editor+Tabs */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel - Challenge Description */}
        <div className="w-[22%] min-w-[260px] border-r overflow-y-auto flex-shrink-0">
          <ChallengePanel
            title={challenge.title}
            description={challenge.description}
            requirements={challenge.requirements}
            difficulty={challenge.difficulty}
            timeLimit={challenge.timeLimit}
          />
        </div>

        {/* Right panel - Code Editor with Preview/Console/Claude tabs */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <CodeEditorPanel
            starterCode={starterCode}
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
        <Button disabled size="sm">
          Submit & Continue
        </Button>
      </footer>
    </div>
  );
}

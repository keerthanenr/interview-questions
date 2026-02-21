"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { QuickfireQuestion } from "@/lib/claude/client";

type RoundState =
  | "INTRO"
  | "QUESTION_ACTIVE"
  | "QUESTION_TRANSITION"
  | "ROUND_COMPLETE";

interface QuickfireRoundProps {
  questions: QuickfireQuestion[];
  sessionId: string;
  token: string;
}

export function QuickfireRound({
  questions,
  sessionId,
  token,
}: QuickfireRoundProps) {
  const router = useRouter();
  const [roundState, setRoundState] = useState<RoundState>("INTRO");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [introCountdown, setIntroCountdown] = useState(5);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [flashState, setFlashState] = useState<
    "none" | "correct" | "incorrect"
  >("none");
  const [showTimesUp, setShowTimesUp] = useState(false);
  const [answers, setAnswers] = useState<
    Record<
      number,
      { response: string; isCorrect: boolean | null; timeMs: number }
    >
  >({});
  const [isAdvancing, setIsAdvancing] = useState(false);

  const questionStartRef = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const submittedRef = useRef(false);

  const currentQuestion = questions[currentIndex];

  // INTRO countdown
  useEffect(() => {
    if (roundState !== "INTRO") return;
    const interval = setInterval(() => {
      setIntroCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setRoundState("QUESTION_ACTIVE");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [roundState]);

  // Question timer
  useEffect(() => {
    if (roundState !== "QUESTION_ACTIVE" || !currentQuestion) return;

    submittedRef.current = false;
    questionStartRef.current = Date.now();
    setTimeRemaining(currentQuestion.timeLimitSeconds);
    setSelectedAnswer(null);
    setTextAnswer("");
    setFlashState("none");
    setShowTimesUp(false);

    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - questionStartRef.current) / 1000;
      const remaining = currentQuestion.timeLimitSeconds - elapsed;

      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        setTimeRemaining(0);
        // Show "Time's up" briefly, then auto-submit
        if (!submittedRef.current) {
          submittedRef.current = true;
          setShowTimesUp(true);
          setTimeout(() => {
            setShowTimesUp(false);
            handleSubmitAnswer(null);
          }, 800);
        }
      } else {
        setTimeRemaining(remaining);
      }
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundState, currentIndex]);

  // Keyboard shortcuts for MC
  useEffect(() => {
    if (roundState !== "QUESTION_ACTIVE") return;
    if (!currentQuestion || currentQuestion.type !== "multiple_choice") return;

    function handleKeyDown(e: KeyboardEvent) {
      const keyMap: Record<string, string> = {
        "1": "a",
        "2": "b",
        "3": "c",
        "4": "d",
        a: "a",
        b: "b",
        c: "c",
        d: "d",
      };
      const answer = keyMap[e.key.toLowerCase()];
      if (answer && !submittedRef.current) {
        handleMCSelect(answer);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundState, currentIndex]);

  // Cmd+Enter for text submission
  useEffect(() => {
    if (roundState !== "QUESTION_ACTIVE") return;
    if (!currentQuestion || currentQuestion.type === "multiple_choice") return;

    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (!submittedRef.current) {
          handleSubmitAnswer(textAnswer);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundState, currentIndex, textAnswer]);

  const saveAnswer = useCallback(
    (response: string | null, isCorrect: boolean | null) => {
      const timeMs = Date.now() - questionStartRef.current;

      setAnswers((prev) => ({
        ...prev,
        [currentIndex]: {
          response: response ?? "",
          isCorrect,
          timeMs,
        },
      }));

      // Fire-and-forget POST
      fetch("/api/assess/quickfire/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          questionIndex: currentIndex,
          response: response ?? "",
          responseTimeMs: timeMs,
          isCorrect,
        }),
      }).catch(() => {});
    },
    [currentIndex, sessionId]
  );

  const advanceToNext = useCallback(() => {
    if (isAdvancing) return;
    setIsAdvancing(true);

    if (currentIndex < questions.length - 1) {
      setRoundState("QUESTION_TRANSITION");
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
        setRoundState("QUESTION_ACTIVE");
        setIsAdvancing(false);
      }, 1000);
    } else {
      setRoundState("ROUND_COMPLETE");
      setIsAdvancing(false);
    }
  }, [currentIndex, questions.length, isAdvancing]);

  const handleSubmitAnswer = useCallback(
    (response: string | null) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      if (timerRef.current) clearInterval(timerRef.current);

      if (currentQuestion?.type === "multiple_choice") {
        const isCorrect = response === currentQuestion.correctAnswer;
        saveAnswer(response, isCorrect);
      } else {
        // Free text — isCorrect will be graded later
        saveAnswer(response, null);
      }

      advanceToNext();
    },
    [currentQuestion, saveAnswer, advanceToNext]
  );

  const handleMCSelect = useCallback(
    (option: string) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      if (timerRef.current) clearInterval(timerRef.current);

      setSelectedAnswer(option);
      const isCorrect = option === currentQuestion?.correctAnswer;
      setFlashState(isCorrect ? "correct" : "incorrect");
      saveAnswer(option, isCorrect);

      // Flash for 200ms, then advance
      setTimeout(() => {
        setFlashState("none");
        advanceToNext();
      }, 200);
    },
    [currentQuestion, saveAnswer, advanceToNext]
  );

  const handleTextSubmit = useCallback(() => {
    if (!submittedRef.current) {
      handleSubmitAnswer(textAnswer);
    }
  }, [textAnswer, handleSubmitAnswer]);

  async function handleContinueToReview() {
    // Trigger async grading (fire-and-forget)
    fetch("/api/assess/quickfire/grade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    }).catch(() => {});

    // Transition phase
    await fetch("/api/assess/transition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        fromPhase: "explain",
        toPhase: "review",
      }),
    });

    router.push(`/assess/${token}/review`);
  }

  // Calculate MC accuracy for the complete screen
  const mcQuestions = questions.filter((q) => q.type === "multiple_choice");
  const mcCorrect = mcQuestions.filter((_, i) => {
    const qIdx = questions.indexOf(mcQuestions[i]);
    return answers[qIdx]?.isCorrect === true;
  }).length;

  // INTRO screen
  if (roundState === "INTRO") {
    return (
      <main className="mesh-gradient flex min-h-dvh items-center justify-center px-4">
        <div className="w-full max-w-lg animate-slide-up text-center">
          <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
            <svg
              className="h-10 w-10 text-primary"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path
                d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <h1 className="mb-3 font-bold font-display text-3xl tracking-tight sm:text-4xl">
            Quickfire Round
          </h1>
          <p className="mx-auto mb-8 max-w-md text-muted-foreground text-sm">
            You&apos;ll answer {questions.length} questions about the code you
            just wrote. Each question is timed — answer as quickly and
            accurately as you can.
          </p>

          <div className="glass-card mb-8 inline-block rounded-xl p-6">
            <div className="font-bold font-display text-6xl text-primary tabular-nums">
              {introCountdown <= 3 ? introCountdown : ""}
            </div>
            {introCountdown > 3 && (
              <p className="text-muted-foreground text-sm">
                Starting in {introCountdown}s...
              </p>
            )}
            {introCountdown <= 3 && introCountdown > 0 && (
              <p className="mt-1 text-muted-foreground text-xs">Get ready</p>
            )}
          </div>
        </div>
      </main>
    );
  }

  // QUESTION TRANSITION screen
  if (roundState === "QUESTION_TRANSITION") {
    return (
      <main className="mesh-gradient flex min-h-dvh items-center justify-center px-4">
        <div className="animate-scale-in text-center">
          <p className="mb-2 text-muted-foreground text-sm">Next up</p>
          <h2 className="font-bold font-display text-2xl">
            Question {currentIndex + 2} of {questions.length}
          </h2>
          <div className="mt-4 flex justify-center gap-1.5">
            {questions.map((_, i) => (
              <div
                className={`h-2.5 w-2.5 rounded-full transition-colors ${
                  i <= currentIndex
                    ? "bg-primary"
                    : i === currentIndex + 1
                      ? "bg-primary/50"
                      : "bg-muted"
                }`}
                key={i}
              />
            ))}
          </div>
        </div>
      </main>
    );
  }

  // ROUND COMPLETE screen
  if (roundState === "ROUND_COMPLETE") {
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
            Quickfire Complete!
          </h1>

          <div className="glass-card mb-8 rounded-xl p-6">
            <p className="mb-2 text-muted-foreground text-sm">
              Multiple Choice Accuracy
            </p>
            <p className="font-bold font-display text-3xl">
              {mcCorrect}
              <span className="text-lg text-muted-foreground">
                /{mcQuestions.length}
              </span>
            </p>
            <p className="mt-2 text-muted-foreground text-xs">
              Free-text responses will be reviewed separately
            </p>
          </div>

          <button
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground text-sm transition-colors hover:bg-primary/90"
            onClick={handleContinueToReview}
            type="button"
          >
            Continue to Code Review
            <svg
              className="h-4 w-4"
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
          </button>
        </div>
      </main>
    );
  }

  // QUESTION ACTIVE screen
  if (!currentQuestion) return null;

  const isMC = currentQuestion.type === "multiple_choice";
  const timerPercent = (timeRemaining / currentQuestion.timeLimitSeconds) * 100;
  const timerUrgent = timeRemaining <= 3;

  const typeLabels: Record<string, string> = {
    multiple_choice: "Multiple Choice",
    free_text: "Short Answer",
    consequence_prediction: "Consequence Prediction",
    bug_identification: "Bug Identification",
  };

  const difficultyColors: Record<number, string> = {
    1: "bg-success/15 text-success border-success/20",
    2: "bg-warning/15 text-warning border-warning/20",
    3: "bg-destructive/15 text-destructive border-destructive/20",
  };

  return (
    <main className="mesh-gradient relative flex min-h-dvh flex-col">
      {/* Time's up overlay */}
      {showTimesUp && (
        <div className="absolute inset-0 z-50 flex animate-scale-in items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/15">
              <svg
                className="h-8 w-8 text-destructive"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h2 className="font-bold font-display text-2xl text-destructive">
              Time&apos;s Up!
            </h2>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="border-border border-b bg-card/50 px-6 py-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-medium text-sm">
              Question {currentIndex + 1}/{questions.length}
            </span>
            <Badge className="text-xs" variant="outline">
              {typeLabels[currentQuestion.type]}
            </Badge>
            <Badge
              className={difficultyColors[currentQuestion.difficulty] ?? ""}
              variant="outline"
            >
              Lvl {currentQuestion.difficulty}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`font-bold font-mono text-sm tabular-nums ${
                timerUrgent ? "text-destructive" : "text-foreground"
              }`}
            >
              {Math.ceil(timeRemaining)}s
            </span>
          </div>
        </div>

        {/* Timer bar */}
        <div className="mx-auto mt-2 max-w-3xl">
          <div className="h-1 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all duration-100 ease-linear ${
                timerUrgent ? "bg-destructive" : "bg-primary"
              }`}
              style={{ width: `${Math.max(0, timerPercent)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question content */}
      <div className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-3xl animate-scale-in">
          {/* Question text */}
          <h2 className="mb-6 font-semibold text-xl leading-snug sm:text-2xl">
            {currentQuestion.question}
          </h2>

          {/* Code reference */}
          {currentQuestion.codeReference && (
            <div className="glass-card mb-6 overflow-x-auto rounded-lg p-4">
              <pre className="whitespace-pre-wrap font-mono text-foreground/90 text-sm">
                {currentQuestion.codeReference}
              </pre>
            </div>
          )}

          {/* MC options */}
          {isMC && currentQuestion.options && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(["a", "b", "c", "d"] as const).map((key, idx) => {
                const option = currentQuestion.options?.[key];
                if (!option) return null;

                const isSelected = selectedAnswer === key;
                const isCorrectAnswer = key === currentQuestion.correctAnswer;

                let bgClass = "glass-card hover:bg-secondary/80";
                if (flashState !== "none" && isSelected) {
                  bgClass =
                    flashState === "correct"
                      ? "bg-success/20 border-success/40"
                      : "bg-destructive/20 border-destructive/40";
                } else if (flashState !== "none" && isCorrectAnswer) {
                  bgClass = "bg-success/20 border-success/40";
                }

                return (
                  <button
                    className={`${bgClass} flex items-start gap-3 rounded-xl border border-border p-4 text-left transition-all`}
                    disabled={submittedRef.current}
                    key={key}
                    onClick={() => handleMCSelect(key)}
                    type="button"
                  >
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-muted font-bold text-xs">
                      {idx + 1}
                    </span>
                    <span className="text-sm leading-relaxed">{option}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Free text / consequence / bug input */}
          {!isMC && (
            <div className="space-y-3">
              <textarea
                autoFocus
                className="min-h-[120px] w-full resize-none rounded-xl border border-border bg-input p-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                onChange={(e) => setTextAnswer(e.target.value)}
                placeholder="Type your answer here..."
                value={textAnswer}
              />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">
                  {textAnswer.length} characters
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">
                    {navigator.platform?.includes("Mac") ? "\u2318" : "Ctrl"}
                    +Enter to submit
                  </span>
                  <button
                    className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground text-sm transition-colors hover:bg-primary/90"
                    onClick={handleTextSubmit}
                    type="button"
                  >
                    Submit
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Keyboard hint for MC */}
          {isMC && (
            <p className="mt-4 text-center text-muted-foreground text-xs">
              Press 1-4 or A-D to select an answer
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

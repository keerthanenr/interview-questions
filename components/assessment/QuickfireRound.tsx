"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
    Record<number, { response: string; isCorrect: boolean | null; timeMs: number }>
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
    if (
      !currentQuestion ||
      currentQuestion.type === "multiple_choice"
    )
      return;

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
    [currentIndex, sessionId],
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
    [currentQuestion, saveAnswer, advanceToNext],
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
    [currentQuestion, saveAnswer, advanceToNext],
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
  const mcCorrect = mcQuestions.filter(
    (_, i) => {
      const qIdx = questions.indexOf(mcQuestions[i]);
      return answers[qIdx]?.isCorrect === true;
    },
  ).length;

  // INTRO screen
  if (roundState === "INTRO") {
    return (
      <main className="mesh-gradient min-h-dvh flex items-center justify-center px-4">
        <div className="w-full max-w-lg text-center animate-slide-up">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-8">
            <svg
              className="w-10 h-10 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
              />
            </svg>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3 font-display">
            Quickfire Round
          </h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto mb-8">
            You&apos;ll answer {questions.length} questions about the code you
            just wrote. Each question is timed — answer as quickly and
            accurately as you can.
          </p>

          <div className="glass-card rounded-xl p-6 mb-8 inline-block">
            <div className="text-6xl font-bold font-display text-primary tabular-nums">
              {introCountdown <= 3 ? introCountdown : ""}
            </div>
            {introCountdown > 3 && (
              <p className="text-sm text-muted-foreground">
                Starting in {introCountdown}s...
              </p>
            )}
            {introCountdown <= 3 && introCountdown > 0 && (
              <p className="text-xs text-muted-foreground mt-1">Get ready</p>
            )}
          </div>
        </div>
      </main>
    );
  }

  // QUESTION TRANSITION screen
  if (roundState === "QUESTION_TRANSITION") {
    return (
      <main className="mesh-gradient min-h-dvh flex items-center justify-center px-4">
        <div className="text-center animate-scale-in">
          <p className="text-muted-foreground text-sm mb-2">Next up</p>
          <h2 className="text-2xl font-bold font-display">
            Question {currentIndex + 2} of {questions.length}
          </h2>
          <div className="flex justify-center gap-1.5 mt-4">
            {questions.map((_, i) => (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  i <= currentIndex
                    ? "bg-primary"
                    : i === currentIndex + 1
                      ? "bg-primary/50"
                      : "bg-muted"
                }`}
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
            Quickfire Complete!
          </h1>

          <div className="glass-card rounded-xl p-6 mb-8">
            <p className="text-sm text-muted-foreground mb-2">
              Multiple Choice Accuracy
            </p>
            <p className="text-3xl font-bold font-display">
              {mcCorrect}
              <span className="text-muted-foreground text-lg">
                /{mcQuestions.length}
              </span>
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Free-text responses will be reviewed separately
            </p>
          </div>

          <button
            type="button"
            onClick={handleContinueToReview}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors"
          >
            Continue to Code Review
            <svg
              className="w-4 h-4"
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
          </button>
        </div>
      </main>
    );
  }

  // QUESTION ACTIVE screen
  if (!currentQuestion) return null;

  const isMC = currentQuestion.type === "multiple_choice";
  const timerPercent =
    (timeRemaining / currentQuestion.timeLimitSeconds) * 100;
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
    <main className="mesh-gradient min-h-dvh flex flex-col relative">
      {/* Time's up overlay */}
      {showTimesUp && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-scale-in">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-destructive/15 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-destructive"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold font-display text-destructive">
              Time&apos;s Up!
            </h2>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm px-6 py-3">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">
              Question {currentIndex + 1}/{questions.length}
            </span>
            <Badge variant="outline" className="text-xs">
              {typeLabels[currentQuestion.type]}
            </Badge>
            <Badge
              variant="outline"
              className={
                difficultyColors[currentQuestion.difficulty] ?? ""
              }
            >
              Lvl {currentQuestion.difficulty}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`text-sm font-mono font-bold tabular-nums ${
                timerUrgent ? "text-destructive" : "text-foreground"
              }`}
            >
              {Math.ceil(timeRemaining)}s
            </span>
          </div>
        </div>

        {/* Timer bar */}
        <div className="max-w-3xl mx-auto mt-2">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
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
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-3xl animate-scale-in">
          {/* Question text */}
          <h2 className="text-xl sm:text-2xl font-semibold leading-snug mb-6">
            {currentQuestion.question}
          </h2>

          {/* Code reference */}
          {currentQuestion.codeReference && (
            <div className="glass-card rounded-lg p-4 mb-6 overflow-x-auto">
              <pre className="text-sm font-mono text-foreground/90 whitespace-pre-wrap">
                {currentQuestion.codeReference}
              </pre>
            </div>
          )}

          {/* MC options */}
          {isMC && currentQuestion.options && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(["a", "b", "c", "d"] as const).map((key, idx) => {
                const option = currentQuestion.options?.[key];
                if (!option) return null;

                const isSelected = selectedAnswer === key;
                const isCorrectAnswer =
                  key === currentQuestion.correctAnswer;

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
                    key={key}
                    type="button"
                    onClick={() => handleMCSelect(key)}
                    disabled={submittedRef.current}
                    className={`${bgClass} rounded-xl p-4 text-left transition-all border border-border flex items-start gap-3`}
                  >
                    <span className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-xs font-bold flex-shrink-0">
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
                value={textAnswer}
                onChange={(e) => setTextAnswer(e.target.value)}
                placeholder="Type your answer here..."
                className="w-full min-h-[120px] bg-input border border-border rounded-xl p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                autoFocus
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {textAnswer.length} characters
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {navigator.platform?.includes("Mac")
                      ? "\u2318"
                      : "Ctrl"}
                    +Enter to submit
                  </span>
                  <button
                    type="button"
                    onClick={handleTextSubmit}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    Submit
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Keyboard hint for MC */}
          {isMC && (
            <p className="text-xs text-muted-foreground mt-4 text-center">
              Press 1-4 or A-D to select an answer
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

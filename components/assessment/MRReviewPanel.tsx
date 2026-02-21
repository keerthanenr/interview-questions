"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import ReactDiffViewer, { DiffMethod } from "react-diff-viewer-continued";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { ScreenSizeGuard } from "./ScreenSizeGuard";

interface ReviewFile {
  path: string;
  language: string;
  oldCode: string;
  newCode: string;
}

interface SeededIssue {
  id: string;
  category: string;
  file: string;
  lineRange: [number, number];
  description: string;
  severity: string;
}

interface ReviewScenario {
  id: string;
  title: string;
  description: string;
  author: string;
  files: ReviewFile[];
  seededIssues: SeededIssue[];
}

interface InlineComment {
  id: string;
  filePath: string;
  lineNumber: number;
  text: string;
}

interface MRReviewPanelProps {
  scenario: ReviewScenario;
  sessionId: string;
  token: string;
}

export function MRReviewPanel({
  scenario,
  sessionId,
  token,
}: MRReviewPanelProps) {
  const router = useRouter();
  const [summary, setSummary] = useState(() => {
    try {
      return sessionStorage.getItem(`ra_review_summary_${sessionId}`) ?? "";
    } catch {
      return "";
    }
  });
  const [comments, setComments] = useState<InlineComment[]>(() => {
    try {
      const stored = sessionStorage.getItem(`ra_review_comments_${sessionId}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [activeCommentLine, setActiveCommentLine] = useState<number | null>(
    null
  );
  const [commentDraft, setCommentDraft] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Persist summary and comments to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(`ra_review_summary_${sessionId}`, summary);
    } catch {}
  }, [summary, sessionId]);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        `ra_review_comments_${sessionId}`,
        JSON.stringify(comments)
      );
    } catch {}
  }, [comments, sessionId]);

  const file = scenario.files[0];

  const handleLineClick = useCallback(
    (lineId: string) => {
      // lineId format from react-diff-viewer: "R-{number}" or "L-{number}"
      const match = lineId.match(/[RL]-(\d+)/);
      if (!match) return;
      const lineNum = Number.parseInt(match[1], 10);

      if (activeCommentLine === lineNum) {
        setActiveCommentLine(null);
        setCommentDraft("");
      } else {
        setActiveCommentLine(lineNum);
        setCommentDraft("");
      }
    },
    [activeCommentLine]
  );

  const addComment = useCallback(() => {
    if (!commentDraft.trim() || activeCommentLine === null) return;

    const newComment: InlineComment = {
      id: `c-${Date.now()}-${activeCommentLine}`,
      filePath: file.path,
      lineNumber: activeCommentLine,
      text: commentDraft.trim(),
    };

    setComments((prev) => [...prev, newComment]);
    setActiveCommentLine(null);
    setCommentDraft("");
  }, [commentDraft, activeCommentLine, file.path]);

  const removeComment = useCallback((commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }, []);

  async function handleSubmit() {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/assess/review/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          summaryText: summary,
          comments: comments.map((c) => ({
            filePath: c.filePath,
            lineNumber: c.lineNumber,
            commentText: c.text,
          })),
        }),
      });

      if (!res.ok) throw new Error("Submit failed");

      router.push(`/assess/${token}/complete`);
    } catch {
      toast.error("Failed to submit review. Please try again.");
      setIsSubmitting(false);
    }
  }

  // Custom diff viewer styles matching our dark theme
  const diffStyles = {
    variables: {
      dark: {
        diffViewerBackground: "var(--background)",
        diffViewerColor: "var(--foreground)",
        addedBackground: "rgba(34, 197, 94, 0.06)",
        addedColor: "var(--foreground)",
        addedGutterBackground: "rgba(34, 197, 94, 0.12)",
        addedGutterColor: "#22c55e",
        removedBackground: "rgba(239, 68, 68, 0.06)",
        removedColor: "var(--foreground)",
        removedGutterBackground: "rgba(239, 68, 68, 0.12)",
        removedGutterColor: "#ef4444",
        wordAddedBackground: "rgba(34, 197, 94, 0.18)",
        wordRemovedBackground: "rgba(239, 68, 68, 0.18)",
        codeFoldBackground: "#181b25",
        codeFoldGutterBackground: "#181b25",
        codeFoldContentColor: "#8891a8",
        emptyLineBackground: "var(--background)",
        gutterBackground: "#181b25",
        gutterColor: "#8891a8",
        highlightBackground: "rgba(99, 102, 241, 0.08)",
        highlightGutterBackground: "rgba(99, 102, 241, 0.15)",
      },
    },
    line: {
      padding: "4px 8px",
      fontSize: "13px",
      fontFamily:
        'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    },
    gutter: {
      padding: "4px 12px",
      minWidth: "40px",
      cursor: "pointer",
    },
    contentText: {
      fontFamily:
        'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    },
  };

  // Lines that have comments on them (for highlighting)
  const commentedLines = comments.map((c) => `R-${c.lineNumber}`);

  return (
    <ScreenSizeGuard>
      <div className="flex min-h-dvh flex-col bg-background">
        {/* Header */}
        <header className="sticky top-0 z-10 border-border border-b bg-card/80 px-6 py-4 backdrop-blur-sm">
          <div className="mx-auto max-w-5xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="mb-1 flex items-center gap-3">
                  <h1 className="font-bold font-display text-lg">
                    {scenario.title}
                  </h1>
                  <Badge className="text-xs" variant="secondary">
                    Review Phase
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground text-sm">
                  <span className="flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted font-bold text-[10px]">
                      J
                    </span>
                    {scenario.author}
                  </span>
                  <span>
                    {scenario.files.length} file
                    {scenario.files.length > 1 ? "s" : ""} changed
                  </span>
                  <span>
                    {comments.length} comment{comments.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
              <button
                className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground text-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
                disabled={isSubmitting}
                onClick={handleSubmit}
                type="button"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                    Submitting...
                  </>
                ) : (
                  "Submit Review"
                )}
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-6">
          {/* PR Description */}
          <div className="glass-card rounded-xl p-5">
            <h3 className="mb-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
              Pull Request Description
            </h3>
            <p className="text-foreground/85 text-sm leading-relaxed">
              {scenario.description}
            </p>
          </div>

          {/* Overall review summary */}
          <div className="glass-card rounded-xl p-5">
            <h3 className="mb-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
              Your Overall Review
            </h3>
            <textarea
              className="min-h-[100px] w-full resize-none rounded-lg border border-border bg-input p-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Write your overall review of this merge request. Summarize the key issues you found and your recommendation (approve, request changes, or reject)."
              value={summary}
            />
          </div>

          {/* Diff viewer */}
          <div className="glass-card overflow-hidden rounded-xl">
            <div className="flex items-center gap-2 border-border border-b px-4 py-2.5">
              <span className="font-mono text-muted-foreground text-xs">
                {file.path}
              </span>
              <Badge
                className="border-success/20 bg-success/10 text-[10px] text-success"
                variant="outline"
              >
                +{file.newCode.split("\n").length} lines
              </Badge>
              <span className="ml-auto text-muted-foreground text-xs">
                Click a line number to add a comment
              </span>
            </div>

            <div className="[&_pre]:!bg-transparent [&_table]:!w-full text-sm">
              <ReactDiffViewer
                compareMethod={DiffMethod.LINES}
                highlightLines={commentedLines}
                newValue={file.newCode}
                oldValue={file.oldCode}
                onLineNumberClick={(lineId: string) => handleLineClick(lineId)}
                splitView={false}
                styles={diffStyles}
                useDarkTheme={true}
              />
            </div>
          </div>

          {/* Inline comment form (appears when a line is clicked) */}
          {activeCommentLine !== null && (
            <div className="glass-card animate-scale-in rounded-xl p-5">
              <div className="mb-3 flex items-center gap-2">
                <Badge className="font-mono text-[10px]" variant="outline">
                  Line {activeCommentLine}
                </Badge>
                <span className="text-muted-foreground text-xs">
                  Adding comment on {file.path}
                </span>
              </div>
              <textarea
                autoFocus
                className="mb-3 min-h-[80px] w-full resize-none rounded-lg border border-border bg-input p-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                onChange={(e) => setCommentDraft(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    addComment();
                  }
                  if (e.key === "Escape") {
                    setActiveCommentLine(null);
                    setCommentDraft("");
                  }
                }}
                placeholder="Describe the issue you found on this line..."
                value={commentDraft}
              />
              <div className="flex items-center justify-end gap-2">
                <span className="mr-auto text-[10px] text-muted-foreground">
                  {navigator.platform?.includes("Mac") ? "\u2318" : "Ctrl"}
                  +Enter to submit &middot; Esc to cancel
                </span>
                <button
                  className="px-3 py-1.5 text-muted-foreground text-xs transition-colors hover:text-foreground"
                  onClick={() => {
                    setActiveCommentLine(null);
                    setCommentDraft("");
                  }}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground text-xs transition-colors hover:bg-primary/90 disabled:opacity-50"
                  disabled={!commentDraft.trim()}
                  onClick={addComment}
                  type="button"
                >
                  Add Comment
                </button>
              </div>
            </div>
          )}

          {/* Comments summary */}
          {comments.length > 0 && (
            <div className="glass-card rounded-xl p-5">
              <h3 className="mb-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                Your Comments ({comments.length})
              </h3>
              <div className="space-y-2">
                {comments.map((c) => (
                  <div
                    className="flex items-start gap-3 rounded-lg bg-secondary/30 p-3"
                    key={c.id}
                  >
                    <Badge
                      className="mt-0.5 flex-shrink-0 font-mono text-[10px]"
                      variant="outline"
                    >
                      L{c.lineNumber}
                    </Badge>
                    <p className="min-w-0 flex-1 text-foreground/85 text-sm">
                      {c.text}
                    </p>
                    <button
                      className="flex-shrink-0 text-muted-foreground text-xs hover:text-destructive"
                      onClick={() => removeComment(c.id)}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submit section */}
          <div className="flex items-center justify-between py-4">
            <p className="text-muted-foreground text-xs">
              Review the diff carefully and leave comments on any issues you
              find.
            </p>
            <button
              className="rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground text-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
              disabled={isSubmitting}
              onClick={handleSubmit}
              type="button"
            >
              {isSubmitting ? "Submitting..." : "Submit Review"}
            </button>
          </div>
        </div>
      </div>
    </ScreenSizeGuard>
  );
}

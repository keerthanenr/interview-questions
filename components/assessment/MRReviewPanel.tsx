"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import ReactDiffViewer, { DiffMethod } from "react-diff-viewer-continued";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

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
  const [summary, setSummary] = useState("");
  const [comments, setComments] = useState<InlineComment[]>([]);
  const [activeCommentLine, setActiveCommentLine] = useState<number | null>(
    null,
  );
  const [commentDraft, setCommentDraft] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    [activeCommentLine],
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
    <div className="min-h-dvh bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm px-6 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-lg font-bold font-display">
                  {scenario.title}
                </h1>
                <Badge variant="secondary" className="text-xs">
                  Review Phase
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
                    J
                  </span>
                  {scenario.author}
                </span>
                <span>
                  {scenario.files.length} file
                  {scenario.files.length > 1 ? "s" : ""} changed
                </span>
                <span>{comments.length} comment{comments.length !== 1 ? "s" : ""}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Review"
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-5xl mx-auto w-full px-6 py-6 space-y-6">
        {/* PR Description */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Pull Request Description
          </h3>
          <p className="text-sm text-foreground/85 leading-relaxed">
            {scenario.description}
          </p>
        </div>

        {/* Overall review summary */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Your Overall Review
          </h3>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Write your overall review of this merge request. Summarize the key issues you found and your recommendation (approve, request changes, or reject)."
            className="w-full min-h-[100px] bg-input border border-border rounded-lg p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
          />
        </div>

        {/* Diff viewer */}
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="border-b border-border px-4 py-2.5 flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground">
              {file.path}
            </span>
            <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/20">
              +{file.newCode.split("\n").length} lines
            </Badge>
            <span className="text-xs text-muted-foreground ml-auto">
              Click a line number to add a comment
            </span>
          </div>

          <div className="text-sm [&_pre]:!bg-transparent [&_table]:!w-full">
            <ReactDiffViewer
              oldValue={file.oldCode}
              newValue={file.newCode}
              splitView={false}
              useDarkTheme={true}
              compareMethod={DiffMethod.LINES}
              styles={diffStyles}
              highlightLines={commentedLines}
              onLineNumberClick={(lineId: string) => handleLineClick(lineId)}
            />
          </div>
        </div>

        {/* Inline comment form (appears when a line is clicked) */}
        {activeCommentLine !== null && (
          <div className="glass-card rounded-xl p-5 animate-scale-in">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className="text-[10px] font-mono">
                Line {activeCommentLine}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Adding comment on {file.path}
              </span>
            </div>
            <textarea
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              placeholder="Describe the issue you found on this line..."
              className="w-full min-h-[80px] bg-input border border-border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground mb-3"
              autoFocus
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
            />
            <div className="flex items-center gap-2 justify-end">
              <span className="text-[10px] text-muted-foreground mr-auto">
                {navigator.platform?.includes("Mac") ? "\u2318" : "Ctrl"}
                +Enter to submit &middot; Esc to cancel
              </span>
              <button
                type="button"
                onClick={() => {
                  setActiveCommentLine(null);
                  setCommentDraft("");
                }}
                className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={addComment}
                disabled={!commentDraft.trim()}
                className="px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded-md font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                Add Comment
              </button>
            </div>
          </div>
        )}

        {/* Comments summary */}
        {comments.length > 0 && (
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Your Comments ({comments.length})
            </h3>
            <div className="space-y-2">
              {comments.map((c) => (
                <div
                  key={c.id}
                  className="flex items-start gap-3 bg-secondary/30 rounded-lg p-3"
                >
                  <Badge
                    variant="outline"
                    className="text-[10px] font-mono flex-shrink-0 mt-0.5"
                  >
                    L{c.lineNumber}
                  </Badge>
                  <p className="text-sm text-foreground/85 flex-1 min-w-0">
                    {c.text}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeComment(c.id)}
                    className="text-xs text-muted-foreground hover:text-destructive flex-shrink-0"
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
          <p className="text-xs text-muted-foreground">
            Review the diff carefully and leave comments on any issues you find.
          </p>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Submitting..." : "Submit Review"}
          </button>
        </div>
      </div>
    </div>
  );
}

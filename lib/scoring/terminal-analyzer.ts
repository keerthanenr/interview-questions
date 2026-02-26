/**
 * Terminal I/O Analyzer — Claude Code Behavioral Scoring
 *
 * Parses captured terminal input/output (JSONL entries from the sandbox worker)
 * to extract structured metrics about how a candidate used Claude Code and the
 * terminal during the build phase.
 *
 * Scoring signals:
 * - Claude Code session count and duration
 * - Prompt count and sophistication (length, specificity)
 * - Iteration depth (did they refine, or accept first output?)
 * - Manual vs AI-driven activity ratio
 * - Terminal command usage patterns
 */

// ── Types ─────────────────────────────────────────────────────────

export interface IOEntry {
  ts: number; // epoch milliseconds
  dir: "in" | "out"; // user input or container output
  data: string;
}

export interface ClaudeCodeSession {
  startTs: number;
  endTs: number;
  durationMs: number;
  promptCount: number;
  totalInputChars: number;
  totalOutputChars: number;
}

export interface TerminalMetrics {
  // Overall terminal activity
  totalInputChars: number;
  totalOutputChars: number;
  totalDurationMs: number; // first entry to last entry
  commandCount: number; // shell commands executed (Enter keypresses)

  // Claude Code specific
  claudeCodeSessions: ClaudeCodeSession[];
  claudeCodeSessionCount: number;
  claudeCodeTotalDurationMs: number;
  claudeCodePromptCount: number; // total prompts across all sessions
  claudeCodeInputChars: number; // chars typed during Claude sessions
  claudeCodeOutputChars: number; // chars output during Claude sessions

  // Derived behavioral scores (0.0 - 1.0)
  claudeCodeTimeRatio: number; // time in Claude / total time
  claudeCodeOutputRatio: number; // Claude output / total output
  manualActivityRatio: number; // manual typing / total input
  averagePromptLength: number; // average chars per prompt
  iterationScore: number; // multi-turn refinement indicator
}

// ── ANSI stripping ────────────────────────────────────────────────

const ANSI_REGEX =
  // biome-ignore lint/suspicious/noControlCharactersInRegex: need to match ANSI escape sequences
  /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

function stripAnsi(str: string): string {
  return str.replace(ANSI_REGEX, "");
}

// ── Analysis ──────────────────────────────────────────────────────

export function analyzeTerminalLog(entries: IOEntry[]): TerminalMetrics {
  if (!entries || entries.length === 0) {
    return emptyMetrics();
  }

  // Sort by timestamp
  const sorted = [...entries].sort((a, b) => a.ts - b.ts);

  const totalDurationMs =
    sorted.length > 1 ? sorted[sorted.length - 1].ts - sorted[0].ts : 0;

  let totalInputChars = 0;
  let totalOutputChars = 0;
  let commandCount = 0;

  // Track Claude Code sessions
  const sessions: ClaudeCodeSession[] = [];
  let inClaudeSession = false;
  let sessionStart = 0;
  let sessionPromptCount = 0;
  let sessionInputChars = 0;
  let sessionOutputChars = 0;
  let pendingInputLine = "";
  // Track consecutive output without shell prompt (indicates active Claude session)
  let outputSinceLastPrompt = 0;

  for (const entry of sorted) {
    const clean = stripAnsi(entry.data);

    if (entry.dir === "in") {
      totalInputChars += entry.data.length;

      // Accumulate input characters to form command lines
      pendingInputLine += clean;

      // Detect Enter key (CR or LF)
      if (
        entry.data === "\r" ||
        entry.data === "\n" ||
        entry.data.endsWith("\r") ||
        entry.data.endsWith("\n")
      ) {
        const line = pendingInputLine.trim();
        pendingInputLine = "";

        if (inClaudeSession) {
          // Inside Claude session — each Enter is likely a prompt submission
          if (line.length > 0) {
            sessionPromptCount++;
          }
          sessionInputChars += entry.data.length;
        } else {
          commandCount++;
          // Check if this command starts Claude Code
          if (isClaudeStartCommand(line)) {
            inClaudeSession = true;
            sessionStart = entry.ts;
            sessionPromptCount = 0;
            sessionInputChars = 0;
            sessionOutputChars = 0;
            outputSinceLastPrompt = 0;
          }
        }
      } else {
        if (inClaudeSession) {
          sessionInputChars += entry.data.length;
        }
      }
    } else {
      // Output from container
      totalOutputChars += entry.data.length;

      if (inClaudeSession) {
        sessionOutputChars += entry.data.length;
        outputSinceLastPrompt += entry.data.length;

        // Check if Claude session ended (shell prompt returned)
        if (isShellPromptReturned(clean) && outputSinceLastPrompt > 100) {
          // Session ended
          sessions.push({
            startTs: sessionStart,
            endTs: entry.ts,
            durationMs: entry.ts - sessionStart,
            promptCount: Math.max(sessionPromptCount, 1),
            totalInputChars: sessionInputChars,
            totalOutputChars: sessionOutputChars,
          });
          inClaudeSession = false;
          outputSinceLastPrompt = 0;
        }
      }
    }
  }

  // Close any open Claude session at end of log
  if (inClaudeSession && sorted.length > 0) {
    const lastEntry = sorted[sorted.length - 1];
    sessions.push({
      startTs: sessionStart,
      endTs: lastEntry.ts,
      durationMs: lastEntry.ts - sessionStart,
      promptCount: Math.max(sessionPromptCount, 1),
      totalInputChars: sessionInputChars,
      totalOutputChars: sessionOutputChars,
    });
  }

  // Aggregate Claude Code metrics
  const claudeCodeTotalDurationMs = sessions.reduce(
    (sum, s) => sum + s.durationMs,
    0
  );
  const claudeCodePromptCount = sessions.reduce(
    (sum, s) => sum + s.promptCount,
    0
  );
  const claudeCodeInputChars = sessions.reduce(
    (sum, s) => sum + s.totalInputChars,
    0
  );
  const claudeCodeOutputChars = sessions.reduce(
    (sum, s) => sum + s.totalOutputChars,
    0
  );

  // Derived scores
  const claudeCodeTimeRatio =
    totalDurationMs > 0
      ? Math.min(claudeCodeTotalDurationMs / totalDurationMs, 1)
      : 0;

  const claudeCodeOutputRatio =
    totalOutputChars > 0
      ? Math.min(claudeCodeOutputChars / totalOutputChars, 1)
      : 0;

  const manualInputChars = totalInputChars - claudeCodeInputChars;
  const manualActivityRatio =
    totalInputChars > 0 ? Math.min(manualInputChars / totalInputChars, 1) : 1; // no input at all = fully manual (they used the editor)

  const averagePromptLength =
    claudeCodePromptCount > 0
      ? claudeCodeInputChars / claudeCodePromptCount
      : 0;

  // Iteration score: did the candidate have multi-turn conversations?
  // Higher score = more iterative refinement (which is good)
  // Score based on average prompts per session
  const avgPromptsPerSession =
    sessions.length > 0 ? claudeCodePromptCount / sessions.length : 0;
  const iterationScore = Math.min(avgPromptsPerSession / 5, 1); // 5+ prompts/session = max

  return {
    totalInputChars,
    totalOutputChars,
    totalDurationMs,
    commandCount,
    claudeCodeSessions: sessions,
    claudeCodeSessionCount: sessions.length,
    claudeCodeTotalDurationMs,
    claudeCodePromptCount,
    claudeCodeInputChars,
    claudeCodeOutputChars,
    claudeCodeTimeRatio,
    claudeCodeOutputRatio,
    manualActivityRatio,
    averagePromptLength,
    iterationScore,
  };
}

// ── Behavioral scoring ────────────────────────────────────────────

/**
 * Compute a composite AI reliance score from terminal metrics.
 *
 * Returns a value between 0 and 1 where:
 * - 0 = no AI reliance (candidate worked entirely manually)
 * - 1 = extreme AI reliance (candidate delegated everything to Claude Code)
 *
 * The score considers:
 * - Time spent in Claude Code vs total time (30% weight)
 * - Claude output volume vs total output (40% weight)
 * - Manual activity ratio inverted (30% weight)
 */
export function terminalAIRelianceScore(metrics: TerminalMetrics): number {
  if (metrics.claudeCodeSessionCount === 0) {
    return 0; // no Claude Code usage at all
  }

  const timeComponent = metrics.claudeCodeTimeRatio * 0.3;
  const outputComponent = metrics.claudeCodeOutputRatio * 0.4;
  const manualComponent = (1 - metrics.manualActivityRatio) * 0.3;

  return Math.min(timeComponent + outputComponent + manualComponent, 1);
}

/**
 * Compute a prompt sophistication score from terminal metrics.
 *
 * Returns a value between 0 and 1 where:
 * - Higher = candidate asked thoughtful, specific questions
 * - Lower = candidate gave vague or no prompts
 *
 * Considers:
 * - Average prompt length (longer = more specific)
 * - Iteration depth (more turns = refining their approach)
 * - Session count (using Claude Code strategically vs constantly)
 */
export function promptSophisticationScore(metrics: TerminalMetrics): number {
  if (metrics.claudeCodeSessionCount === 0) {
    return 0.5; // neutral — didn't use Claude Code, can't judge
  }

  // Average prompt length score: 20+ chars = detailed prompts
  const lengthScore = Math.min(metrics.averagePromptLength / 80, 1);

  // Iteration score: multi-turn refinement is good
  const iterScore = metrics.iterationScore;

  // Strategic usage: 1-5 focused sessions is better than 0 or 10+
  const sessionCountNorm = metrics.claudeCodeSessionCount;
  const strategicScore =
    sessionCountNorm >= 1 && sessionCountNorm <= 5
      ? 1.0
      : sessionCountNorm > 5
        ? Math.max(0.3, 1 - (sessionCountNorm - 5) * 0.1)
        : 0;

  return Math.min(
    lengthScore * 0.4 + iterScore * 0.35 + strategicScore * 0.25,
    1
  );
}

// ── Helpers ───────────────────────────────────────────────────────

function isClaudeStartCommand(line: string): boolean {
  const trimmed = line.toLowerCase().trim();
  // Match "claude", "claude --help", "claude -p 'fix this'", etc.
  return trimmed === "claude" || trimmed.startsWith("claude ");
}

function isShellPromptReturned(output: string): boolean {
  // Our custom PS1 contains "candidate@sandbox"
  if (output.includes("candidate@sandbox")) return true;
  // Generic shell prompt patterns
  if (/\$\s*$/.test(output)) return true;
  return false;
}

function emptyMetrics(): TerminalMetrics {
  return {
    totalInputChars: 0,
    totalOutputChars: 0,
    totalDurationMs: 0,
    commandCount: 0,
    claudeCodeSessions: [],
    claudeCodeSessionCount: 0,
    claudeCodeTotalDurationMs: 0,
    claudeCodePromptCount: 0,
    claudeCodeInputChars: 0,
    claudeCodeOutputChars: 0,
    claudeCodeTimeRatio: 0,
    claudeCodeOutputRatio: 0,
    manualActivityRatio: 1,
    averagePromptLength: 0,
    iterationScore: 0,
  };
}

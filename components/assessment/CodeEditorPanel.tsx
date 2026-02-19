"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  SandpackProvider,
  SandpackCodeEditor,
  SandpackPreview,
  SandpackConsole,
  useSandpack,
} from "@codesandbox/sandpack-react";
import { ClaudeChatPanel } from "./ClaudeChatPanel";
import { cn } from "@/lib/utils";

const DEFAULT_STARTER_CODE: Record<string, string> = {
  "/App.js": `import React from 'react';

export default function App() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Hello ReactAssess</h1>
      <p>Start building here...</p>
    </div>
  );
}
`,
};

type BottomTab = "terminal" | "console" | "claude";

interface CodeEditorPanelProps {
  starterCode?: Record<string, string>;
  onCodeChange?: (files: Record<string, string>) => void;
  sessionId: string;
}

function CodeChangeTracker({
  onCodeChange,
  sessionId,
  lastClaudeCode,
  lastClaudeCodeTime,
}: {
  onCodeChange?: (files: Record<string, string>) => void;
  sessionId: string;
  lastClaudeCode: string | null;
  lastClaudeCodeTime: number;
}) {
  const { sandpack } = useSandpack();
  const prevSnapshot = useRef<Record<string, string>>({});
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLoggedSnapshot = useRef<Record<string, string>>({});

  const logCodeChange = useCallback(
    (currentFiles: Record<string, string>, changedFiles: string[]) => {
      // Debounced server-side logging (10s after last change)
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        const mainFile = currentFiles["/App.js"] ?? "";
        fetch("/api/assess/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            eventType: "code_change",
            payload: {
              changed_files: changedFiles,
              code_snapshot: mainFile,
              timestamp: new Date().toISOString(),
            },
          }),
        }).catch(() => {});

        // Check for claude_output_accepted within 30s of a Claude response
        if (lastClaudeCode && Date.now() - lastClaudeCodeTime < 30_000) {
          const similarity = computeSimilarity(lastClaudeCode, mainFile);
          let acceptanceType: "full" | "partial" | "rejected";
          if (similarity > 0.9) acceptanceType = "full";
          else if (similarity > 0.2) acceptanceType = "partial";
          else acceptanceType = "rejected";

          fetch("/api/assess/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId,
              eventType: "claude_output_accepted",
              payload: {
                original: lastClaudeCode,
                modified: mainFile,
                acceptance_type: acceptanceType,
                similarity: Math.round(similarity * 100),
              },
            }),
          }).catch(() => {});
        }

        lastLoggedSnapshot.current = { ...currentFiles };
      }, 10_000);
    },
    [sessionId, lastClaudeCode, lastClaudeCodeTime],
  );

  const checkForChanges = useCallback(() => {
    const currentFiles: Record<string, string> = {};
    for (const [path, file] of Object.entries(sandpack.files)) {
      currentFiles[path] = file.code;
    }

    const prev = prevSnapshot.current;
    const changedFiles: string[] = [];

    for (const [path, code] of Object.entries(currentFiles)) {
      if (prev[path] !== code) {
        changedFiles.push(path);
      }
    }

    if (changedFiles.length > 0) {
      prevSnapshot.current = currentFiles;
      onCodeChange?.(currentFiles);
      logCodeChange(currentFiles, changedFiles);
    }
  }, [sandpack.files, onCodeChange, logCodeChange]);

  useEffect(() => {
    const interval = setInterval(checkForChanges, 2000);
    return () => clearInterval(interval);
  }, [checkForChanges]);

  return null;
}

function computeSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const aLines = a.trim().split("\n");
  const bLines = b.trim().split("\n");
  const bSet = new Set(bLines);
  let matching = 0;
  for (const line of aLines) {
    if (bSet.has(line)) matching++;
  }
  return matching / Math.max(aLines.length, 1);
}

function TerminalPanel() {
  const [history, setHistory] = useState<
    { type: "input" | "output" | "error"; text: string }[]
  >([
    { type: "output", text: "Welcome to ReactAssess Terminal" },
    { type: "output", text: 'Type "help" for available commands.\n' },
  ]);
  const [input, setInput] = useState("");
  const { sandpack } = useSandpack();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [history]);

  function runCommand(cmd: string) {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    const newHistory = [
      ...history,
      { type: "input" as const, text: `$ ${trimmed}` },
    ];

    const parts = trimmed.split(/\s+/);
    const base = parts[0];

    if (base === "help") {
      newHistory.push({
        type: "output",
        text: [
          "Available commands:",
          "  ls              List project files",
          "  cat <file>      Show file contents",
          "  npm start       Start the dev server (auto-running)",
          "  npm test        Run tests",
          "  node -v         Show Node.js version",
          "  clear           Clear terminal",
          "  help            Show this message",
        ].join("\n"),
      });
    } else if (base === "clear") {
      setHistory([]);
      setInput("");
      return;
    } else if (base === "ls") {
      const files = Object.keys(sandpack.files).map((f) =>
        f.startsWith("/") ? f.slice(1) : f,
      );
      newHistory.push({ type: "output", text: files.join("\n") });
    } else if (base === "cat" && parts[1]) {
      const target = parts[1].startsWith("/") ? parts[1] : `/${parts[1]}`;
      const file = sandpack.files[target];
      if (file) {
        newHistory.push({ type: "output", text: file.code });
      } else {
        newHistory.push({
          type: "error",
          text: `cat: ${parts[1]}: No such file or directory`,
        });
      }
    } else if (base === "node" && parts[1] === "-v") {
      newHistory.push({ type: "output", text: "v20.11.0" });
    } else if (base === "npm" || base === "npx" || base === "yarn") {
      const sub = parts.slice(1).join(" ");
      if (sub === "start" || sub === "run dev") {
        newHistory.push({
          type: "output",
          text: "Server already running — see Preview panel.\nAuto-reload is enabled.",
        });
      } else if (sub === "test" || sub === "run test") {
        newHistory.push({
          type: "output",
          text: "No test runner configured in this sandbox.\nTip: Add tests to your component and we'll pick them up.",
        });
      } else if (sub === "install" || sub === "i") {
        newHistory.push({
          type: "output",
          text: "Dependencies are pre-installed in the sandbox.\nAvailable: react, react-dom",
        });
      } else {
        newHistory.push({
          type: "output",
          text: `npm ${sub}: command recognized but not available in sandbox mode.`,
        });
      }
    } else if (base === "pwd") {
      newHistory.push({ type: "output", text: "/home/project" });
    } else if (base === "whoami") {
      newHistory.push({ type: "output", text: "candidate" });
    } else if (base === "echo") {
      newHistory.push({ type: "output", text: parts.slice(1).join(" ") });
    } else {
      newHistory.push({
        type: "error",
        text: `${base}: command not found. Type "help" for available commands.`,
      });
    }

    setHistory(newHistory);
    setInput("");
  }

  return (
    <div
      className="h-full flex flex-col bg-[#0d1117] font-mono text-xs"
      onClick={() => inputRef.current?.focus()}
      onKeyDown={() => {}}
    >
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {history.map((line, i) => (
          <div
            key={`${line.type}-${i}`}
            className={cn(
              "whitespace-pre-wrap leading-relaxed",
              line.type === "input" && "text-foreground",
              line.type === "output" && "text-muted-foreground",
              line.type === "error" && "text-destructive",
            )}
          >
            {line.text}
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="text-success">$</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") runCommand(input);
            }}
            className="flex-1 bg-transparent outline-none text-foreground caret-success"
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      </div>
    </div>
  );
}

function EditorInner({
  onCodeChange,
  sessionId,
}: {
  onCodeChange?: (files: Record<string, string>) => void;
  sessionId: string;
}) {
  const [activeTab, setActiveTab] = useState<BottomTab>("terminal");
  const lastClaudeCodeRef = useRef<string | null>(null);
  const lastClaudeCodeTimeRef = useRef<number>(0);

  const handleClaudeCode = useCallback((code: string, timestamp: number) => {
    lastClaudeCodeRef.current = code;
    lastClaudeCodeTimeRef.current = timestamp;
  }, []);

  const tabs: { key: BottomTab; label: string; icon: React.ReactNode }[] = [
    {
      key: "terminal",
      label: "Terminal",
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
        </svg>
      ),
    },
    {
      key: "console",
      label: "Console",
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      ),
    },
    {
      key: "claude",
      label: "Claude AI",
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Top: Editor (left) + Preview (right) side by side */}
      <div className="flex-[60] min-h-0 flex overflow-hidden">
        <div className="flex-1 min-w-0 overflow-hidden">
          <SandpackCodeEditor
            showLineNumbers
            showTabs
            style={{ height: "100%" }}
            wrapContent
          />
        </div>
        <div className="flex-1 min-w-0 overflow-hidden border-l border-border">
          <SandpackPreview
            showOpenInCodeSandbox={false}
            showRefreshButton
            style={{ height: "100%" }}
          />
        </div>
      </div>

      {/* Bottom tabs bar */}
      <div className="flex-shrink-0 border-t border-border bg-card/60 flex items-center gap-0.5 px-2 h-8">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-t transition-colors",
              activeTab === tab.key
                ? "text-primary bg-background border-t border-x border-primary/30 -mb-px"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bottom panel content */}
      <div className="flex-[40] min-h-0 overflow-hidden border-t border-border">
        <div className={cn("h-full", activeTab !== "terminal" && "hidden")}>
          <TerminalPanel />
        </div>
        <div className={cn("h-full", activeTab !== "console" && "hidden")}>
          <SandpackConsole
            style={{ height: "100%" }}
            showSyntaxError
            showHeader={false}
          />
        </div>
        <div className={cn("h-full", activeTab !== "claude" && "hidden")}>
          <ClaudeChatPanel sessionId={sessionId} onClaudeCode={handleClaudeCode} />
        </div>
      </div>

      <CodeChangeTracker
        onCodeChange={onCodeChange}
        sessionId={sessionId}
        lastClaudeCode={lastClaudeCodeRef.current}
        lastClaudeCodeTime={lastClaudeCodeTimeRef.current}
      />
    </div>
  );
}

export function CodeEditorPanel({
  starterCode,
  onCodeChange,
  sessionId,
}: CodeEditorPanelProps) {
  const files = starterCode ?? DEFAULT_STARTER_CODE;

  return (
    <SandpackProvider
      template="react"
      files={files}
      theme="dark"
      options={{
        autorun: true,
        autoReload: true,
      }}
    >
      <EditorInner onCodeChange={onCodeChange} sessionId={sessionId} />
    </SandpackProvider>
  );
}

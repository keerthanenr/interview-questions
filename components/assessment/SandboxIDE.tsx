"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ClaudeChatPanel } from "./ClaudeChatPanel";
import { SandboxEditor } from "./SandboxEditor";
import { type FileTreeNode, SandboxFileTree } from "./SandboxFileTree";
import { SandboxPreview } from "./SandboxPreview";
import { SandboxTerminal } from "./SandboxTerminal";

type BottomTab = "terminal" | "claude";

interface SandboxIDEProps {
  sessionId: string;
  challengeId: string;
  starterCode: Record<string, string>;
  testFileContent?: string;
  readmeContent?: string;
  onCodeChange?: (files: Record<string, string>) => void;
}

const SANDBOX_WORKER_URL = process.env.NEXT_PUBLIC_SANDBOX_WORKER_URL || "";
const SANDBOX_APP_SECRET = process.env.NEXT_PUBLIC_SANDBOX_APP_SECRET || "";

async function sandboxFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${SANDBOX_WORKER_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SANDBOX_APP_SECRET}`,
      ...options.headers,
    },
  });
  return res;
}

export function SandboxIDE({
  sessionId,
  challengeId,
  starterCode,
  testFileContent,
  readmeContent,
  onCodeChange,
}: SandboxIDEProps) {
  const [activeTab, setActiveTab] = useState<BottomTab>("terminal");
  const [fileTree, setFileTree] = useState<FileTreeNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sandboxReady, setSandboxReady] = useState(false);
  const writeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastClaudeCodeRef = useRef<string | null>(null);
  const lastClaudeCodeTimeRef = useRef<number>(0);

  const handleClaudeCode = useCallback((code: string, timestamp: number) => {
    lastClaudeCodeRef.current = code;
    lastClaudeCodeTimeRef.current = timestamp;
  }, []);

  // Initialize sandbox on mount
  useEffect(() => {
    let cancelled = false;

    async function initSandbox() {
      try {
        setIsLoading(true);
        setError(null);

        const res = await sandboxFetch("/sandbox/create", {
          method: "POST",
          body: JSON.stringify({
            sessionId,
            challengeId,
            starterCode,
            testFileContent,
            readmeContent,
          }),
        });

        if (!res.ok) {
          throw new Error(`Failed to create sandbox: ${res.status}`);
        }

        const data = await res.json();

        if (!cancelled) {
          setFileTree(data.fileTree || []);
          setSandboxReady(true);

          // Auto-select App.jsx
          const appFile = findFile(data.fileTree, "App.jsx");
          if (appFile) {
            setSelectedFile(appFile.path);
            const fileRes = await sandboxFetch(
              `/sandbox/files?sessionId=${sessionId}&path=${encodeURIComponent(appFile.path)}`
            );
            if (fileRes.ok) {
              const fileData = await fileRes.json();
              setFileContent(fileData.content || "");
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to initialize sandbox"
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    initSandbox();
    return () => {
      cancelled = true;
    };
  }, [sessionId, challengeId, starterCode, testFileContent, readmeContent]);

  // Handle file selection from tree
  const handleFileSelect = useCallback(
    async (path: string) => {
      setSelectedFile(path);
      try {
        const res = await sandboxFetch(
          `/sandbox/files?sessionId=${sessionId}&path=${encodeURIComponent(path)}`
        );
        if (res.ok) {
          const data = await res.json();
          setFileContent(data.content || "");
        }
      } catch {
        setFileContent("// Failed to load file");
      }
    },
    [sessionId]
  );

  // Handle editor changes — debounced write to container
  const handleEditorChange = useCallback(
    (value: string) => {
      setFileContent(value);

      if (writeTimerRef.current) {
        clearTimeout(writeTimerRef.current);
      }

      writeTimerRef.current = setTimeout(async () => {
        if (!selectedFile) return;

        try {
          await sandboxFetch("/sandbox/files", {
            method: "POST",
            body: JSON.stringify({
              sessionId,
              path: selectedFile,
              content: value,
            }),
          });

          // Notify parent of code change
          onCodeChange?.({ [selectedFile]: value });

          // Log code change event
          fetch("/api/assess/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId,
              eventType: "code_change",
              payload: {
                changed_files: [selectedFile],
                code_snapshot: value,
                timestamp: new Date().toISOString(),
              },
            }),
          }).catch(() => {});
        } catch {
          // Silently fail on write errors
        }
      }, 300);
    },
    [selectedFile, sessionId, onCodeChange]
  );

  // Refresh file tree
  const refreshFileTree = useCallback(async () => {
    try {
      const res = await sandboxFetch(`/sandbox/files?sessionId=${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setFileTree(data.fileTree || []);
      }
    } catch {
      // Silently fail
    }
  }, [sessionId]);

  // Poll for file tree changes periodically
  useEffect(() => {
    if (!sandboxReady) return;
    const interval = setInterval(refreshFileTree, 10_000);
    return () => clearInterval(interval);
  }, [sandboxReady, refreshFileTree]);

  const tabs: { key: BottomTab; label: string; icon: React.ReactNode }[] = [
    {
      key: "terminal",
      label: "Terminal",
      icon: (
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
        >
          <path
            d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      key: "claude",
      label: "Claude AI",
      icon: (
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
        >
          <path
            d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <div className="space-y-1 text-center">
          <p className="font-medium text-foreground text-sm">
            Setting up your environment...
          </p>
          <p className="text-muted-foreground text-xs">
            Starting container with Node.js, React, and Claude Code
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-background px-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/15">
          <svg
            className="h-5 w-5 text-destructive"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <p className="text-center text-destructive text-sm">{error}</p>
        <button
          className="text-primary text-xs hover:underline"
          onClick={() => window.location.reload()}
          type="button"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Top: File Tree + Editor + Preview */}
      <div className="flex min-h-0 flex-[60] overflow-hidden">
        {/* File Tree */}
        <div className="w-48 min-w-[160px] flex-shrink-0 overflow-y-auto border-border border-r bg-card/40">
          <div className="flex items-center justify-between border-border border-b px-3 py-2">
            <span className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
              Explorer
            </span>
            <button
              className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              onClick={refreshFileTree}
              title="Refresh file tree"
              type="button"
            >
              <svg
                className="h-3 w-3"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
          <SandboxFileTree
            nodes={fileTree}
            onSelect={handleFileSelect}
            selectedPath={selectedFile}
          />
        </div>

        {/* Monaco Editor */}
        <div className="min-w-0 flex-1 overflow-hidden">
          <SandboxEditor
            filePath={selectedFile}
            onChange={handleEditorChange}
            value={fileContent}
          />
        </div>

        {/* Live Preview */}
        <div className="min-w-0 flex-1 overflow-hidden border-border border-l">
          <SandboxPreview sandboxReady={sandboxReady} sessionId={sessionId} />
        </div>
      </div>

      {/* Bottom tabs bar */}
      <div className="flex h-8 flex-shrink-0 items-center gap-0.5 border-border border-t bg-card/60 px-2">
        {tabs.map((tab) => (
          <button
            className={cn(
              "flex items-center gap-1.5 rounded-t px-3 py-1 font-medium text-xs transition-colors",
              activeTab === tab.key
                ? "-mb-px border-primary/30 border-x border-t bg-background text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            type="button"
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bottom panel content */}
      <div className="flex min-h-0 flex-[40] overflow-hidden border-border border-t">
        <div className={cn("flex-1", activeTab !== "terminal" && "hidden")}>
          <SandboxTerminal sandboxReady={sandboxReady} sessionId={sessionId} />
        </div>
        <div className={cn("flex-1", activeTab !== "claude" && "hidden")}>
          <ClaudeChatPanel
            onClaudeCode={handleClaudeCode}
            sessionId={sessionId}
          />
        </div>
      </div>
    </div>
  );
}

// Helper: find a file by name in the tree
function findFile(nodes: FileTreeNode[], name: string): FileTreeNode | null {
  for (const node of nodes) {
    if (node.name === name && node.type === "file") return node;
    if (node.children) {
      const found = findFile(node.children, name);
      if (found) return found;
    }
  }
  return null;
}

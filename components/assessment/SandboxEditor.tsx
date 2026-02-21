"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef } from "react";

// Dynamically import Monaco to avoid SSR issues
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-[#1e1e1e]">
      <div className="text-muted-foreground text-xs">Loading editor...</div>
    </div>
  ),
});

interface SandboxEditorProps {
  filePath: string | null;
  value: string;
  onChange: (value: string) => void;
}

function getLanguage(path: string | null): string {
  if (!path) return "plaintext";
  const ext = path.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "js":
    case "jsx":
      return "javascript";
    case "ts":
    case "tsx":
      return "typescript";
    case "json":
      return "json";
    case "css":
      return "css";
    case "html":
      return "html";
    case "md":
      return "markdown";
    default:
      return "plaintext";
  }
}

export function SandboxEditor({
  filePath,
  value,
  onChange,
}: SandboxEditorProps) {
  const editorRef = useRef<unknown>(null);

  const handleEditorMount = useCallback((editor: unknown) => {
    editorRef.current = editor;
  }, []);

  const handleChange = useCallback(
    (val: string | undefined) => {
      if (val !== undefined) {
        onChange(val);
      }
    },
    [onChange]
  );

  if (!filePath) {
    return (
      <div className="flex h-full items-center justify-center bg-[#1e1e1e]">
        <div className="space-y-2 text-center">
          <svg
            className="mx-auto h-8 w-8 text-muted-foreground/40"
            fill="none"
            stroke="currentColor"
            strokeWidth={1}
            viewBox="0 0 24 24"
          >
            <path
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p className="text-muted-foreground text-xs">
            Select a file from the explorer
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* File tab */}
      <div className="flex h-8 flex-shrink-0 items-center border-[#1e1e1e] border-b bg-[#252526] px-3">
        <span className="truncate text-muted-foreground text-xs">
          {filePath.replace("/workspace/project/", "")}
        </span>
      </div>
      <div className="min-h-0 flex-1">
        <MonacoEditor
          height="100%"
          language={getLanguage(filePath)}
          onChange={handleChange}
          onMount={handleEditorMount}
          options={{
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontLigatures: true,
            lineNumbers: "on",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: "on",
            padding: { top: 8 },
            bracketPairColorization: { enabled: true },
            smoothScrolling: true,
            cursorSmoothCaretAnimation: "on",
          }}
          theme="vs-dark"
          value={value}
        />
      </div>
    </div>
  );
}

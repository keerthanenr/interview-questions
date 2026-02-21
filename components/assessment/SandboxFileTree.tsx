"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";

export interface FileTreeNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileTreeNode[];
}

interface SandboxFileTreeProps {
  nodes: FileTreeNode[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
}

const FILE_ICONS: Record<string, string> = {
  jsx: "text-[#61dafb]",
  tsx: "text-[#3178c6]",
  js: "text-[#f7df1e]",
  ts: "text-[#3178c6]",
  json: "text-[#cb8f29]",
  css: "text-[#563d7c]",
  html: "text-[#e34c26]",
  md: "text-[#519aba]",
};

function getFileExtension(name: string): string {
  const parts = name.split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

function FileIcon({
  name,
  isDir,
  isOpen,
}: {
  name: string;
  isDir: boolean;
  isOpen?: boolean;
}) {
  if (isDir) {
    return (
      <svg
        className={cn(
          "h-4 w-4 flex-shrink-0",
          isOpen ? "text-[#dcb67a]" : "text-[#c09553]"
        )}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        {isOpen ? (
          <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v1H8.586a2 2 0 00-1.414.586L5.586 11.172A2 2 0 014.172 12H2V6z" />
        ) : (
          <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
        )}
      </svg>
    );
  }

  const ext = getFileExtension(name);
  const colorClass = FILE_ICONS[ext] || "text-muted-foreground";

  return (
    <svg
      className={cn("h-4 w-4 flex-shrink-0", colorClass)}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TreeNode({
  node,
  depth,
  selectedPath,
  onSelect,
}: {
  node: FileTreeNode;
  depth: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(depth < 2);
  const isDir = node.type === "directory";
  const isSelected = node.path === selectedPath;

  const handleClick = useCallback(() => {
    if (isDir) {
      setIsOpen((prev) => !prev);
    } else {
      onSelect(node.path);
    }
  }, [isDir, node.path, onSelect]);

  return (
    <div>
      <button
        className={cn(
          "flex w-full items-center gap-1.5 py-0.5 pr-2 text-xs transition-colors hover:bg-secondary/60",
          isSelected && "bg-primary/10 text-primary",
          !isSelected && "text-foreground/80"
        )}
        onClick={handleClick}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        type="button"
      >
        {isDir && (
          <svg
            className={cn(
              "h-3 w-3 flex-shrink-0 text-muted-foreground transition-transform",
              isOpen && "rotate-90"
            )}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              clipRule="evenodd"
              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
              fillRule="evenodd"
            />
          </svg>
        )}
        {!isDir && <span className="w-3 flex-shrink-0" />}
        <FileIcon isDir={isDir} isOpen={isOpen} name={node.name} />
        <span className="truncate">{node.name}</span>
      </button>
      {isDir && isOpen && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              depth={depth + 1}
              key={child.path}
              node={child}
              onSelect={onSelect}
              selectedPath={selectedPath}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function SandboxFileTree({
  nodes,
  selectedPath,
  onSelect,
}: SandboxFileTreeProps) {
  if (nodes.length === 0) {
    return (
      <div className="p-3 text-muted-foreground text-xs">No files loaded</div>
    );
  }

  return (
    <div className="py-1">
      {nodes.map((node) => (
        <TreeNode
          depth={0}
          key={node.path}
          node={node}
          onSelect={onSelect}
          selectedPath={selectedPath}
        />
      ))}
    </div>
  );
}

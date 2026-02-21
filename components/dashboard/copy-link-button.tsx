"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CopyLinkButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const url = `${window.location.origin}/assess/${token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Assessment link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button
      className="gap-1.5 text-xs"
      onClick={handleCopy}
      size="sm"
      title="Copy assessment link"
      variant="ghost"
    >
      {copied ? (
        <>
          <svg
            className="h-3.5 w-3.5 text-success"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              d="M4.5 12.75l6 6 9-13.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <path
              d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-3.18a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.34 8.374"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Copy Link
        </>
      )}
    </Button>
  );
}

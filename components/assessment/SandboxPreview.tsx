"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";

const SANDBOX_WORKER_URL = process.env.NEXT_PUBLIC_SANDBOX_WORKER_URL || "";

interface SandboxPreviewProps {
  sessionId: string;
  sandboxReady: boolean;
}

export function SandboxPreview({
  sessionId,
  sandboxReady,
}: SandboxPreviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const previewUrl = sandboxReady
    ? `${SANDBOX_WORKER_URL}/sandbox/preview?sessionId=${sessionId}`
    : "";

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
  }, []);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  const handleRefresh = useCallback(() => {
    setIsLoading(true);
    setHasError(false);
    setRefreshKey((prev) => prev + 1);
  }, []);

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Preview header */}
      <div className="flex h-8 flex-shrink-0 items-center justify-between border-border border-b bg-card/40 px-3">
        <div className="flex items-center gap-2">
          <svg
            className="h-3.5 w-3.5 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <path
              d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
            Preview
          </span>
        </div>
        <button
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          onClick={handleRefresh}
          title="Refresh preview"
          type="button"
        >
          <svg
            className="h-3.5 w-3.5"
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

      {/* Preview content */}
      <div className="relative min-h-0 flex-1">
        {!sandboxReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-background">
            <p className="text-muted-foreground text-xs">
              Waiting for sandbox to start...
            </p>
          </div>
        )}

        {sandboxReady && isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-muted-foreground text-xs">
                Loading preview...
              </p>
            </div>
          </div>
        )}

        {sandboxReady && hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background">
            <p className="text-muted-foreground text-xs">
              Preview not available yet
            </p>
            <button
              className="text-primary text-xs hover:underline"
              onClick={handleRefresh}
              type="button"
            >
              Retry
            </button>
          </div>
        )}

        {sandboxReady && previewUrl && (
          <iframe
            className={cn(
              "h-full w-full border-0",
              (isLoading || hasError) && "invisible"
            )}
            key={refreshKey}
            onError={handleError}
            onLoad={handleLoad}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            src={previewUrl}
            title="Live Preview"
          />
        )}
      </div>
    </div>
  );
}

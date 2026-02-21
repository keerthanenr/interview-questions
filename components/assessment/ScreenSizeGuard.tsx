"use client";

import { useEffect, useState } from "react";
import { APP_NAME } from "@/lib/constants";

const MIN_WIDTH = 1280;

/**
 * Shows a "please use a larger screen" message when the viewport
 * is too narrow for the assessment's three-panel layout.
 */
export function ScreenSizeGuard({ children }: { children: React.ReactNode }) {
  const [isTooSmall, setIsTooSmall] = useState(false);

  useEffect(() => {
    function check() {
      setIsTooSmall(window.innerWidth < MIN_WIDTH);
    }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (isTooSmall) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-warning/10">
          <svg
            className="h-8 w-8 text-warning"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <path
              d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2 className="mb-2 font-bold font-display text-xl">
          Larger Screen Required
        </h2>
        <p className="mb-4 max-w-sm text-muted-foreground text-sm">
          Please use a screen at least {MIN_WIDTH}px wide for the best
          assessment experience. The code editor and preview panels need more
          space.
        </p>
        <p className="text-muted-foreground text-xs">
          Current width:{" "}
          {typeof window !== "undefined" ? window.innerWidth : "—"}px
        </p>
        <p className="mt-6 text-muted-foreground text-xs">
          Powered by {APP_NAME}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

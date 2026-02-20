"use client";

import { useState, useEffect } from "react";
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
      <div className="h-screen flex flex-col items-center justify-center bg-background px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-warning/10 flex items-center justify-center mb-6">
          <svg
            className="w-8 h-8 text-warning"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25"
            />
          </svg>
        </div>
        <h2 className="text-xl font-display font-bold mb-2">
          Larger Screen Required
        </h2>
        <p className="text-sm text-muted-foreground max-w-sm mb-4">
          Please use a screen at least {MIN_WIDTH}px wide for the best
          assessment experience. The code editor and preview panels need more
          space.
        </p>
        <p className="text-xs text-muted-foreground">
          Current width: {typeof window !== "undefined" ? window.innerWidth : "—"}px
        </p>
        <p className="text-xs text-muted-foreground mt-6">
          Powered by {APP_NAME}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

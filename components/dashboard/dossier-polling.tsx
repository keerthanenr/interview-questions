"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Auto-polls the page for dossier generation status.
 * Refreshes the page every 10 seconds until the dossier appears.
 */
export function DossierPolling() {
  const router = useRouter();
  const [dots, setDots] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 10_000);

    const dotsInterval = setInterval(() => {
      setDots((prev) => (prev % 3) + 1);
    }, 600);

    return () => {
      clearInterval(interval);
      clearInterval(dotsInterval);
    };
  }, [router]);

  return (
    <div className="rounded-xl border bg-card/50 p-6 mb-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" />
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce delay-100" />
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce delay-200" />
        </div>
        <p className="text-sm text-muted-foreground">
          Generating candidate report{".".repeat(dots)}
        </p>
        <p className="text-xs text-muted-foreground">
          This usually takes 30-60 seconds. The page will update automatically.
        </p>
      </div>
    </div>
  );
}

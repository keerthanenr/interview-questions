"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
    <div className="mb-6 rounded-xl border bg-card/50 p-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-1">
          <div className="h-2 w-2 animate-bounce rounded-full bg-primary" />
          <div className="h-2 w-2 animate-bounce rounded-full bg-primary delay-100" />
          <div className="h-2 w-2 animate-bounce rounded-full bg-primary delay-200" />
        </div>
        <p className="text-muted-foreground text-sm">
          Generating candidate report{".".repeat(dots)}
        </p>
        <p className="text-muted-foreground text-xs">
          This usually takes 30-60 seconds. The page will update automatically.
        </p>
      </div>
    </div>
  );
}

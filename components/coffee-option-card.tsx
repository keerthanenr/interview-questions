"use client";

import { Star, MapPin, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { CoffeeOption } from "@/lib/db/schema";

interface CoffeeOptionCardProps {
  option: CoffeeOption;
  rank: number;
  isCreator: boolean;
  rsvpNames: Record<string, string>;
  onPick?: (placeId: string) => Promise<void>;
}

export function CoffeeOptionCard({
  option,
  rank,
  isCreator,
  rsvpNames,
  onPick,
}: CoffeeOptionCardProps) {
  const [picking, setPicking] = useState(false);

  const handlePick = async () => {
    if (!onPick) return;
    setPicking(true);
    try {
      await onPick(option.googlePlaceId);
    } finally {
      setPicking(false);
    }
  };

  // Fairness score: lower is better, map to 0-100 where 100 is perfect
  const fairnessPercent = option.fairnessScore
    ? Math.max(0, Math.min(100, 100 - (option.fairnessScore / 50)))
    : 50;

  const distances = (option.distanceScores as Record<string, number>) || {};

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3 animate-scale-in">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold shrink-0">
            {rank}
          </span>
          <div>
            <h4 className="font-semibold text-sm leading-tight">
              {option.name}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <MapPin className="size-3" />
              {option.address}
            </p>
          </div>
        </div>
        {option.rating && (
          <div className="flex items-center gap-1 text-xs shrink-0">
            <Star className="size-3 fill-primary text-primary" />
            <span className="font-medium">{option.rating.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Fairness meter */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Fairness</span>
          <span className="font-medium text-primary">
            {Math.round(fairnessPercent)}%
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full fairness-gradient transition-all duration-500"
            style={{ width: `${fairnessPercent}%` }}
          />
        </div>
      </div>

      {/* Distance to each person */}
      {Object.keys(distances).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(distances).map(([rsvpId, meters]) => (
            <span
              key={rsvpId}
              className="rounded-md bg-secondary/50 px-2 py-0.5 text-xs text-muted-foreground"
            >
              {rsvpNames[rsvpId] || "?"}: {formatDistance(meters)}
            </span>
          ))}
        </div>
      )}

      {isCreator && onPick && (
        <Button
          size="sm"
          className="w-full"
          onClick={handlePick}
          disabled={picking}
        >
          {picking ? (
            <>
              <Loader2 className="mr-2 size-3 animate-spin" />
              Picking...
            </>
          ) : (
            "Pick this spot"
          )}
        </Button>
      )}
    </div>
  );
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

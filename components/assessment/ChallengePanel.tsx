"use client";

import { Badge } from "@/components/ui/badge";

const difficultyLabels: Record<number, { label: string; color: string }> = {
  1: {
    label: "Tier 1 — Easy",
    color: "bg-success/15 text-success border-success/20",
  },
  2: {
    label: "Tier 2 — Easy-Medium",
    color: "bg-success/15 text-success border-success/20",
  },
  3: {
    label: "Tier 3 — Medium",
    color: "bg-warning/15 text-warning border-warning/20",
  },
  4: {
    label: "Tier 4 — Medium-Hard",
    color: "bg-warning/15 text-warning border-warning/20",
  },
  5: {
    label: "Tier 5 — Hard",
    color: "bg-destructive/15 text-destructive border-destructive/20",
  },
};

interface ChallengePanelProps {
  title: string;
  description: string;
  requirements: string[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  timeLimit: number;
  challengeNumber?: number;
  totalChallenges?: number;
}

export function ChallengePanel({
  title,
  description,
  requirements,
  difficulty,
  timeLimit,
  challengeNumber,
  totalChallenges,
}: ChallengePanelProps) {
  const diff = difficultyLabels[difficulty] ?? difficultyLabels[3];

  return (
    <div className="space-y-5 p-4">
      {/* Title & metadata */}
      <div className="space-y-3">
        {challengeNumber != null && totalChallenges != null && (
          <p className="font-medium text-[10px] text-muted-foreground uppercase tracking-widest">
            Challenge {challengeNumber} of {totalChallenges}
          </p>
        )}
        <h3 className="font-bold font-display text-lg leading-snug">{title}</h3>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={diff.color} variant="outline">
            {diff.label}
          </Badge>
          <Badge className="text-xs" variant="secondary">
            {timeLimit} min
          </Badge>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <h4 className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
          Description
        </h4>
        <div
          className="prose prose-sm prose-invert max-w-none prose-code:rounded prose-code:bg-primary/10 prose-code:px-1 prose-code:py-0.5 prose-code:text-primary prose-headings:text-foreground prose-p:text-foreground/85 prose-strong:text-foreground text-foreground/85 text-sm leading-relaxed"
          // biome-ignore lint: using dangerouslySetInnerHTML for markdown rendering
          dangerouslySetInnerHTML={{ __html: description }}
        />
      </div>

      {/* Requirements checklist */}
      <div className="space-y-2">
        <h4 className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
          Requirements
        </h4>
        <ul className="space-y-2">
          {requirements.map((req) => (
            <li className="flex items-start gap-2.5 text-sm" key={req}>
              <span className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border border-border" />
              <span className="text-foreground/85 leading-snug">{req}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

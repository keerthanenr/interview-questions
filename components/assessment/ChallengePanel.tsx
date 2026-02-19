"use client";

import { Badge } from "@/components/ui/badge";

const difficultyLabels: Record<number, { label: string; color: string }> = {
  1: { label: "Tier 1 — Easy", color: "bg-success/15 text-success border-success/20" },
  2: { label: "Tier 2 — Easy-Medium", color: "bg-success/15 text-success border-success/20" },
  3: { label: "Tier 3 — Medium", color: "bg-warning/15 text-warning border-warning/20" },
  4: { label: "Tier 4 — Medium-Hard", color: "bg-warning/15 text-warning border-warning/20" },
  5: { label: "Tier 5 — Hard", color: "bg-destructive/15 text-destructive border-destructive/20" },
};

interface ChallengePanelProps {
  title: string;
  description: string;
  requirements: string[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  timeLimit: number;
}

export function ChallengePanel({
  title,
  description,
  requirements,
  difficulty,
  timeLimit,
}: ChallengePanelProps) {
  const diff = difficultyLabels[difficulty] ?? difficultyLabels[3];

  return (
    <div className="p-4 space-y-5">
      {/* Title & metadata */}
      <div className="space-y-3">
        <h3 className="font-display text-lg font-bold leading-snug">{title}</h3>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={diff.color}>
            {diff.label}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {timeLimit} min
          </Badge>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Description
        </h4>
        <div
          className="text-sm text-foreground/85 leading-relaxed prose prose-sm prose-invert max-w-none
            prose-headings:text-foreground prose-p:text-foreground/85 prose-strong:text-foreground
            prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded"
          // biome-ignore lint: using dangerouslySetInnerHTML for markdown rendering
          dangerouslySetInnerHTML={{ __html: description }}
        />
      </div>

      {/* Requirements checklist */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Requirements
        </h4>
        <ul className="space-y-2">
          {requirements.map((req) => (
            <li key={req} className="flex items-start gap-2.5 text-sm">
              <span className="mt-0.5 w-4 h-4 rounded border border-border flex-shrink-0" />
              <span className="text-foreground/85 leading-snug">{req}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

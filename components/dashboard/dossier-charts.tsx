"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

export function DossierCharts({
  breakdown,
}: {
  breakdown: Record<string, number>;
}) {
  const data = Object.entries(breakdown).map(([key, value]) => ({
    subject: key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    score: value,
    fullMark: 10,
  }));

  if (data.length === 0) return null;

  // Use radar chart if 3+ dimensions, otherwise bar-style display
  if (data.length >= 3) {
    return (
      <ResponsiveContainer height={220} width="100%">
        <RadarChart cx="50%" cy="50%" data={data} outerRadius="70%">
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 10]}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
          />
          <Radar
            dataKey="score"
            fill="hsl(var(--primary))"
            fillOpacity={0.2}
            name="Score"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    );
  }

  // Fallback: simple bar display
  return (
    <div className="space-y-2">
      {data.map((item) => (
        <div className="flex items-center gap-3" key={item.subject}>
          <span className="w-28 truncate text-muted-foreground text-xs">
            {item.subject}
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${(item.score / 10) * 100}%` }}
            />
          </div>
          <span className="w-8 text-right font-medium text-xs">
            {item.score.toFixed(1)}
          </span>
        </div>
      ))}
    </div>
  );
}

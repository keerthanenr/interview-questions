"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
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
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
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
            name="Score"
            dataKey="score"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.2}
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
        <div key={item.subject} className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-28 truncate">
            {item.subject}
          </span>
          <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${(item.score / 10) * 100}%` }}
            />
          </div>
          <span className="text-xs font-medium w-8 text-right">
            {item.score.toFixed(1)}
          </span>
        </div>
      ))}
    </div>
  );
}

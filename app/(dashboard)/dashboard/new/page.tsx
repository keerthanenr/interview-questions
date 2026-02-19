"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const CHALLENGE_POOL = [
  { name: "Interactive Todo List", tier: 1, topic: "useState, event handling" },
  { name: "Data Fetching Dashboard", tier: 2, topic: "useEffect, async/await" },
  { name: "Form with Validation", tier: 3, topic: "Controlled components, custom hooks" },
  { name: "Virtualized Infinite Scroll", tier: 4, topic: "Performance, intersection observer" },
  { name: "Real-time Collaborative Counter", tier: 5, topic: "useReducer, context API" },
];

const tierColors: Record<number, string> = {
  1: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  2: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  3: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  4: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  5: "bg-rose-500/15 text-rose-400 border-rose-500/30",
};

export default function NewAssessmentPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [useDefaultTimes, setUseDefaultTimes] = useState(true);
  const [adaptiveDifficulty, setAdaptiveDifficulty] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/assess/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          settings: {
            useDefaultTimes,
            adaptiveDifficulty,
          },
        }),
      });

      if (!res.ok) throw new Error("Failed to create assessment");
      router.push("/dashboard");
      router.refresh();
    } catch {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Create Assessment</h1>
        <p className="text-sm text-muted-foreground">
          Set up a new assessment for evaluating React developers.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title">Assessment Title</Label>
          <Input
            id="title"
            placeholder="e.g. Senior React Developer - Q1 2026"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        {/* Challenge Pool */}
        <div className="space-y-3">
          <div>
            <Label>Challenge Pool</Label>
            <p className="text-xs text-muted-foreground mt-1">
              React Fundamentals — 5 challenges, Tiers 1–5
            </p>
          </div>
          <div className="rounded-xl border bg-card/50 divide-y">
            {CHALLENGE_POOL.map((challenge) => (
              <div key={challenge.name} className="flex items-center gap-3 px-4 py-3">
                <Badge variant="outline" className={tierColors[challenge.tier]}>
                  Tier {challenge.tier}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{challenge.name}</p>
                  <p className="text-xs text-muted-foreground">{challenge.topic}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Settings */}
        <div className="space-y-4">
          <Label>Settings</Label>

          <label className="flex items-center justify-between rounded-lg border px-4 py-3 cursor-pointer hover:bg-secondary/50 transition-colors">
            <div>
              <p className="text-sm font-medium">Use default time limits</p>
              <p className="text-xs text-muted-foreground">Build: 30min, Explain: 12min, Review: 15min</p>
            </div>
            <input
              type="checkbox"
              checked={useDefaultTimes}
              onChange={(e) => setUseDefaultTimes(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary"
            />
          </label>

          <label className="flex items-center justify-between rounded-lg border px-4 py-3 cursor-pointer hover:bg-secondary/50 transition-colors">
            <div>
              <p className="text-sm font-medium">Adaptive difficulty</p>
              <p className="text-xs text-muted-foreground">Automatically adjust challenge difficulty based on performance</p>
            </div>
            <input
              type="checkbox"
              checked={adaptiveDifficulty}
              onChange={(e) => setAdaptiveDifficulty(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary"
            />
          </label>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" disabled={!title.trim() || isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Assessment"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

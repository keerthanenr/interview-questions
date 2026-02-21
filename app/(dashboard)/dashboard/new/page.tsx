"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CHALLENGE_POOL = [
  { name: "Interactive Todo List", tier: 1, topic: "useState, event handling" },
  { name: "Data Fetching Dashboard", tier: 2, topic: "useEffect, async/await" },
  {
    name: "Form with Validation",
    tier: 3,
    topic: "Controlled components, custom hooks",
  },
  {
    name: "Virtualized Infinite Scroll",
    tier: 4,
    topic: "Performance, intersection observer",
  },
  {
    name: "Real-time Collaborative Counter",
    tier: 5,
    topic: "useReducer, context API",
  },
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
    <div className="max-w-2xl p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="mb-1 font-bold text-2xl">Create Assessment</h1>
        <p className="text-muted-foreground text-sm">
          Set up a new assessment for evaluating React developers.
        </p>
      </div>

      <form className="space-y-8" onSubmit={handleSubmit}>
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title">Assessment Title</Label>
          <Input
            id="title"
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Senior React Developer - Q1 2026"
            required
            value={title}
          />
        </div>

        {/* Challenge Pool */}
        <div className="space-y-3">
          <div>
            <Label>Challenge Pool</Label>
            <p className="mt-1 text-muted-foreground text-xs">
              React Fundamentals — 5 challenges, Tiers 1–5
            </p>
          </div>
          <div className="divide-y rounded-xl border bg-card/50">
            {CHALLENGE_POOL.map((challenge) => (
              <div
                className="flex items-center gap-3 px-4 py-3"
                key={challenge.name}
              >
                <Badge className={tierColors[challenge.tier]} variant="outline">
                  Tier {challenge.tier}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm">{challenge.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {challenge.topic}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Settings */}
        <div className="space-y-4">
          <Label>Settings</Label>

          <label className="flex cursor-pointer items-center justify-between rounded-lg border px-4 py-3 transition-colors hover:bg-secondary/50">
            <div>
              <p className="font-medium text-sm">Use default time limits</p>
              <p className="text-muted-foreground text-xs">
                Build: 30min, Explain: 12min, Review: 15min
              </p>
            </div>
            <input
              checked={useDefaultTimes}
              className="h-4 w-4 rounded border-border accent-primary"
              onChange={(e) => setUseDefaultTimes(e.target.checked)}
              type="checkbox"
            />
          </label>

          <label className="flex cursor-pointer items-center justify-between rounded-lg border px-4 py-3 transition-colors hover:bg-secondary/50">
            <div>
              <p className="font-medium text-sm">Adaptive difficulty</p>
              <p className="text-muted-foreground text-xs">
                Automatically adjust challenge difficulty based on performance
              </p>
            </div>
            <input
              checked={adaptiveDifficulty}
              className="h-4 w-4 rounded border-border accent-primary"
              onChange={(e) => setAdaptiveDifficulty(e.target.checked)}
              type="checkbox"
            />
          </label>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button disabled={!title.trim() || isSubmitting} type="submit">
            {isSubmitting ? "Creating..." : "Create Assessment"}
          </Button>
          <Button onClick={() => router.back()} type="button" variant="ghost">
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

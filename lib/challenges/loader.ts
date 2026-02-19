import fs from "node:fs/promises";
import path from "node:path";

export interface Challenge {
  id: string;
  title: string;
  tier: number;
  timeLimit: number;
  topics: string[];
  description: string;
  requirements: string[];
  starterCode: Record<string, string>;
  testCases: string[];
}

export async function getChallenge(challengeId: string): Promise<Challenge> {
  const filePath = path.join(
    process.cwd(),
    "data",
    "challenges",
    `${challengeId}.json`,
  );
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw) as Challenge;
}

export async function getChallengePool(): Promise<Challenge[]> {
  const dir = path.join(process.cwd(), "data", "challenges");
  const files = await fs.readdir(dir);
  const challenges = await Promise.all(
    files
      .filter((f) => f.endsWith(".json"))
      .map(async (f) => {
        const raw = await fs.readFile(path.join(dir, f), "utf-8");
        return JSON.parse(raw) as Challenge;
      }),
  );
  return challenges.sort((a, b) => a.tier - b.tier);
}

export async function getChallengeForSession(session: {
  metadata: Record<string, unknown>;
}): Promise<Challenge> {
  // MVP: use challengeId from session metadata, or default to todo-list
  // Session 5 will add adaptive challenge selection based on performance
  const challengeId =
    (session.metadata?.challengeId as string) ?? "todo-list";
  return getChallenge(challengeId);
}

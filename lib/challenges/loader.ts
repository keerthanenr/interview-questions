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
  // Check if the adaptive engine has stored the current challenge
  const metadata = session.metadata ?? {};
  const challengeResults = metadata.challengeResults as
    | { challengeId: string }[]
    | undefined;
  const currentIndex = (metadata.currentChallengeIndex as number) ?? 0;

  // If we have challenge results and a current index > 0, the adaptive engine
  // has been running — load the last decided challenge
  if (challengeResults && challengeResults.length > 0 && currentIndex > 0) {
    const lastResult = challengeResults[challengeResults.length - 1];
    return getChallenge(lastResult.challengeId);
  }

  // Default: use challengeId from metadata, fall back to data-dashboard (tier 2)
  const challengeId =
    (metadata.challengeId as string) ?? "data-dashboard";
  return getChallenge(challengeId);
}

import collabCounter from "@/data/challenges/collaborative-counter.json" with {
  type: "json",
};
import dataDashboard from "@/data/challenges/data-dashboard.json" with {
  type: "json",
};
import formValidation from "@/data/challenges/form-validation.json" with {
  type: "json",
};
import infiniteScroll from "@/data/challenges/infinite-scroll.json" with {
  type: "json",
};
import todoDB from "@/data/challenges/todo-list.json" with { type: "json" };

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

const CHALLENGES: Record<string, Challenge> = {
  "todo-list": todoDB as unknown as Challenge,
  "data-dashboard": dataDashboard as unknown as Challenge,
  "form-validation": formValidation as unknown as Challenge,
  "infinite-scroll": infiniteScroll as unknown as Challenge,
  "collaborative-counter": collabCounter as unknown as Challenge,
};

export async function getChallenge(challengeId: string): Promise<Challenge> {
  const challenge = CHALLENGES[challengeId];
  if (!challenge) {
    throw new Error(`Challenge not found: ${challengeId}`);
  }
  return challenge;
}

export async function getChallengePool(): Promise<Challenge[]> {
  return Object.values(CHALLENGES).sort((a, b) => a.tier - b.tier);
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
  const challengeId = (metadata.challengeId as string) ?? "data-dashboard";
  return getChallenge(challengeId);
}

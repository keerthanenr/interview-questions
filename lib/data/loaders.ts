import fs from "node:fs/promises";
import path from "node:path";

/**
 * Load the review scenario JSON from the data directory.
 * Uses fs.readFile because the JSON contains unicode escape sequences
 * in embedded code strings that break when bundled as a JSON import.
 */
export async function loadReviewScenario() {
  const filePath = path.join(
    process.cwd(),
    "data",
    "review-scenarios",
    "react-dashboard-mr.json"
  );
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw);
}

/**
 * Load fallback questions for when AI question generation fails.
 */
export async function loadFallbackQuestions() {
  const filePath = path.join(process.cwd(), "data", "fallback-questions.json");
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw);
}

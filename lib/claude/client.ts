import Anthropic from "@anthropic-ai/sdk";
import {
  QUESTION_GENERATION_RETRY_SUFFIX,
  QUICKFIRE_GRADING_PROMPT,
} from "./prompts";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Stream a chat conversation with Claude.
 */
export async function streamChat(
  messages: Anthropic.MessageParam[],
  systemPrompt: string,
) {
  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: systemPrompt,
    messages,
  });

  return stream;
}

export interface QuickfireQuestion {
  id: string;
  type:
    | "multiple_choice"
    | "free_text"
    | "consequence_prediction"
    | "bug_identification";
  difficulty: 1 | 2 | 3;
  question: string;
  codeReference?: string;
  timeLimitSeconds: number;
  options?: {
    a: string;
    b: string;
    c: string;
    d: string;
  };
  correctAnswer?: string;
  gradingCriteria?: string;
}

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const arrayStart = text.indexOf("[");
  const arrayEnd = text.lastIndexOf("]");
  if (arrayStart !== -1 && arrayEnd !== -1) {
    return text.slice(arrayStart, arrayEnd + 1);
  }
  const objStart = text.indexOf("{");
  const objEnd = text.lastIndexOf("}");
  if (objStart !== -1 && objEnd !== -1) {
    return text.slice(objStart, objEnd + 1);
  }
  return text.trim();
}

function validateQuestions(parsed: unknown): parsed is QuickfireQuestion[] {
  if (!Array.isArray(parsed)) return false;
  if (parsed.length === 0) return false;
  return parsed.every(
    (q) =>
      typeof q === "object" &&
      q !== null &&
      "type" in q &&
      "question" in q &&
      "timeLimitSeconds" in q,
  );
}

/**
 * Generate quickfire questions from candidate-submitted code.
 * Retries once on malformed JSON. Returns null on total failure.
 */
export async function generateQuestions(
  code: string,
  systemPrompt: string,
): Promise<QuickfireQuestion[] | null> {
  const userMessage = `Analyze the following React code and generate targeted questions:\n\n${code}`;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const prompt =
        attempt === 0
          ? systemPrompt
          : systemPrompt + QUESTION_GENERATION_RETRY_SUFFIX;

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: prompt,
        messages: [{ role: "user", content: userMessage }],
      });

      const textBlock = response.content.find(
        (block) => block.type === "text",
      );
      if (!textBlock || textBlock.type !== "text") continue;

      const jsonStr = extractJson(textBlock.text);
      const parsed = JSON.parse(jsonStr);

      if (validateQuestions(parsed)) {
        return parsed;
      }
    } catch {
      if (attempt === 1) return null;
    }
  }

  return null;
}

/**
 * Grade a free-text quickfire response using Claude.
 */
export async function gradeResponse(
  question: string,
  candidateResponse: string,
  codeReference: string,
  responseTimeMs: number,
  gradingCriteria: string,
): Promise<{ correct: boolean; score: number; feedback: string }> {
  const prompt = QUICKFIRE_GRADING_PROMPT.replace("{question}", question)
    .replace("{codeReference}", codeReference || "N/A")
    .replace("{response}", candidateResponse || "(no answer)")
    .replace("{responseTimeMs}", String(responseTimeMs || 0))
    .replace("{gradingCriteria}", gradingCriteria || "");

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system:
        "You are a fair technical grader. Return ONLY valid JSON, no markdown.",
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { correct: false, score: 0, feedback: "Grading failed" };
    }

    const jsonStr = extractJson(textBlock.text);
    const result = JSON.parse(jsonStr);

    return {
      correct: Boolean(result.correct),
      score: Number(result.score) || 0,
      feedback: String(result.feedback || ""),
    };
  } catch {
    return { correct: false, score: 0, feedback: "Grading error" };
  }
}

import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Stream a chat conversation with Claude.
 *
 * @param messages - Array of message objects with role and content
 * @param systemPrompt - System prompt to guide Claude's behavior
 * @returns A streaming response from Claude
 */
export async function streamChat(
  messages: Anthropic.MessageParam[],
  systemPrompt: string,
) {
  // TODO: Implement streaming response using anthropic.messages.stream()
  // Should return a stream that the caller can pipe to the client
  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: systemPrompt,
    messages,
  });

  return stream;
}

/**
 * Generate quickfire questions from candidate-submitted code.
 *
 * @param code - The candidate's submitted code
 * @param systemPrompt - System prompt for question generation
 * @returns Parsed JSON array of questions
 */
export async function generateQuestions(
  code: string,
  systemPrompt: string,
): Promise<unknown[]> {
  // TODO: Implement question generation
  // Should send code to Claude with the question generation system prompt
  // Parse the response as JSON and return the questions array
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Analyze the following React code and generate targeted questions:\n\n${code}`,
      },
    ],
  });

  // TODO: Parse the response content as JSON
  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") return [];

  try {
    return JSON.parse(textBlock.text) as unknown[];
  } catch {
    return [];
  }
}

/**
 * Grade a free-text quickfire response.
 *
 * @param question - The question that was asked
 * @param candidateResponse - The candidate's answer
 * @param code - The original code for context
 * @returns Grading result with score and feedback
 */
export async function gradeResponse(
  question: string,
  candidateResponse: string,
  code: string,
): Promise<{ score: number; feedback: string }> {
  // TODO: Implement response grading
  // Send the question, response, and code context to Claude
  // Parse the grading result
  return { score: 0, feedback: "Not yet implemented" };
}

import { generateQuestions } from "@/lib/claude/client";
import {
  QUESTION_GENERATION_PROMPT,
  MULTI_CHALLENGE_QUESTION_PREFIX,
} from "@/lib/claude/prompts";
import { logEvent } from "@/lib/events/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import fs from "node:fs/promises";
import path from "node:path";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { sessionId, code } = await request.json();

    if (!sessionId) {
      return Response.json(
        { error: "sessionId is required" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    // Check if questions already exist in session metadata (prevent regen on refresh)
    const { data: session } = await supabase
      .from("sessions")
      .select("metadata")
      .eq("id", sessionId)
      .single();

    const metadata = (session?.metadata as Record<string, unknown>) ?? {};

    if (metadata.questions && Array.isArray(metadata.questions)) {
      return Response.json({ questions: metadata.questions });
    }

    // Fetch ALL build submissions for this session (multi-challenge support)
    const { data: submissions } = await supabase
      .from("submissions")
      .select("code, metadata")
      .eq("session_id", sessionId)
      .eq("phase", "build")
      .order("created_at", { ascending: true });

    // Build combined code context from all submissions
    let combinedCode = code ?? "";
    if (submissions && submissions.length > 0) {
      const codeBlocks = submissions.map((s, i) => {
        const meta = (s.metadata as Record<string, unknown>) ?? {};
        const challengeId = (meta.challenge_id as string) ?? `challenge-${i + 1}`;
        return `// ─── Challenge: ${challengeId} ───\n${s.code ?? ""}`;
      });
      combinedCode = codeBlocks.join("\n\n");
    }

    if (!combinedCode.trim()) {
      return Response.json(
        { error: "No code submissions found" },
        { status: 400 },
      );
    }

    // Build the prompt — use multi-challenge prefix if multiple submissions
    const isMultiChallenge = submissions && submissions.length > 1;
    const prompt = isMultiChallenge
      ? `${MULTI_CHALLENGE_QUESTION_PREFIX}\n\n${QUESTION_GENERATION_PROMPT}`
      : QUESTION_GENERATION_PROMPT;

    // Check for high AI reliance flag to adjust question difficulty
    const highAIReliance = metadata.highAIRelianceFlag === true;
    const finalPrompt = highAIReliance
      ? `${prompt}\n\nIMPORTANT: This candidate showed high reliance on AI-generated code. Focus questions on understanding WHY specific patterns were used, edge cases, and what would happen if the code were modified. Ask harder questions about portions that appear to be AI-generated.`
      : prompt;

    const questions = await generateQuestions(combinedCode, finalPrompt);

    if (questions && questions.length > 0) {
      await supabase
        .from("sessions")
        .update({ metadata: { ...metadata, questions } })
        .eq("id", sessionId);

      return Response.json({ questions });
    }

    // Fall back to generic questions
    const fallbackRaw = await fs.readFile(
      path.join(process.cwd(), "data", "fallback-questions.json"),
      "utf-8",
    );
    const fallbackQuestions = JSON.parse(fallbackRaw);

    logEvent({
      sessionId,
      eventType: "challenge_submitted",
      payload: {
        error: "question_generation_failed",
        fell_back: true,
        timestamp: new Date().toISOString(),
      },
    });

    await supabase
      .from("sessions")
      .update({ metadata: { ...metadata, questions: fallbackQuestions } })
      .eq("id", sessionId);

    return Response.json({ questions: fallbackQuestions });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

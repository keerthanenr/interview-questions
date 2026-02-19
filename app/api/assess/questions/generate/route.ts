import { generateQuestions } from "@/lib/claude/client";
import { QUESTION_GENERATION_PROMPT } from "@/lib/claude/prompts";
import { logEvent } from "@/lib/events/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import fs from "node:fs/promises";
import path from "node:path";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { sessionId, code } = await request.json();

    if (!sessionId || !code) {
      return Response.json(
        { error: "sessionId and code are required" },
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

    // Generate questions from candidate's code
    const questions = await generateQuestions(code, QUESTION_GENERATION_PROMPT);

    if (questions && questions.length > 0) {
      // Save generated questions to session metadata
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

    // Save fallback to session metadata
    await supabase
      .from("sessions")
      .update({ metadata: { ...metadata, questions: fallbackQuestions } })
      .eq("id", sessionId);

    return Response.json({ questions: fallbackQuestions });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

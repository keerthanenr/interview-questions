import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateToken, getBaseUrl } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { assessmentId, email, fullName } = await request.json();

    if (!assessmentId || !email?.trim()) {
      return Response.json(
        { error: "assessmentId and email are required" },
        { status: 400 }
      );
    }

    const token = generateToken();

    const { data: candidate, error } = await supabase
      .from("candidates")
      .insert({
        assessment_id: assessmentId,
        email: email.trim(),
        full_name: fullName?.trim() || null,
        token,
        status: "invited",
      })
      .select()
      .single();

    if (error) {
      return Response.json(
        { error: "Failed to invite candidate" },
        { status: 500 }
      );
    }

    const appUrl = getBaseUrl();
    const assessmentLink = `${appUrl}/assess/${token}`;

    return Response.json({ candidate, assessmentLink });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

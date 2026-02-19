import { createClient } from "@/lib/supabase/server";
import type { NextRequest } from "next/server";

const DEFAULT_CHALLENGE_POOL = [
  "todo-list-filtering",
  "data-fetching-dashboard",
  "form-with-validation",
  "virtualized-infinite-scroll",
  "realtime-collaborative-counter",
];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's org
    const { data: dbUser } = await supabase
      .from("users")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (!dbUser) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const { title, settings } = await request.json();

    if (!title?.trim()) {
      return Response.json({ error: "Title is required" }, { status: 400 });
    }

    const { data: assessment, error } = await supabase
      .from("assessments")
      .insert({
        org_id: dbUser.org_id,
        created_by: user.id,
        title: title.trim(),
        challenge_pool: DEFAULT_CHALLENGE_POOL,
        settings: settings ?? {},
        status: "active",
      })
      .select()
      .single();

    if (error) {
      return Response.json(
        { error: "Failed to create assessment" },
        { status: 500 },
      );
    }

    return Response.json({ assessment });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

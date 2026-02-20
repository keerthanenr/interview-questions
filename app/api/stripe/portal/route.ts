import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/config";
import { getBaseUrl } from "@/lib/utils";
import type { NextRequest } from "next/server";

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

    // Get org's stripe customer ID
    const { data: org } = await supabase
      .from("organizations")
      .select("stripe_customer_id")
      .eq("id", dbUser.org_id)
      .single();

    if (!org?.stripe_customer_id) {
      return Response.json(
        { error: "No billing account found. Subscribe to a plan first." },
        { status: 400 },
      );
    }

    const origin = getBaseUrl(request.headers.get("origin"));

    const portalSession = await getStripe().billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: `${origin}/dashboard/billing`,
    });

    return Response.json({ url: portalSession.url });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

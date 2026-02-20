import { createClient } from "@/lib/supabase/server";
import { getStripe, PLANS, type PlanId } from "@/lib/stripe/config";
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

    const { planId } = (await request.json()) as { planId: string };

    if (planId !== "starter" && planId !== "professional") {
      return Response.json(
        { error: "Invalid plan. Choose starter or professional." },
        { status: 400 },
      );
    }

    const plan = PLANS[planId as PlanId];

    // Get user's org
    const { data: dbUser } = await supabase
      .from("users")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (!dbUser) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const origin = request.headers.get("origin") ?? "http://localhost:3000";

    const checkoutSession = await getStripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price: plan.priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/dashboard/billing?success=true`,
      cancel_url: `${origin}/dashboard/billing?canceled=true`,
      customer_email: user.email,
      metadata: {
        orgId: dbUser.org_id,
      },
      subscription_data: {
        metadata: {
          orgId: dbUser.org_id,
        },
      },
    });

    return Response.json({ url: checkoutSession.url });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

import type { NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe, PLANS } from "@/lib/stripe/config";
import { createAdminClient } from "@/lib/supabase/admin";

/** Map a Stripe price ID back to the plan name. */
function planFromPriceId(priceId: string): string | null {
  for (const [key, plan] of Object.entries(PLANS)) {
    if (plan.priceId === priceId) return key;
  }
  return null;
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return Response.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  switch (event.type) {
    // ── Checkout completed ──────────────────────────────────────────
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const orgId = session.metadata?.orgId;
      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id;

      if (!orgId) break;

      // Retrieve subscription to find the price and therefore the plan
      let plan: string | null = null;

      if (session.subscription) {
        const subId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id;
        const subscription = await getStripe().subscriptions.retrieve(subId);
        const priceId = subscription.items.data[0]?.price?.id;
        if (priceId) plan = planFromPriceId(priceId);
      }

      await supabase
        .from("organizations")
        .update({
          ...(plan ? { plan } : {}),
          ...(customerId ? { stripe_customer_id: customerId } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("id", orgId);

      break;
    }

    // ── Subscription updated (plan change / upgrade / downgrade) ───
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const orgId = subscription.metadata?.orgId;

      if (!orgId) break;

      const priceId = subscription.items.data[0]?.price?.id;
      const plan = priceId ? planFromPriceId(priceId) : null;

      if (plan) {
        await supabase
          .from("organizations")
          .update({ plan, updated_at: new Date().toISOString() })
          .eq("id", orgId);
      }

      break;
    }

    // ── Subscription deleted (canceled) ────────────────────────────
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const orgId = subscription.metadata?.orgId;

      if (!orgId) break;

      await supabase
        .from("organizations")
        .update({ plan: "starter", updated_at: new Date().toISOString() })
        .eq("id", orgId);

      break;
    }
  }

  return Response.json({ received: true });
}

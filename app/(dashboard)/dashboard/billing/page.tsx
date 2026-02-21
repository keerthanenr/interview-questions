import { BillingClient } from "@/components/dashboard/billing-client";
import { checkAssessmentLimit } from "@/lib/billing/limits";
import { PLANS } from "@/lib/stripe/config";
import { createClient } from "@/lib/supabase/server";

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Get user's org
  const { data: dbUser } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (!dbUser) return null;

  const { data: org } = await supabase
    .from("organizations")
    .select("plan, stripe_customer_id, name")
    .eq("id", dbUser.org_id)
    .single();

  const currentPlan = (org?.plan ?? "starter") as keyof typeof PLANS;
  const hasStripeCustomer = !!org?.stripe_customer_id;

  // Get usage for the current billing period
  const usage = await checkAssessmentLimit(dbUser.org_id);

  return (
    <div className="max-w-5xl p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="mb-1 font-bold text-2xl">Billing</h1>
        <p className="text-muted-foreground text-sm">
          Manage your subscription and monitor usage for{" "}
          <span className="font-medium text-foreground">
            {org?.name ?? "your organization"}
          </span>
          .
        </p>
      </div>

      <BillingClient
        currentPlan={currentPlan}
        hasStripeCustomer={hasStripeCustomer}
        plans={PLANS}
        usage={usage}
      />
    </div>
  );
}

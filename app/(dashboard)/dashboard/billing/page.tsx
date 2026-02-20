import { createClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/stripe/config";
import { checkAssessmentLimit } from "@/lib/billing/limits";
import { BillingClient } from "@/components/dashboard/billing-client";

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
    <div className="p-6 lg:p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Billing</h1>
        <p className="text-sm text-muted-foreground">
          Manage your subscription and monitor usage for{" "}
          <span className="text-foreground font-medium">{org?.name ?? "your organization"}</span>.
        </p>
      </div>

      <BillingClient
        currentPlan={currentPlan}
        hasStripeCustomer={hasStripeCustomer}
        usage={usage}
        plans={PLANS}
      />
    </div>
  );
}

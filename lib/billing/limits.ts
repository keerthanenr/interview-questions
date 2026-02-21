import { PLANS } from "@/lib/stripe/config";
import { createAdminClient } from "@/lib/supabase/admin";

export async function checkAssessmentLimit(
  orgId: string
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const supabase = createAdminClient();

  // Get org plan
  const { data: org } = await supabase
    .from("organizations")
    .select("plan")
    .eq("id", orgId)
    .single();

  const plan = (org?.plan ?? "starter") as keyof typeof PLANS;
  const limit = PLANS[plan].assessmentsPerMonth;

  if (limit === Number.POSITIVE_INFINITY) {
    return { allowed: true, used: 0, limit: Number.POSITIVE_INFINITY };
  }

  // Get all assessment IDs for this org
  const { data: assessments } = await supabase
    .from("assessments")
    .select("id")
    .eq("org_id", orgId);

  if (!assessments || assessments.length === 0) {
    return { allowed: true, used: 0, limit };
  }

  const assessmentIds = assessments.map((a) => a.id);

  // Count completed candidates this month for those assessments
  const now = new Date();
  const monthStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  ).toISOString();

  const { count } = await supabase
    .from("candidates")
    .select("*", { count: "exact", head: true })
    .eq("status", "completed")
    .gte("completed_at", monthStart)
    .in("assessment_id", assessmentIds);

  const used = count ?? 0;

  return { allowed: used < limit, used, limit };
}

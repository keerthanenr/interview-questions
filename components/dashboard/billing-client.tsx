"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PlanData = {
  name: string;
  priceId: string;
  price: number;
  currency: string;
  assessmentsPerMonth: number;
  features: readonly string[];
};

interface BillingClientProps {
  currentPlan: string;
  hasStripeCustomer: boolean;
  usage: { allowed: boolean; used: number; limit: number };
  plans: Record<string, PlanData>;
}

export function BillingClient({
  currentPlan,
  hasStripeCustomer,
  usage,
  plans,
}: BillingClientProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleCheckout = async (planId: string) => {
    setLoading(planId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setLoading(null);
    }
  };

  const handlePortal = async () => {
    setLoading("portal");
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setLoading(null);
    }
  };

  const usagePercent =
    usage.limit === Number.POSITIVE_INFINITY
      ? 0
      : Math.min(Math.round((usage.used / usage.limit) * 100), 100);

  const usageColor =
    usagePercent >= 90
      ? "bg-destructive"
      : usagePercent >= 70
        ? "bg-warning"
        : "bg-primary";

  const planOrder = ["starter", "professional", "enterprise"] as const;

  return (
    <div className="space-y-8">
      {/* ── Usage meter ──────────────────────────────────────────── */}
      <section className="rounded-xl border bg-card/50 p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="mb-0.5 font-semibold text-base">Monthly Usage</h2>
            <p className="text-muted-foreground text-xs">
              Completed assessments this billing period
            </p>
          </div>
          <Badge
            className="border-primary/30 bg-primary/10 text-primary"
            variant="outline"
          >
            {plans[currentPlan]?.name ?? "Starter"} plan
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium tabular-nums">
              {usage.used}{" "}
              <span className="font-normal text-muted-foreground">
                /{" "}
                {usage.limit === Number.POSITIVE_INFINITY
                  ? "Unlimited"
                  : usage.limit}
              </span>
            </span>
            {usage.limit !== Number.POSITIVE_INFINITY && (
              <span className="text-muted-foreground text-xs">
                {usagePercent}% used
              </span>
            )}
          </div>

          {usage.limit !== Number.POSITIVE_INFINITY && (
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  usageColor
                )}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          )}

          {usage.limit === Number.POSITIVE_INFINITY && (
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div className="h-full w-full animate-shimmer rounded-full bg-primary/40" />
            </div>
          )}
        </div>

        {!usage.allowed && (
          <p className="mt-3 font-medium text-destructive text-xs">
            You have reached your monthly assessment limit. Upgrade your plan to
            continue.
          </p>
        )}
      </section>

      {/* ── Manage subscription ──────────────────────────────────── */}
      {hasStripeCustomer && (
        <section className="rounded-xl border bg-card/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="mb-0.5 font-semibold text-base">
                Manage Subscription
              </h2>
              <p className="text-muted-foreground text-xs">
                Update payment method, view invoices, or cancel your
                subscription
              </p>
            </div>
            <Button
              disabled={loading === "portal"}
              onClick={handlePortal}
              variant="outline"
            >
              {loading === "portal" ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      fill="currentColor"
                    />
                  </svg>
                  Opening...
                </span>
              ) : (
                "Open Billing Portal"
              )}
            </Button>
          </div>
        </section>
      )}

      {/* ── Plan cards ───────────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 font-semibold text-base">Plans</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {planOrder.map((planId) => {
            const plan = plans[planId];
            if (!plan) return null;
            const isCurrent = planId === currentPlan;
            const isEnterprise = planId === "enterprise";

            return (
              <div
                className={cn(
                  "flex flex-col rounded-xl border p-5 transition-colors",
                  isCurrent
                    ? "border-primary/50 bg-primary/5"
                    : "bg-card/50 hover:border-muted-foreground/30"
                )}
                key={planId}
              >
                <div className="mb-3 flex items-center gap-2">
                  <h3 className="font-semibold">{plan.name}</h3>
                  {isCurrent && (
                    <Badge className="border-primary/30 bg-primary/20 text-[10px] text-primary">
                      Current
                    </Badge>
                  )}
                </div>

                <div className="mb-4">
                  {isEnterprise ? (
                    <span className="font-bold text-2xl">Custom</span>
                  ) : (
                    <>
                      <span className="font-bold text-2xl">
                        &pound;{plan.price}
                      </span>
                      <span className="text-muted-foreground text-sm">
                        /month
                      </span>
                    </>
                  )}
                </div>

                <ul className="mb-6 flex-1 space-y-2">
                  {plan.features.map((feature) => (
                    <li
                      className="flex items-start gap-2 text-muted-foreground text-sm"
                      key={feature}
                    >
                      <svg
                        className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M4.5 12.75l6 6 9-13.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <Button className="w-full" disabled variant="outline">
                    Current plan
                  </Button>
                ) : isEnterprise ? (
                  <Button
                    className="w-full"
                    onClick={() =>
                      window.open("mailto:sales@reactassess.com", "_blank")
                    }
                    variant="outline"
                  >
                    Contact Sales
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    disabled={loading === planId}
                    onClick={() => handleCheckout(planId)}
                  >
                    {loading === planId ? (
                      <span className="flex items-center gap-2">
                        <svg
                          className="h-4 w-4 animate-spin"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            fill="currentColor"
                          />
                        </svg>
                        Redirecting...
                      </span>
                    ) : (
                      `Upgrade to ${plan.name}`
                    )}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

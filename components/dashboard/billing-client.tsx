"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    usage.limit === Infinity
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
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold mb-0.5">Monthly Usage</h2>
            <p className="text-xs text-muted-foreground">
              Completed assessments this billing period
            </p>
          </div>
          <Badge
            variant="outline"
            className="bg-primary/10 text-primary border-primary/30"
          >
            {plans[currentPlan]?.name ?? "Starter"} plan
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium tabular-nums">
              {usage.used}{" "}
              <span className="text-muted-foreground font-normal">
                / {usage.limit === Infinity ? "Unlimited" : usage.limit}
              </span>
            </span>
            {usage.limit !== Infinity && (
              <span className="text-xs text-muted-foreground">
                {usagePercent}% used
              </span>
            )}
          </div>

          {usage.limit !== Infinity && (
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  usageColor,
                )}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          )}

          {usage.limit === Infinity && (
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div className="h-full w-full rounded-full bg-primary/40 animate-shimmer" />
            </div>
          )}
        </div>

        {!usage.allowed && (
          <p className="mt-3 text-xs text-destructive font-medium">
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
              <h2 className="text-base font-semibold mb-0.5">
                Manage Subscription
              </h2>
              <p className="text-xs text-muted-foreground">
                Update payment method, view invoices, or cancel your subscription
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handlePortal}
              disabled={loading === "portal"}
            >
              {loading === "portal" ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 animate-spin"
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
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
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
        <h2 className="text-base font-semibold mb-4">Plans</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {planOrder.map((planId) => {
            const plan = plans[planId];
            if (!plan) return null;
            const isCurrent = planId === currentPlan;
            const isEnterprise = planId === "enterprise";

            return (
              <div
                key={planId}
                className={cn(
                  "rounded-xl border p-5 flex flex-col transition-colors",
                  isCurrent
                    ? "border-primary/50 bg-primary/5"
                    : "bg-card/50 hover:border-muted-foreground/30",
                )}
              >
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="font-semibold">{plan.name}</h3>
                  {isCurrent && (
                    <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">
                      Current
                    </Badge>
                  )}
                </div>

                <div className="mb-4">
                  {isEnterprise ? (
                    <span className="text-2xl font-bold">Custom</span>
                  ) : (
                    <>
                      <span className="text-2xl font-bold">
                        &pound;{plan.price}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        /month
                      </span>
                    </>
                  )}
                </div>

                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <svg
                        className="w-4 h-4 text-primary mt-0.5 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 12.75l6 6 9-13.5"
                        />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <Button variant="outline" disabled className="w-full">
                    Current plan
                  </Button>
                ) : isEnterprise ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      window.open("mailto:sales@reactassess.com", "_blank")
                    }
                  >
                    Contact Sales
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => handleCheckout(planId)}
                    disabled={loading === planId}
                  >
                    {loading === planId ? (
                      <span className="flex items-center gap-2">
                        <svg
                          className="w-4 h-4 animate-spin"
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
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
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

import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-12-18.basil" as Stripe.LatestApiVersion,
      typescript: true,
    });
  }
  return _stripe;
}

export const PLANS = {
  starter: {
    name: "Starter",
    priceId: process.env.STRIPE_STARTER_PRICE_ID ?? "",
    price: 50,
    currency: "gbp",
    assessmentsPerMonth: 10,
    features: [
      "10 assessments/month",
      "AI-augmented challenges",
      "Candidate dossiers",
      "Adaptive difficulty",
    ],
  },
  professional: {
    name: "Professional",
    priceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID ?? "",
    price: 200,
    currency: "gbp",
    assessmentsPerMonth: 50,
    features: [
      "50 assessments/month",
      "Everything in Starter",
      "Session replay",
      "Priority support",
    ],
  },
  enterprise: {
    name: "Enterprise",
    priceId: "",
    price: -1,
    currency: "gbp",
    assessmentsPerMonth: Number.POSITIVE_INFINITY,
    features: [
      "Unlimited assessments",
      "Everything in Professional",
      "Custom challenges",
      "SSO & SAML",
      "Dedicated account manager",
    ],
  },
} as const;

export type PlanId = keyof typeof PLANS;

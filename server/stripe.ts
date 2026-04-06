import Stripe from "stripe";

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-12-18.acacia" as any })
  : null;

export const PLAN_LIMITS = {
  free: { maxTrips: 1, maxAdmins: 1, name: "Gratuit", hasAI: false, hasWhiteLabel: false },
  solo: { maxTrips: 5, maxAdmins: 1, name: "Solo", hasAI: true, hasWhiteLabel: false },
  pro: { maxTrips: 15, maxAdmins: 3, name: "Pro", hasAI: true, hasWhiteLabel: false },
  agency: { maxTrips: -1, maxAdmins: -1, name: "Agence", hasAI: true, hasWhiteLabel: true },
} as const;

export type PlanKey = keyof typeof PLAN_LIMITS;

export const PRICE_IDS: Record<string, { plan: PlanKey }> = {
  [process.env.STRIPE_PRICE_SOLO_MONTHLY || ""]: { plan: "solo" },
  [process.env.STRIPE_PRICE_SOLO_YEARLY || ""]: { plan: "solo" },
  [process.env.STRIPE_PRICE_PRO_MONTHLY || ""]: { plan: "pro" },
  [process.env.STRIPE_PRICE_PRO_YEARLY || ""]: { plan: "pro" },
  [process.env.STRIPE_PRICE_AGENCY_MONTHLY || ""]: { plan: "agency" },
  [process.env.STRIPE_PRICE_AGENCY_YEARLY || ""]: { plan: "agency" },
};

import "server-only";
import Stripe from "stripe";
import type { PlanTierId } from "@/lib/constants";

let stripeClient: Stripe | null = null;

const TIER_PRICE_ENV: Record<PlanTierId, string> = {
  SOLO: "STRIPE_PRICE_ID_SOLO",
  CREW: "STRIPE_PRICE_ID_CREW",
  BUSINESS: "STRIPE_PRICE_ID_BUSINESS",
};

export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_PRICE_ID_SOLO &&
      process.env.STRIPE_PRICE_ID_CREW &&
      process.env.STRIPE_PRICE_ID_BUSINESS,
  );
}

export function stripePriceIdForTier(tier: PlanTierId): string {
  const priceId = process.env[TIER_PRICE_ENV[tier]];
  if (!priceId) throw new Error(`${TIER_PRICE_ENV[tier]} is not set`);
  return priceId;
}

export function isContractorStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID_CONTRACTOR);
}

export function contractorStripePriceId(): string {
  const priceId = process.env.STRIPE_PRICE_ID_CONTRACTOR;
  if (!priceId) throw new Error("STRIPE_PRICE_ID_CONTRACTOR is not set");
  return priceId;
}

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

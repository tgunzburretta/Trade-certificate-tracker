"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

function appUrl(): string {
  return process.env.APP_URL || "http://localhost:3000";
}

/**
 * Starts a real Stripe Checkout session when Stripe keys are configured.
 * Otherwise this is a demo/manual-billing fallback: it activates the plan
 * immediately in the database, which is exactly what you want for the
 * "set it up free in exchange for a testimonial" first-10-customers deals —
 * no card ever needs to be collected for those.
 */
export async function startCheckoutAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!isStripeConfigured()) {
    await prisma.company.update({
      where: { id: user.companyId },
      data: { planStatus: "ACTIVE" },
    });
    revalidatePath("/billing");
    redirect("/billing?activated=1");
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: user.email,
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    success_url: `${appUrl()}/billing?success=1`,
    cancel_url: `${appUrl()}/billing`,
    client_reference_id: user.companyId,
    metadata: { companyId: user.companyId },
  });

  redirect(session.url!);
}

export async function manageBillingAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!isStripeConfigured()) {
    await prisma.company.update({
      where: { id: user.companyId },
      data: { planStatus: "CANCELED" },
    });
    revalidatePath("/billing");
    redirect("/billing?canceled=1");
  }

  const company = await prisma.company.findUnique({ where: { id: user.companyId } });
  if (!company?.stripeCustomerId) redirect("/billing");

  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: company.stripeCustomerId,
    return_url: `${appUrl()}/billing`,
  });

  redirect(session.url);
}

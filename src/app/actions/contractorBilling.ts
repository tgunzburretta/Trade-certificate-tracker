"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentContractor } from "@/lib/contractorAuth";
import { getStripe, isContractorStripeConfigured, contractorStripePriceId } from "@/lib/stripe";

function appUrl(): string {
  return process.env.APP_URL || "http://localhost:3000";
}

export async function startContractorCheckoutAction(): Promise<void> {
  const contractor = await getCurrentContractor();
  if (!contractor) redirect("/contractor/login");

  if (!isContractorStripeConfigured()) {
    await prisma.contractor.update({
      where: { id: contractor.id },
      data: { planStatus: "ACTIVE" },
    });
    revalidatePath("/contractor/billing");
    redirect("/contractor/billing?activated=1");
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: contractor.email,
    line_items: [{ price: contractorStripePriceId(), quantity: 1 }],
    success_url: `${appUrl()}/contractor/billing?success=1`,
    cancel_url: `${appUrl()}/contractor/billing`,
    client_reference_id: contractor.id,
    metadata: { contractorId: contractor.id },
  });

  redirect(session.url!);
}

export async function manageContractorBillingAction(): Promise<void> {
  const contractor = await getCurrentContractor();
  if (!contractor) redirect("/contractor/login");

  if (!isContractorStripeConfigured()) {
    await prisma.contractor.update({
      where: { id: contractor.id },
      data: { planStatus: "CANCELED" },
    });
    revalidatePath("/contractor/billing");
    redirect("/contractor/billing?canceled=1");
  }

  const record = await prisma.contractor.findUnique({ where: { id: contractor.id } });
  if (!record?.stripeCustomerId) redirect("/contractor/billing");

  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: record.stripeCustomerId,
    return_url: `${appUrl()}/contractor/billing`,
  });

  redirect(session.url);
}

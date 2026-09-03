import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe, isStripeConfigured, isContractorStripeConfigured } from "@/lib/stripe";
import type Stripe from "stripe";

export async function POST(req: NextRequest): Promise<NextResponse> {
  if ((!isStripeConfigured() && !isContractorStripeConfigured()) || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 400 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const body = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return NextResponse.json({ error: `Invalid signature: ${(err as Error).message}` }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = typeof session.customer === "string" ? session.customer : undefined;
      const subscriptionId =
        typeof session.subscription === "string" ? session.subscription : undefined;

      const companyId = session.metadata?.companyId;
      const contractorId = session.metadata?.contractorId;

      if (companyId) {
        const tier = session.metadata?.tier;
        await prisma.company.update({
          where: { id: companyId },
          data: {
            planStatus: "ACTIVE",
            ...(tier ? { planTier: tier } : {}),
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
          },
        });
      } else if (contractorId) {
        await prisma.contractor.update({
          where: { id: contractorId },
          data: {
            planStatus: "ACTIVE",
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
          },
        });
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const planStatus =
        subscription.status === "active" || subscription.status === "trialing"
          ? "ACTIVE"
          : subscription.status === "past_due" || subscription.status === "unpaid"
            ? "PAST_DUE"
            : "CANCELED";

      const company = await prisma.company.findFirst({
        where: { stripeSubscriptionId: subscription.id },
      });
      if (company) {
        await prisma.company.update({ where: { id: company.id }, data: { planStatus } });
        break;
      }

      const contractor = await prisma.contractor.findFirst({
        where: { stripeSubscriptionId: subscription.id },
      });
      if (contractor) {
        await prisma.contractor.update({ where: { id: contractor.id }, data: { planStatus } });
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}

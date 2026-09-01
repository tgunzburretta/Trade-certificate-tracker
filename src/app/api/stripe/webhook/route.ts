import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import type Stripe from "stripe";

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isStripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
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
      const companyId = session.metadata?.companyId || session.client_reference_id;
      if (companyId) {
        await prisma.company.update({
          where: { id: companyId },
          data: {
            planStatus: "ACTIVE",
            stripeCustomerId: typeof session.customer === "string" ? session.customer : undefined,
            stripeSubscriptionId:
              typeof session.subscription === "string" ? session.subscription : undefined,
          },
        });
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const company = await prisma.company.findFirst({
        where: { stripeSubscriptionId: subscription.id },
      });
      if (company) {
        const planStatus =
          subscription.status === "active" || subscription.status === "trialing"
            ? "ACTIVE"
            : subscription.status === "past_due" || subscription.status === "unpaid"
              ? "PAST_DUE"
              : "CANCELED";
        await prisma.company.update({ where: { id: company.id }, data: { planStatus } });
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}

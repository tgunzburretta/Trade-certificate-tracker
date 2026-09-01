import { getCurrentUser } from "@/lib/auth";
import { isStripeConfigured } from "@/lib/stripe";
import { PLAN_PRICE_GBP } from "@/lib/constants";
import { Card, SubmitButton, Badge } from "@/components/ui";
import { startCheckoutAction, manageBillingAction } from "@/app/actions/billing";

const STATUS_COPY: Record<string, { label: string; color: "slate" | "emerald" | "amber" | "red" }> = {
  TRIAL: { label: "Free trial", color: "slate" },
  ACTIVE: { label: "Active", color: "emerald" },
  PAST_DUE: { label: "Payment due", color: "amber" },
  CANCELED: { label: "Canceled", color: "red" },
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; activated?: string; canceled?: string }>;
}) {
  const { success, activated, canceled } = await searchParams;
  const user = await getCurrentUser();
  if (!user) return null;

  const status = STATUS_COPY[user.company.planStatus] ?? STATUS_COPY.TRIAL;
  const stripeLive = isStripeConfigured();
  const trialEndsAt = new Date(user.company.trialEndsAt);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Billing</h1>

      {(success || activated) && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          You&rsquo;re on the plan. Thanks for subscribing.
        </div>
      )}
      {canceled && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Your plan was canceled.
        </div>
      )}

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">CertTrack — {user.company.name}</h2>
            <p className="text-sm text-slate-500">
              £{PLAN_PRICE_GBP}/month · unlimited workers &amp; certificates
            </p>
          </div>
          <Badge color={status.color}>{status.label}</Badge>
        </div>

        {user.company.planStatus === "TRIAL" && (
          <p className="mt-3 text-sm text-slate-500">
            Trial ends {trialEndsAt.toLocaleDateString("en-GB")}.
          </p>
        )}

        <ul className="mt-4 space-y-1 text-sm text-slate-600">
          <li>✓ Email alerts at 60 / 30 / 7 days before expiry</li>
          <li>✓ Per-worker certificate tracking</li>
          <li>✓ One-tap document upload from your phone</li>
          <li>✓ Shareable compliance card link for customers</li>
        </ul>

        <div className="mt-6 flex gap-3">
          {user.company.planStatus !== "ACTIVE" ? (
            <form action={startCheckoutAction}>
              <SubmitButton>Subscribe — £{PLAN_PRICE_GBP}/mo</SubmitButton>
            </form>
          ) : (
            <form action={manageBillingAction}>
              <button
                type="submit"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {stripeLive ? "Manage billing" : "Cancel plan"}
              </button>
            </form>
          )}
        </div>

        {!stripeLive && (
          <p className="mt-4 text-xs text-slate-400">
            Demo mode: no Stripe keys configured, so subscribing/canceling here just flips the
            plan status in the database. Set STRIPE_SECRET_KEY, STRIPE_PRICE_ID and
            STRIPE_WEBHOOK_SECRET to take real payments.
          </p>
        )}
      </Card>
    </div>
  );
}

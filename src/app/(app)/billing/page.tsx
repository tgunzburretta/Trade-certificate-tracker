import { getCurrentUser } from "@/lib/auth";
import { isStripeConfigured } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { PLAN_TIERS, getPlanTier } from "@/lib/constants";
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

  const [status, workerCount] = await Promise.all([
    Promise.resolve(STATUS_COPY[user.company.planStatus] ?? STATUS_COPY.TRIAL),
    prisma.worker.count({ where: { companyId: user.companyId } }),
  ]);
  const stripeLive = isStripeConfigured();
  const trialEndsAt = new Date(user.company.trialEndsAt);
  const currentTier = getPlanTier(user.company.planTier);
  const isActive = user.company.planStatus === "ACTIVE";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
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
            <h2 className="text-lg font-semibold text-slate-900">Vetted — {user.company.name}</h2>
            <p className="text-sm text-slate-500">
              {currentTier.name} plan · £{currentTier.priceGBP}/month ·{" "}
              {workerCount}
              {currentTier.workerLimit !== null ? ` of ${currentTier.workerLimit}` : ""} worker
              {workerCount === 1 && currentTier.workerLimit === 1 ? "" : "s"} used
            </p>
          </div>
          <Badge color={status.color}>{status.label}</Badge>
        </div>

        {user.company.planStatus === "TRIAL" && (
          <p className="mt-3 text-sm text-slate-500">
            Trial ends {trialEndsAt.toLocaleDateString("en-GB")}. Pick a plan below whenever
            you&rsquo;re ready.
          </p>
        )}

        {isActive && (
          <form action={manageBillingAction} className="mt-4">
            <button
              type="submit"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {stripeLive ? "Manage billing" : "Cancel plan"}
            </button>
          </form>
        )}

        {!stripeLive && (
          <p className="mt-4 text-xs text-slate-400">
            Demo mode: no Stripe keys configured, so subscribing/canceling here just flips the
            plan status in the database. Set STRIPE_SECRET_KEY and a STRIPE_PRICE_ID_* per tier
            to take real payments.
          </p>
        )}
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        {PLAN_TIERS.map((tier) => {
          const isCurrent = isActive && tier.id === currentTier.id;
          return (
            <Card
              key={tier.id}
              className={`flex flex-col p-5 ${tier.popular ? "border-slate-900 ring-1 ring-slate-900" : ""}`}
            >
              {tier.popular && (
                <span className="mb-2 inline-flex w-fit items-center rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-medium text-white">
                  Most popular
                </span>
              )}
              <h3 className="text-base font-semibold text-slate-900">{tier.name}</h3>
              <p className="mt-1 text-sm text-slate-500">{tier.blurb}</p>
              <p className="mt-3 text-2xl font-semibold text-slate-900">
                £{tier.priceGBP}
                <span className="text-sm font-normal text-slate-500">/mo</span>
              </p>
              <ul className="mt-4 flex-1 space-y-1 text-sm text-slate-600">
                {tier.features.map((f) => (
                  <li key={f}>✓ {f}</li>
                ))}
              </ul>
              <div className="mt-5">
                {isCurrent ? (
                  <span className="block rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-center text-sm font-medium text-slate-500">
                    Current plan
                  </span>
                ) : (
                  <form action={startCheckoutAction}>
                    <input type="hidden" name="tier" value={tier.id} />
                    <SubmitButton className="w-full">
                      {isActive ? "Switch to this plan" : `Subscribe — £${tier.priceGBP}/mo`}
                    </SubmitButton>
                  </form>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

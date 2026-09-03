import { getCurrentContractor } from "@/lib/contractorAuth";
import { isContractorStripeConfigured } from "@/lib/stripe";
import { CONTRACTOR_PLAN_PRICE_GBP } from "@/lib/constants";
import { Card, SubmitButton, Badge } from "@/components/ui";
import { startContractorCheckoutAction, manageContractorBillingAction } from "@/app/actions/contractorBilling";

const STATUS_COPY: Record<string, { label: string; color: "slate" | "emerald" | "amber" | "red" }> = {
  TRIAL: { label: "Free trial", color: "slate" },
  ACTIVE: { label: "Active", color: "emerald" },
  PAST_DUE: { label: "Payment due", color: "amber" },
  CANCELED: { label: "Canceled", color: "red" },
};

export default async function ContractorBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; activated?: string; canceled?: string }>;
}) {
  const { success, activated, canceled } = await searchParams;
  const contractor = await getCurrentContractor();
  if (!contractor) return null;

  const status = STATUS_COPY[contractor.planStatus] ?? STATUS_COPY.TRIAL;
  const stripeLive = isContractorStripeConfigured();
  const trialEndsAt = new Date(contractor.trialEndsAt);

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
            <h2 className="text-lg font-semibold text-slate-900">Vetted for contractors — {contractor.businessName}</h2>
            <p className="text-sm text-slate-500">
              £{CONTRACTOR_PLAN_PRICE_GBP}/month · unlimited subcontractors tracked
            </p>
          </div>
          <Badge color={status.color}>{status.label}</Badge>
        </div>

        {contractor.planStatus === "TRIAL" && (
          <p className="mt-3 text-sm text-slate-500">
            Trial ends {trialEndsAt.toLocaleDateString("en-GB")}.
          </p>
        )}

        <ul className="mt-4 space-y-1 text-sm text-slate-600">
          <li>✓ Unlimited subcontractors on your watchlist</li>
          <li>✓ Live compliance status, pulled straight from each sub&rsquo;s Vetted account</li>
          <li>✓ One dashboard instead of chasing paperwork before a job starts</li>
        </ul>

        <div className="mt-6 flex gap-3">
          {contractor.planStatus !== "ACTIVE" ? (
            <form action={startContractorCheckoutAction}>
              <SubmitButton>Subscribe — £{CONTRACTOR_PLAN_PRICE_GBP}/mo</SubmitButton>
            </form>
          ) : (
            <form action={manageContractorBillingAction}>
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
            plan status in the database. Set STRIPE_SECRET_KEY and STRIPE_PRICE_ID_CONTRACTOR to
            take real payments.
          </p>
        )}
      </Card>
    </div>
  );
}

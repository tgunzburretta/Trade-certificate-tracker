import Link from "next/link";
import { getCurrentContractor } from "@/lib/contractorAuth";
import { prisma } from "@/lib/prisma";
import { getOverallCompliance } from "@/lib/compliance";
import { Card, Field, SubmitButton, ErrorBanner, Badge } from "@/components/ui";
import { addWatchedSubAction, removeWatchedSubAction } from "@/app/actions/watchlist";

export default async function ContractorDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const contractor = await getCurrentContractor();
  if (!contractor) return null;

  const trialActive =
    contractor.planStatus === "TRIAL" && new Date(contractor.trialEndsAt) > new Date();
  const canUseDashboard = contractor.planStatus === "ACTIVE" || trialActive;

  const watched = await prisma.watchedSub.findMany({
    where: { contractorId: contractor.id },
    orderBy: { createdAt: "asc" },
  });

  const companies = await prisma.company.findMany({
    where: { shareSlug: { in: watched.map((w) => w.shareSlug) } },
    include: {
      certificates: { where: { workerId: null } },
      workers: { include: { certificates: true } },
    },
  });
  const companyBySlug = new Map(companies.map((c) => [c.shareSlug, c]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Subcontractors</h1>
      </div>

      {!canUseDashboard && (
        <Card className="border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Your trial has ended.{" "}
          <Link href="/contractor/billing" className="font-semibold underline">
            Subscribe
          </Link>{" "}
          to keep checking subcontractor compliance.
        </Card>
      )}

      <Card className="p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Add a subcontractor
        </h2>
        <ErrorBanner message={error} />
        <form action={addWatchedSubAction} className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" name="label" required placeholder="Acme Roofing Ltd" />
          <Field
            label="Their compliance card link or code"
            name="link"
            required
            placeholder="https://.../c/acme-roofing-ltd-ap84pw"
          />
          <div className="sm:col-span-2">
            <SubmitButton>Add subcontractor</SubmitButton>
          </div>
        </form>
      </Card>

      {watched.length === 0 ? (
        <Card className="p-6 text-center text-sm text-slate-500">
          No subcontractors added yet. Ask them for their compliance card link.
        </Card>
      ) : (
        <Card className="divide-y divide-slate-100 p-0">
          {watched.map((w) => {
            const company = companyBySlug.get(w.shareSlug);
            const allCerts = company
              ? [...company.certificates, ...company.workers.flatMap((wk) => wk.certificates)]
              : [];
            const overall = company ? getOverallCompliance(allCerts) : null;

            return (
              <div key={w.id} className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="font-medium text-slate-900">{w.label}</p>
                  {company ? (
                    <Link
                      href={`/c/${w.shareSlug}`}
                      target="_blank"
                      className="text-sm text-slate-500 hover:underline"
                    >
                      View compliance card
                    </Link>
                  ) : (
                    <p className="text-sm text-slate-400">Not found — check the link they sent you</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {overall ? (
                    <Badge color={overall.color}>{overall.label}</Badge>
                  ) : (
                    <Badge color="slate">Unknown</Badge>
                  )}
                  <form action={removeWatchedSubAction}>
                    <input type="hidden" name="id" value={w.id} />
                    <button type="submit" className="text-sm text-slate-400 hover:text-red-600">
                      Remove
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}

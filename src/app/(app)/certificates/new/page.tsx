import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createCertificateAction } from "@/app/actions/certificates";
import { Card, Field, SubmitButton, ErrorBanner } from "@/components/ui";
import { CERT_TYPES } from "@/lib/constants";

export default async function NewCertificatePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; workerId?: string }>;
}) {
  const { error, workerId } = await searchParams;
  const user = await getCurrentUser();
  if (!user) return null;

  const workers = await prisma.worker.findMany({
    where: { companyId: user.companyId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Link href={workerId ? `/workers/${workerId}` : "/dashboard"} className="text-sm text-slate-500 hover:underline">
        ← Back
      </Link>
      <h1 className="text-2xl font-semibold text-slate-900">Add certificate</h1>
      <Card className="p-6">
        <form action={createCertificateAction} encType="multipart/form-data" className="space-y-4">
          <ErrorBanner message={error} />

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Certificate type</span>
            <select
              name="type"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            >
              {CERT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          <Field label="Label (optional)" name="label" placeholder="e.g. Public liability — £5m" />

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Assign to worker</span>
            <select
              name="workerId"
              defaultValue={workerId || ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            >
              <option value="">Company-wide (not tied to a worker)</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Issued date (optional)" name="issuedDate" type="date" />
            <Field label="Expiry date" name="expiryDate" type="date" required />
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Document (optional — PDF, JPG, PNG)
            </span>
            <input
              type="file"
              name="document"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.heic"
              capture="environment"
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-700"
            />
            <span className="mt-1 block text-xs text-slate-400">
              One tap: pick a photo of the certificate straight from your camera roll.
            </span>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Notes (optional)</span>
            <textarea
              name="notes"
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </label>

          <SubmitButton className="w-full">Add certificate</SubmitButton>
        </form>
      </Card>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { certTypeLabel } from "@/lib/constants";
import { Card, SubmitButton, ErrorBanner } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { renewCertificateAction, deleteCertificateAction } from "@/app/actions/certificates";

function toDateInputValue(date: Date | null): string {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

export default async function CertificateDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const user = await getCurrentUser();
  if (!user) return null;

  const cert = await prisma.certificate.findFirst({
    where: { id, companyId: user.companyId },
    include: { worker: true },
  });
  if (!cert) notFound();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Link
        href={cert.workerId ? `/workers/${cert.workerId}` : "/dashboard"}
        className="text-sm text-slate-500 hover:underline"
      >
        ← Back
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{cert.label || certTypeLabel(cert.type)}</h1>
          <p className="text-sm text-slate-500">
            {certTypeLabel(cert.type)}
            {cert.worker && (
              <>
                {" "}
                ·{" "}
                <Link href={`/workers/${cert.worker.id}`} className="hover:underline">
                  {cert.worker.name}
                </Link>
              </>
            )}
          </p>
        </div>
        <StatusBadge expiryDate={cert.expiryDate} />
      </div>

      <Card className="space-y-3 p-6 text-sm">
        <Row label="Issued" value={cert.issuedDate ? new Date(cert.issuedDate).toLocaleDateString("en-GB") : "—"} />
        <Row label="Expires" value={new Date(cert.expiryDate).toLocaleDateString("en-GB")} />
        <Row
          label="Document"
          value={
            cert.documentPath ? (
              <a href={`/api/documents/${cert.id}`} target="_blank" className="text-slate-900 underline">
                {cert.documentName || "View document"}
              </a>
            ) : (
              "No document uploaded"
            )
          }
        />
        {cert.notes && <Row label="Notes" value={cert.notes} />}
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Renew this certificate</h2>
        <form action={renewCertificateAction} encType="multipart/form-data" className="space-y-4">
          <ErrorBanner message={error} />
          <input type="hidden" name="certificateId" value={cert.id} />

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">New issued date</span>
              <input
                type="date"
                name="issuedDate"
                defaultValue={toDateInputValue(cert.issuedDate)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">New expiry date</span>
              <input
                type="date"
                name="expiryDate"
                required
                defaultValue={toDateInputValue(cert.expiryDate)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Replace document (optional)
            </span>
            <input
              type="file"
              name="document"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.heic"
              capture="environment"
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-700"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Notes</span>
            <textarea
              name="notes"
              rows={2}
              defaultValue={cert.notes || ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </label>

          <SubmitButton className="w-full">Save renewal</SubmitButton>
        </form>
      </Card>

      <form action={deleteCertificateAction}>
        <input type="hidden" name="certificateId" value={cert.id} />
        <button
          type="submit"
          className="w-full rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          Delete certificate
        </button>
      </form>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 pb-2 last:border-0 last:pb-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900">{value}</span>
    </div>
  );
}

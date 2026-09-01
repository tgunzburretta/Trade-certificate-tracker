import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { certTypeLabel } from "@/lib/constants";
import { Card } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { deleteWorkerAction } from "@/app/actions/workers";

export default async function WorkerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const worker = await prisma.worker.findFirst({
    where: { id, companyId: user.companyId },
    include: { certificates: { orderBy: { expiryDate: "asc" } } },
  });
  if (!worker) notFound();

  return (
    <div className="space-y-6">
      <Link href="/workers" className="text-sm text-slate-500 hover:underline">
        ← Workers
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{worker.name}</h1>
          <p className="text-sm text-slate-500">{worker.jobTitle || "No job title set"}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/certificates/new?workerId=${worker.id}`}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Add certificate
          </Link>
          <form action={deleteWorkerAction}>
            <input type="hidden" name="workerId" value={worker.id} />
            <button
              type="submit"
              className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Remove worker
            </button>
          </form>
        </div>
      </div>

      {worker.certificates.length === 0 ? (
        <Card className="p-6 text-sm text-slate-500">No certificates for this worker yet.</Card>
      ) : (
        <div className="grid gap-3">
          {worker.certificates.map((cert) => (
            <Link key={cert.id} href={`/certificates/${cert.id}`}>
              <Card className="flex items-center justify-between p-4 hover:border-slate-300">
                <div>
                  <div className="font-medium text-slate-900">{cert.label || certTypeLabel(cert.type)}</div>
                  <div className="text-xs text-slate-500">
                    {certTypeLabel(cert.type)} · expires{" "}
                    {new Date(cert.expiryDate).toLocaleDateString("en-GB")}
                  </div>
                </div>
                <StatusBadge expiryDate={cert.expiryDate} />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

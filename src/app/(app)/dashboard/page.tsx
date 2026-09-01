import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCertStatus, STATUS_STYLES } from "@/lib/certStatus";
import { certTypeLabel } from "@/lib/constants";
import { Card } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [certificates, workerCount] = await Promise.all([
    prisma.certificate.findMany({
      where: { companyId: user.companyId },
      include: { worker: true },
      orderBy: { expiryDate: "asc" },
    }),
    prisma.worker.count({ where: { companyId: user.companyId } }),
  ]);

  const counts = { expired: 0, critical: 0, warning: 0, upcoming: 0, valid: 0 };
  for (const cert of certificates) {
    counts[getCertStatus(cert.expiryDate).status]++;
  }

  const needsAttention = certificates.filter((c) => {
    const s = getCertStatus(c.expiryDate).status;
    return s === "expired" || s === "critical" || s === "warning";
  });

  const shareUrl = `/c/${user.company.shareSlug}`;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">
            {workerCount} worker{workerCount === 1 ? "" : "s"} · {certificates.length} certificate
            {certificates.length === 1 ? "" : "s"} tracked
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/certificates/new"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Add certificate
          </Link>
          <Link
            href="/workers/new"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Add worker
          </Link>
          <Link
            href={shareUrl}
            target="_blank"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            View compliance card
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatTile label="Expired" value={counts.expired} status="expired" />
        <StatTile label="≤ 7 days" value={counts.critical} status="critical" />
        <StatTile label="≤ 30 days" value={counts.warning} status="warning" />
        <StatTile label="≤ 60 days" value={counts.upcoming} status="upcoming" />
        <StatTile label="Valid" value={counts.valid} status="valid" />
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Needs attention</h2>
        {needsAttention.length === 0 ? (
          <Card className="p-6 text-sm text-slate-500">
            Nothing expiring in the next 30 days. Nice.
          </Card>
        ) : (
          <CertTable certificates={needsAttention} />
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">All certificates</h2>
        {certificates.length === 0 ? (
          <Card className="p-6 text-sm text-slate-500">
            No certificates yet.{" "}
            <Link href="/certificates/new" className="font-medium text-slate-900 underline">
              Add your first one
            </Link>
            .
          </Card>
        ) : (
          <CertTable certificates={certificates} />
        )}
      </section>
    </div>
  );
}

function StatTile({
  label,
  value,
  status,
}: {
  label: string;
  value: number;
  status: keyof typeof STATUS_STYLES;
}) {
  const style = STATUS_STYLES[status];
  return (
    <Card className="p-4">
      <div className={`mb-2 inline-flex h-2 w-2 rounded-full ${style.dot}`} />
      <div className="text-2xl font-semibold text-slate-900">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </Card>
  );
}

type CertWithWorker = {
  id: string;
  type: string;
  label: string;
  expiryDate: Date;
  worker: { id: string; name: string } | null;
};

function CertTable({ certificates }: { certificates: CertWithWorker[] }) {
  return (
    <Card className="overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-2 font-medium">Certificate</th>
            <th className="px-4 py-2 font-medium">Worker</th>
            <th className="px-4 py-2 font-medium">Expiry</th>
            <th className="px-4 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {certificates.map((cert) => (
            <tr key={cert.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <Link href={`/certificates/${cert.id}`} className="font-medium text-slate-900 hover:underline">
                  {cert.label || certTypeLabel(cert.type)}
                </Link>
                <div className="text-xs text-slate-400">{certTypeLabel(cert.type)}</div>
              </td>
              <td className="px-4 py-3 text-slate-600">
                {cert.worker ? (
                  <Link href={`/workers/${cert.worker.id}`} className="hover:underline">
                    {cert.worker.name}
                  </Link>
                ) : (
                  <span className="text-slate-400">Company-wide</span>
                )}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {new Date(cert.expiryDate).toLocaleDateString("en-GB")}
              </td>
              <td className="px-4 py-3">
                <StatusBadge expiryDate={cert.expiryDate} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

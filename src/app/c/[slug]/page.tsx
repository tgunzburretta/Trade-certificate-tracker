import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCertStatus } from "@/lib/certStatus";
import { certTypeLabel } from "@/lib/constants";
import { Badge, Card } from "@/components/ui";

export const revalidate = 0;

export default async function ComplianceCardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const company = await prisma.company.findUnique({
    where: { shareSlug: slug },
    include: {
      workers: {
        orderBy: { name: "asc" },
        include: { certificates: { orderBy: { expiryDate: "asc" } } },
      },
      certificates: { where: { workerId: null }, orderBy: { expiryDate: "asc" } },
    },
  });
  if (!company) notFound();

  const allCerts = [
    ...company.certificates,
    ...company.workers.flatMap((w) => w.certificates),
  ];
  const worstRank = allCerts.reduce((worst, c) => {
    const rank = { valid: 0, upcoming: 1, warning: 2, critical: 3, expired: 4 };
    const status = getCertStatus(c.expiryDate).status;
    return Math.max(worst, rank[status]);
  }, 0);

  const overall =
    worstRank >= 3
      ? { label: "Action needed", color: "red" as const }
      : worstRank === 2
        ? { label: "Renewal due soon", color: "amber" as const }
        : { label: "Compliance up to date", color: "emerald" as const };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-xl space-y-6">
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Compliance card
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-900">{company.name}</h1>
          <div className="mt-3">
            <Badge color={overall.color}>{overall.label}</Badge>
          </div>
        </div>

        {company.certificates.length > 0 && (
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Company-wide
            </h2>
            <CertList certs={company.certificates} />
          </Card>
        )}

        {company.workers.length === 0 && company.certificates.length === 0 ? (
          <Card className="p-6 text-center text-sm text-slate-500">
            No certificates published yet.
          </Card>
        ) : (
          company.workers.map((worker) => (
            <Card key={worker.id} className="p-5">
              <h2 className="mb-3 font-semibold text-slate-900">
                {worker.name}
                {worker.jobTitle && <span className="ml-2 text-sm font-normal text-slate-400">{worker.jobTitle}</span>}
              </h2>
              {worker.certificates.length === 0 ? (
                <p className="text-sm text-slate-400">No certificates on file</p>
              ) : (
                <CertList certs={worker.certificates} />
              )}
            </Card>
          ))
        )}

        <p className="pt-4 text-center text-xs text-slate-400">
          Certificate status is kept current by {company.name} via CertTrack. Document contents
          are not shown publicly — ask {company.name} directly to verify specific paperwork.
        </p>
      </div>
    </div>
  );
}

function CertList({
  certs,
}: {
  certs: { id: string; type: string; label: string; expiryDate: Date }[];
}) {
  return (
    <ul className="divide-y divide-slate-100">
      {certs.map((cert) => {
        const info = getCertStatus(cert.expiryDate);
        const color =
          info.status === "expired" || info.status === "critical"
            ? "red"
            : info.status === "warning"
              ? "amber"
              : info.status === "upcoming"
                ? "sky"
                : "emerald";
        return (
          <li key={cert.id} className="flex items-center justify-between py-2 text-sm">
            <span className="text-slate-700">{cert.label || certTypeLabel(cert.type)}</span>
            <Badge color={color}>{info.status === "expired" ? "Expired" : "Valid"}</Badge>
          </li>
        );
      })}
    </ul>
  );
}

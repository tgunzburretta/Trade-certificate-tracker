import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCertStatus } from "@/lib/certStatus";
import { getOverallCompliance } from "@/lib/compliance";
import { certTypeLabel } from "@/lib/constants";
import { Badge, Card } from "@/components/ui";
import { VerificationRow } from "@/components/VerificationRow";
import { getLatestVerifications } from "@/lib/verification";

export const revalidate = 0;

/**
 * The card's whole job is to be forwarded — texted to a customer, pasted to a
 * main contractor. Without this, every one of those previews reads "Vetted —
 * certificate renewal tracker for trades", which tells the recipient nothing
 * about the company that sent it.
 *
 * The summary reflects real status rather than always claiming everything is
 * fine: a company with a lapsed certificate must not get a preview implying
 * otherwise, because the recipient may never click through.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const company = await prisma.company.findUnique({
    where: { shareSlug: slug },
    include: {
      certificates: { where: { workerId: null } },
      workers: { include: { certificates: true } },
    },
  });

  if (!company) return { title: "Compliance card not found" };

  const allCerts = [...company.certificates, ...company.workers.flatMap((w) => w.certificates)];
  const overall = getOverallCompliance(allCerts);
  const verified = await getLatestVerifications(company.id);
  const confirmedAtRegister = verified.some(
    (v) => v.source === "COMPANIES_HOUSE" && v.status === "VERIFIED",
  );

  const parts = [overall.label];
  if (allCerts.length > 0) {
    parts.push(`${allCerts.length} certificate${allCerts.length === 1 ? "" : "s"} tracked`);
  }
  if (confirmedAtRegister) parts.push("company confirmed at Companies House");

  return {
    title: `${company.name} — compliance card`,
    description: parts.join(" · "),
    openGraph: {
      title: `${company.name} — compliance card`,
      description: parts.join(" · "),
      type: "profile",
    },
    // These are individual businesses' pages, shared by link rather than
    // published. Remove this to let them be found in search.
    robots: { index: false, follow: false },
  };
}

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

  await prisma.cardView.create({ data: { companyId: company.id } });

  // Cached rows only — this page is public and unauthenticated, so it must
  // never proxy through to an external register on render.
  // Inconclusive results (we couldn't reach the register, no matching record)
  // are withheld rather than shown: they'd imply something we can't stand
  // behind either way. An ADVERSE result IS shown — hiding a dissolved
  // company from the customer viewing their card would defeat the point.
  const verifications = (await getLatestVerifications(company.id)).filter(
    (v) => v.status === "VERIFIED" || v.status === "ADVERSE",
  );

  const allCerts = [
    ...company.certificates,
    ...company.workers.flatMap((w) => w.certificates),
  ];
  const overall = getOverallCompliance(allCerts);

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

        {verifications.length > 0 && (
          <Card className="px-5 py-3">
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Business checks
            </h2>
            <div className="divide-y divide-slate-100">
              {verifications.map((v) => (
                <VerificationRow key={v.source} verification={v} />
              ))}
            </div>
          </Card>
        )}

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
          Certificate status is kept current by {company.name} via Vetted. Document contents
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
            <Badge color={color}>{info.label}</Badge>
          </li>
        );
      })}
    </ul>
  );
}

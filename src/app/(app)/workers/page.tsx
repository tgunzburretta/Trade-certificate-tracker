import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCertStatus } from "@/lib/certStatus";
import { Card } from "@/components/ui";
import { Badge } from "@/components/ui";

export default async function WorkersPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const workers = await prisma.worker.findMany({
    where: { companyId: user.companyId },
    include: { certificates: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Workers</h1>
        <Link
          href="/workers/new"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Add worker
        </Link>
      </div>

      {workers.length === 0 ? (
        <Card className="p-6 text-sm text-slate-500">
          No workers yet.{" "}
          <Link href="/workers/new" className="font-medium text-slate-900 underline">
            Add your first worker
          </Link>
          .
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {workers.map((worker) => {
            const worstStatus = worker.certificates.reduce<
              "valid" | "upcoming" | "warning" | "critical" | "expired" | null
            >((worst, cert) => {
              const status = getCertStatus(cert.expiryDate).status;
              const rank = { valid: 0, upcoming: 1, warning: 2, critical: 3, expired: 4 };
              if (!worst || rank[status] > rank[worst]) return status;
              return worst;
            }, null);

            return (
              <Link key={worker.id} href={`/workers/${worker.id}`}>
                <Card className="flex items-center justify-between p-4 transition hover:border-slate-300">
                  <div>
                    <div className="font-medium text-slate-900">{worker.name}</div>
                    <div className="text-xs text-slate-500">
                      {worker.jobTitle || "—"} · {worker.certificates.length} cert
                      {worker.certificates.length === 1 ? "" : "s"}
                    </div>
                  </div>
                  {worstStatus && (
                    <Badge
                      color={
                        worstStatus === "valid"
                          ? "emerald"
                          : worstStatus === "upcoming"
                            ? "sky"
                            : worstStatus === "warning"
                              ? "amber"
                              : "red"
                      }
                    >
                      {worstStatus === "expired"
                        ? "Expired cert"
                        : worstStatus === "critical"
                          ? "Due ≤ 7d"
                          : worstStatus === "warning"
                            ? "Due ≤ 30d"
                            : worstStatus === "upcoming"
                              ? "Due ≤ 60d"
                              : "All valid"}
                    </Badge>
                  )}
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

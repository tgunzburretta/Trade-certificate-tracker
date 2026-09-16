import { getCertStatus, type CertStatus } from "@/lib/certStatus";

export type OverallStatus = "red" | "amber" | "emerald";

export interface OverallCompliance {
  label: string;
  color: OverallStatus;
}

const STATUS_RANK: Record<CertStatus, number> = {
  valid: 0,
  upcoming: 1,
  warning: 2,
  critical: 3,
  expired: 4,
};

/** Worst-cert-wins summary used on the public compliance card and the contractor dashboard. */
export function getOverallCompliance(certs: { expiryDate: Date }[]): OverallCompliance {
  const worstRank = certs.reduce((worst, c) => {
    const status = getCertStatus(c.expiryDate).status;
    return Math.max(worst, STATUS_RANK[status]);
  }, 0);

  if (worstRank >= 3) return { label: "Action needed", color: "red" };
  if (worstRank === 2) return { label: "Renewal due soon", color: "amber" };
  return { label: "Compliance up to date", color: "emerald" };
}

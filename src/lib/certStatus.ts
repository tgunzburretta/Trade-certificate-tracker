export type CertStatus = "expired" | "critical" | "warning" | "upcoming" | "valid";

export interface CertStatusInfo {
  status: CertStatus;
  daysRemaining: number;
  label: string;
}

/**
 * Thresholds mirror the 60/30/7 day reminder schedule so the badge a company
 * sees in the app always matches the urgency of the emails going out.
 */
export function getCertStatus(expiryDate: Date, now: Date = new Date()): CertStatusInfo {
  const msPerDay = 1000 * 60 * 60 * 24;
  const startOfNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfExpiry = new Date(
    expiryDate.getFullYear(),
    expiryDate.getMonth(),
    expiryDate.getDate(),
  );
  const daysRemaining = Math.round((startOfExpiry.getTime() - startOfNow.getTime()) / msPerDay);

  if (daysRemaining < 0) {
    return { status: "expired", daysRemaining, label: "Expired" };
  }
  if (daysRemaining <= 7) {
    return { status: "critical", daysRemaining, label: `Expires in ${daysRemaining}d` };
  }
  if (daysRemaining <= 30) {
    return { status: "warning", daysRemaining, label: `Expires in ${daysRemaining}d` };
  }
  if (daysRemaining <= 60) {
    return { status: "upcoming", daysRemaining, label: `Expires in ${daysRemaining}d` };
  }
  return { status: "valid", daysRemaining, label: "Valid" };
}

export const STATUS_STYLES: Record<CertStatus, { bg: string; text: string; dot: string }> = {
  expired: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-600" },
  critical: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  warning: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  upcoming: { bg: "bg-sky-50", text: "text-sky-700", dot: "bg-sky-500" },
  valid: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
};

import { getCertStatus } from "@/lib/certStatus";
import { Badge } from "@/components/ui";

const COLOR_BY_STATUS = {
  expired: "red",
  critical: "red",
  warning: "amber",
  upcoming: "sky",
  valid: "emerald",
} as const;

export function StatusBadge({ expiryDate }: { expiryDate: Date }) {
  const info = getCertStatus(expiryDate);
  return <Badge color={COLOR_BY_STATUS[info.status]}>{info.label}</Badge>;
}

import { Badge } from "@/components/ui";
import { VERIFICATION_SOURCE_LABELS, type VerificationSource } from "@/lib/constants";
import type { LatestVerification } from "@/lib/verification";

/**
 * Deliberately never renders a bare tick. Each row names the register, what it
 * said, and when we asked — a main contractor cares which certs were machine
 * checked rather than eyeballed, and we can only stand behind a claim we can
 * show the provenance of.
 */
export function VerificationRow({ verification }: { verification: LatestVerification }) {
  const label =
    VERIFICATION_SOURCE_LABELS[verification.source as VerificationSource] ?? verification.source;
  const checkedOn = new Date(verification.checkedAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  // A register we couldn't reach is our failure, not a mark against the
  // company, so it reads as neutral and says so explicitly.
  const presentation: Record<string, { color: "emerald" | "amber" | "red" | "slate"; text: string }> = {
    VERIFIED: { color: "emerald", text: verification.detail || "Confirmed" },
    ADVERSE: { color: "red", text: verification.detail || "Not in good standing" },
    NOT_FOUND: { color: "amber", text: verification.detail || "No matching record" },
    CHECK_FAILED: { color: "slate", text: "Couldn't check just now — we'll retry" },
  };
  const { color, text } = presentation[verification.status] ?? {
    color: "slate" as const,
    text: verification.status,
  };

  return (
    <div className="flex items-start justify-between gap-3 py-2 text-sm">
      <div>
        <div className="font-medium text-slate-900">{label}</div>
        <div className="text-slate-500">{text}</div>
      </div>
      <div className="shrink-0 text-right">
        <Badge color={color}>
          {verification.status === "VERIFIED" ? "Confirmed" : verification.status === "CHECK_FAILED" ? "Pending" : "Check"}
        </Badge>
        <div className="mt-1 text-xs text-slate-400">checked {checkedOn}</div>
      </div>
    </div>
  );
}

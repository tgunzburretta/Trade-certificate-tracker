import { prisma } from "@/lib/prisma";
import { VERIFICATION_RECHECK_DAYS } from "@/lib/constants";
import { getProvider, runAndRecordCheck, getLatestVerifications } from "@/lib/verification";

export interface VerificationSweepResult {
  checked: number;
  rechecked: number;
  newlyAdverse: string[];
  errors: string[];
}

/**
 * Re-runs company verifications that have gone stale. A company falling into
 * liquidation between checks is exactly the thing a main contractor relying on
 * the compliance card needs to find out about, so this is not optional upkeep.
 */
export async function runVerificationSweep(): Promise<VerificationSweepResult> {
  const result: VerificationSweepResult = {
    checked: 0,
    rechecked: 0,
    newlyAdverse: [],
    errors: [],
  };

  const provider = getProvider("COMPANIES_HOUSE");
  if (!provider.isConfigured()) return result;

  const companies = await prisma.company.findMany({
    where: { companyNumber: { not: null } },
    select: { id: true, name: true, companyNumber: true },
  });
  result.checked = companies.length;

  const staleBefore = new Date();
  staleBefore.setDate(staleBefore.getDate() - VERIFICATION_RECHECK_DAYS.COMPANIES_HOUSE);

  for (const company of companies) {
    if (!company.companyNumber) continue;

    const latest = (await getLatestVerifications(company.id)).find(
      (v) => v.source === "COMPANIES_HOUSE",
    );
    // A check that failed is retried on the next sweep rather than waiting out
    // the full recheck window — we never established anything the first time.
    const isStale =
      !latest || latest.status === "CHECK_FAILED" || latest.checkedAt < staleBefore;
    if (!isStale) continue;

    try {
      const check = await runAndRecordCheck(company.id, "COMPANIES_HOUSE", company.companyNumber);
      result.rechecked++;
      if (check.status === "ADVERSE" && latest?.status !== "ADVERSE") {
        result.newlyAdverse.push(`${company.name}: ${check.detail}`);
      }
    } catch (err) {
      result.errors.push(`company ${company.id}: ${(err as Error).message}`);
    }
  }

  return result;
}

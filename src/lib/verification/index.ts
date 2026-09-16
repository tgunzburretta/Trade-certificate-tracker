import { prisma } from "@/lib/prisma";
import { companiesHouseProvider } from "@/lib/verification/companiesHouse";
import type { VerificationProvider } from "@/lib/verification/types";
import type { VerificationSource } from "@/lib/constants";

const PROVIDERS: Record<VerificationSource, VerificationProvider> = {
  COMPANIES_HOUSE: companiesHouseProvider,
};

export function getProvider(source: VerificationSource): VerificationProvider {
  return PROVIDERS[source];
}

export interface RecordedCheck {
  status: string;
  detail: string;
  registeredName?: string;
  registeredAddress?: string;
}

/**
 * Runs a check and appends the result to the company's verification history.
 * Returns the result so callers can prefill company details from it.
 *
 * Always writes a row, including for CHECK_FAILED — knowing we tried and
 * couldn't reach the register is itself part of the audit trail.
 */
export async function runAndRecordCheck(
  companyId: string,
  source: VerificationSource,
  identifier: string,
): Promise<RecordedCheck> {
  const provider = getProvider(source);
  const result = await provider.check(identifier);

  await prisma.companyVerification.create({
    data: {
      companyId,
      source,
      identifier,
      status: result.status,
      detail: result.detail,
      reference: result.reference,
      payload: result.payload ? JSON.stringify(result.payload) : null,
    },
  });

  // Keep the company's registered details in step with whatever the register
  // last told us. This lives here rather than at the call site so a check that
  // only succeeds on a later retry still backfills them.
  if (result.registeredName || result.registeredAddress) {
    await prisma.company.update({
      where: { id: companyId },
      data: {
        registeredName: result.registeredName || null,
        registeredAddress: result.registeredAddress || null,
      },
    });
  }

  return {
    status: result.status,
    detail: result.detail,
    registeredName: result.registeredName,
    registeredAddress: result.registeredAddress,
  };
}

export interface LatestVerification {
  source: string;
  status: string;
  detail: string | null;
  checkedAt: Date;
}

/**
 * Most recent check per source for a company. Reads stored rows only — never
 * calls an external register, so this is safe on the public compliance card.
 */
export async function getLatestVerifications(companyId: string): Promise<LatestVerification[]> {
  const rows = await prisma.companyVerification.findMany({
    where: { companyId },
    orderBy: { checkedAt: "desc" },
  });

  const latestBySource = new Map<string, LatestVerification>();
  for (const row of rows) {
    if (latestBySource.has(row.source)) continue;
    latestBySource.set(row.source, {
      source: row.source,
      status: row.status,
      detail: row.detail,
      checkedAt: row.checkedAt,
    });
  }
  return [...latestBySource.values()];
}

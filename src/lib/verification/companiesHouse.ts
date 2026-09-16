import type { CheckResult, VerificationProvider } from "@/lib/verification/types";

const DEFAULT_BASE_URL = "https://api.company-information.service.gov.uk";
const REQUEST_TIMEOUT_MS = 8000;

/** company_status values that mean the company is trading normally. */
const HEALTHY_STATUSES = new Set(["active"]);

const STATUS_DESCRIPTIONS: Record<string, string> = {
  active: "Active",
  dissolved: "Dissolved",
  liquidation: "In liquidation",
  receivership: "In receivership",
  administration: "In administration",
  "voluntary-arrangement": "In a voluntary arrangement",
  "converted-closed": "Converted or closed",
  removed: "Removed from the register",
};

interface CompanyProfile {
  company_name?: string;
  company_number?: string;
  company_status?: string;
  company_status_detail?: string;
  date_of_creation?: string;
  registered_office_address?: {
    address_line_1?: string;
    address_line_2?: string;
    locality?: string;
    region?: string;
    postal_code?: string;
    country?: string;
  };
}

/**
 * Companies House issues 8-character numbers. Plain numeric ones are stored
 * zero-padded ("1234567" is really "01234567"), and prefixed ones (SC, NI, OC)
 * are uppercase. Normalising here means a customer can type it however it
 * appears on their letterhead.
 */
export function normaliseCompanyNumber(input: string): string {
  const cleaned = input.replace(/\s+/g, "").toUpperCase();
  if (/^\d+$/.test(cleaned)) return cleaned.padStart(8, "0");
  return cleaned;
}

export function formatAddress(address: CompanyProfile["registered_office_address"]): string {
  if (!address) return "";
  return [
    address.address_line_1,
    address.address_line_2,
    address.locality,
    address.region,
    address.postal_code,
    address.country,
  ]
    .filter((part) => part && part.trim().length > 0)
    .join(", ");
}

/** Exported for testing: maps a raw profile to our own result shape. */
export function interpretProfile(profile: CompanyProfile): CheckResult {
  const status = (profile.company_status || "").toLowerCase();
  const healthy = HEALTHY_STATUSES.has(status);
  const described = STATUS_DESCRIPTIONS[status] || profile.company_status || "Unknown status";

  const incorporated = profile.date_of_creation
    ? new Date(profile.date_of_creation).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const detailParts = [described];
  if (profile.company_status_detail) detailParts.push(profile.company_status_detail);
  if (incorporated) detailParts.push(`incorporated ${incorporated}`);

  return {
    status: healthy ? "VERIFIED" : "ADVERSE",
    detail: detailParts.join(" · "),
    payload: profile,
    registeredName: profile.company_name,
    registeredAddress: formatAddress(profile.registered_office_address),
  };
}

export class CompaniesHouseProvider implements VerificationProvider {
  readonly source = "COMPANIES_HOUSE" as const;

  isConfigured(): boolean {
    return Boolean(process.env.COMPANIES_HOUSE_API_KEY);
  }

  async check(identifier: string): Promise<CheckResult> {
    const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
    if (!apiKey) {
      return { status: "CHECK_FAILED", detail: "Companies House lookup is not configured" };
    }

    const number = normaliseCompanyNumber(identifier);
    if (!number) {
      return { status: "NOT_FOUND", detail: "No company number given" };
    }

    const baseUrl = process.env.COMPANIES_HOUSE_API_URL || DEFAULT_BASE_URL;
    // Companies House uses HTTP Basic with the API key as the username and
    // an empty password.
    const auth = Buffer.from(`${apiKey}:`).toString("base64");

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/company/${encodeURIComponent(number)}`, {
        headers: { Authorization: `Basic ${auth}`, Accept: "application/json" },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        cache: "no-store",
      });
    } catch (err) {
      // Network error, DNS failure, timeout — the register is unreachable.
      // Never let this look like a failed company.
      return {
        status: "CHECK_FAILED",
        detail: `Could not reach Companies House: ${(err as Error).message}`,
      };
    }

    if (response.status === 404) {
      return { status: "NOT_FOUND", detail: `No company found with number ${number}` };
    }

    if (!response.ok) {
      return {
        status: "CHECK_FAILED",
        detail: `Companies House returned HTTP ${response.status}`,
      };
    }

    let profile: CompanyProfile;
    try {
      profile = (await response.json()) as CompanyProfile;
    } catch {
      return { status: "CHECK_FAILED", detail: "Companies House returned an unreadable response" };
    }

    return interpretProfile(profile);
  }
}

export const companiesHouseProvider = new CompaniesHouseProvider();

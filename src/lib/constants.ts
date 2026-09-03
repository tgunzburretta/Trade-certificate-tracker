export const TRIAL_DAYS = 14;

export const PLAN_STATUSES = ["TRIAL", "ACTIVE", "PAST_DUE", "CANCELED"] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

export const ROLES = ["OWNER", "MEMBER"] as const;
export type Role = (typeof ROLES)[number];

// Shown as an optional "How did you hear about us?" field at signup, so
// outreach channels (see the customer-outreach checklist) can be measured
// rather than guessed at.
export const REFERRAL_SOURCES = [
  { value: "WORD_OF_MOUTH", label: "Word of mouth / a mate recommended it" },
  { value: "FACEBOOK_WHATSAPP", label: "Facebook or WhatsApp trade group" },
  { value: "DIRECTORY", label: "Checkatrade, MyBuilder or a similar directory" },
  { value: "TRADE_BODY", label: "A trade body or association" },
  { value: "SEARCH", label: "Google / search engine" },
  { value: "OTHER", label: "Other" },
] as const;
export type ReferralSource = (typeof REFERRAL_SOURCES)[number]["value"];

export const CERT_TYPES = [
  { value: "PUBLIC_LIABILITY", label: "Public liability insurance" },
  { value: "CSCS_CARD", label: "CSCS card" },
  { value: "VAN_MOT", label: "Van MOT" },
  { value: "LADDER_INSPECTION", label: "Ladder inspection" },
  { value: "DBS_CHECK", label: "DBS check" },
  { value: "GAS_SAFE", label: "Gas Safe registration" },
  { value: "PAT_TESTING", label: "PAT testing" },
  { value: "FIRE_SAFETY", label: "Fire safety certificate" },
  { value: "OTHER", label: "Other" },
] as const;
export type CertTypeValue = (typeof CERT_TYPES)[number]["value"];

export function certTypeLabel(value: string): string {
  return CERT_TYPES.find((c) => c.value === value)?.label ?? value;
}

export const REMINDER_WINDOWS = ["DAYS_60", "DAYS_30", "DAYS_7"] as const;
export type ReminderWindow = (typeof REMINDER_WINDOWS)[number];

export const REMINDER_WINDOW_DAYS: Record<ReminderWindow, number> = {
  DAYS_60: 60,
  DAYS_30: 30,
  DAYS_7: 7,
};

// Trade-company plans, tiered by how many workers can be tracked. Ordered
// cheapest first — billing/pricing UI renders them in this order.
export const PLAN_TIERS = [
  {
    id: "SOLO",
    name: "Solo",
    priceGBP: 7,
    workerLimit: 1,
    blurb: "One-person outfits tracking their own certs.",
    features: [
      "1 worker",
      "Unlimited certificates",
      "Email alerts at 60 / 30 / 7 days",
      "Shareable compliance card",
    ],
    popular: false,
  },
  {
    id: "CREW",
    name: "Crew",
    priceGBP: 15,
    workerLimit: 6,
    blurb: "Small crews — most roofers, sparkies and plumbers land here.",
    features: [
      "Up to 6 workers",
      "Unlimited certificates",
      "Email alerts at 60 / 30 / 7 days",
      "Shareable compliance card",
    ],
    popular: true,
  },
  {
    id: "BUSINESS",
    name: "Business",
    priceGBP: 29,
    workerLimit: null,
    blurb: "Bigger outfits and subcontractor networks.",
    features: [
      "Unlimited workers",
      "Unlimited certificates",
      "Email alerts at 60 / 30 / 7 days",
      "Shareable compliance card",
      "Priority email support",
    ],
    popular: false,
  },
] as const;
export type PlanTierId = (typeof PLAN_TIERS)[number]["id"];

export function getPlanTier(id: string) {
  return PLAN_TIERS.find((t) => t.id === id) ?? PLAN_TIERS[1];
}

/** null means unlimited. */
export function getWorkerLimit(tierId: string): number | null {
  return getPlanTier(tierId).workerLimit;
}

// Contractor plan — main contractors paying to watch subcontractors'
// compliance cards from one dashboard. Single tier: unlimited watched subs.
export const CONTRACTOR_PLAN_PRICE_GBP = 19;

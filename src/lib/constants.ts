export const TRIAL_DAYS = 14;

export const PLAN_STATUSES = ["TRIAL", "ACTIVE", "PAST_DUE", "CANCELED"] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

export const ROLES = ["OWNER", "MEMBER"] as const;
export type Role = (typeof ROLES)[number];

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

export const PLAN_PRICE_GBP = 8;

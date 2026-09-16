import type { VerificationSource, VerificationStatus } from "@/lib/constants";

export interface CheckResult {
  status: VerificationStatus;
  /** One line shown to the user, e.g. "Active since 15 January 2019". */
  detail: string;
  /** Proof-of-check reference, where the register issues one. */
  reference?: string;
  /** Raw response, kept verbatim for audit. */
  payload?: unknown;
  /** Present on a successful lookup — used to prefill company details. */
  registeredName?: string;
  registeredAddress?: string;
}

export interface VerificationProvider {
  source: VerificationSource;
  /** False when credentials are absent — callers skip rather than fail. */
  isConfigured(): boolean;
  /**
   * Look up `identifier` against the register.
   *
   * Implementations must never throw for an ordinary negative result: a
   * missing record is NOT_FOUND, an unreachable register is CHECK_FAILED.
   * Those two must stay distinguishable — see VERIFICATION_STATUSES.
   */
  check(identifier: string): Promise<CheckResult>;
}

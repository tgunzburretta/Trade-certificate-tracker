import Link from "next/link";
import { CONTRACTOR_PLAN_PRICE_GBP } from "@/lib/constants";

interface ContractorInfo {
  planStatus: string;
  trialEndsAt: Date;
}

export function ContractorTrialBanner({ contractor, now }: { contractor: ContractorInfo; now: Date }) {
  if (contractor.planStatus === "ACTIVE") return null;

  if (contractor.planStatus === "PAST_DUE" || contractor.planStatus === "CANCELED") {
    return (
      <div className="bg-red-600 px-4 py-2 text-center text-sm text-white">
        Your subscription needs attention.{" "}
        <Link href="/contractor/billing" className="font-semibold underline">
          Fix billing
        </Link>
      </div>
    );
  }

  const daysLeft = Math.ceil(
    (new Date(contractor.trialEndsAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  return (
    <div className="bg-slate-900 px-4 py-2 text-center text-sm text-white">
      {daysLeft > 0 ? (
        <>
          {daysLeft} day{daysLeft === 1 ? "" : "s"} left on your free trial.{" "}
        </>
      ) : (
        <>Your free trial has ended. </>
      )}
      <Link href="/contractor/billing" className="font-semibold underline">
        Add billing — £{CONTRACTOR_PLAN_PRICE_GBP}/mo
      </Link>
    </div>
  );
}

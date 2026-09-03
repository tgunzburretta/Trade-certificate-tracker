import Link from "next/link";
import { PLAN_TIERS } from "@/lib/constants";

const FROM_PRICE = Math.min(...PLAN_TIERS.map((t) => t.priceGBP));

interface CompanyInfo {
  planStatus: string;
  trialEndsAt: Date;
}

export function TrialBanner({ company, now }: { company: CompanyInfo; now: Date }) {
  if (company.planStatus === "ACTIVE") return null;

  if (company.planStatus === "PAST_DUE" || company.planStatus === "CANCELED") {
    return (
      <div className="bg-red-600 px-4 py-2 text-center text-sm text-white">
        Your subscription needs attention.{" "}
        <Link href="/billing" className="font-semibold underline">
          Fix billing
        </Link>
      </div>
    );
  }

  const daysLeft = Math.ceil(
    (new Date(company.trialEndsAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
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
      <Link href="/billing" className="font-semibold underline">
        Add billing — from £{FROM_PRICE}/mo
      </Link>
    </div>
  );
}

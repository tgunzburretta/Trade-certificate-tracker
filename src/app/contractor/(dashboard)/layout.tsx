import { redirect } from "next/navigation";
import { getCurrentContractor } from "@/lib/contractorAuth";
import { ContractorNavBar } from "@/components/ContractorNavBar";
import { ContractorTrialBanner } from "@/components/ContractorTrialBanner";

export default async function ContractorAppLayout({ children }: { children: React.ReactNode }) {
  const contractor = await getCurrentContractor();
  if (!contractor) redirect("/contractor/login");

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <ContractorNavBar businessName={contractor.businessName} />
      <ContractorTrialBanner contractor={contractor} now={new Date()} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}

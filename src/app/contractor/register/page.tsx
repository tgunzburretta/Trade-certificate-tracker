import Link from "next/link";
import { Logo } from "@/components/Logo";
import { registerContractorAction } from "@/app/actions/contractorAuth";
import { Card, Field, SubmitButton, ErrorBanner } from "@/components/ui";
import { TRIAL_DAYS } from "@/lib/constants";

export default async function ContractorRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center bg-slate-50 px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Link href="/for-contractors">
            <Logo size={26} wordmarkClassName="text-xl font-semibold tracking-tight text-slate-900" suffix="for contractors" />
          </Link>
          <p className="mt-1 text-sm text-slate-500">{TRIAL_DAYS}-day free trial, no card needed.</p>
        </div>
        <Card className="p-6">
          <h1 className="mb-4 text-lg font-semibold text-slate-900">Create your account</h1>
          <form action={registerContractorAction} className="space-y-4">
            <ErrorBanner message={error} />
            <Field label="Business name" name="businessName" required placeholder="Ridgeline Construction" />
            <Field label="Email" name="email" type="email" required />
            <Field label="Password" name="password" type="password" required placeholder="At least 8 characters" />
            <SubmitButton className="w-full">Start free trial</SubmitButton>
          </form>
        </Card>
        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/contractor/login" className="font-medium text-slate-900 underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

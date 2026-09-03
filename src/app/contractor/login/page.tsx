import Link from "next/link";
import { loginContractorAction } from "@/app/actions/contractorAuth";
import { Card, Field, SubmitButton, ErrorBanner } from "@/components/ui";

export default async function ContractorLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reset?: string }>;
}) {
  const { error, reset } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center bg-slate-50 px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Link href="/for-contractors" className="text-xl font-semibold tracking-tight text-slate-900">
            CertTrack <span className="text-slate-400">for contractors</span>
          </Link>
        </div>
        <Card className="p-6">
          <h1 className="mb-4 text-lg font-semibold text-slate-900">Sign in</h1>
          {reset && (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Password reset. Sign in with your new password.
            </div>
          )}
          <form action={loginContractorAction} className="space-y-4">
            <ErrorBanner message={error} />
            <Field label="Email" name="email" type="email" required />
            <Field label="Password" name="password" type="password" required />
            <SubmitButton className="w-full">Sign in</SubmitButton>
          </form>
          <p className="mt-3 text-center text-sm">
            <Link href="/contractor/forgot-password" className="text-slate-500 hover:underline">
              Forgot password?
            </Link>
          </p>
        </Card>
        <p className="mt-4 text-center text-sm text-slate-500">
          No account?{" "}
          <Link href="/contractor/register" className="font-medium text-slate-900 underline">
            Start your free trial
          </Link>
        </p>
      </div>
    </div>
  );
}

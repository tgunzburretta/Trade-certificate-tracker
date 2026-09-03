import Link from "next/link";
import { resetPasswordAction } from "@/app/actions/auth";
import { Card, Field, SubmitButton, ErrorBanner } from "@/components/ui";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center bg-slate-50 px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Link href="/" className="text-xl font-semibold tracking-tight text-slate-900">
            CertTrack
          </Link>
        </div>
        <Card className="p-6">
          <h1 className="mb-4 text-lg font-semibold text-slate-900">Choose a new password</h1>
          {!token ? (
            <ErrorBanner message="Missing reset link. Request a new one from the forgot password page." />
          ) : (
            <form action={resetPasswordAction} className="space-y-4">
              <ErrorBanner message={error} />
              <input type="hidden" name="token" value={token} />
              <Field label="New password" name="password" type="password" required placeholder="At least 8 characters" />
              <SubmitButton className="w-full">Reset password</SubmitButton>
            </form>
          )}
        </Card>
        <p className="mt-4 text-center text-sm text-slate-500">
          <Link href="/forgot-password" className="font-medium text-slate-900 underline">
            Request a new link
          </Link>
        </p>
      </div>
    </div>
  );
}

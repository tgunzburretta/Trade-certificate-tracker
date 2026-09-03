import Link from "next/link";
import { Logo } from "@/components/Logo";
import { requestPasswordResetAction } from "@/app/actions/auth";
import { Card, Field, SubmitButton } from "@/components/ui";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const { sent } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center bg-slate-50 px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Link href="/">
            <Logo size={26} wordmarkClassName="text-xl font-semibold tracking-tight text-slate-900" />
          </Link>
        </div>
        <Card className="p-6">
          <h1 className="mb-4 text-lg font-semibold text-slate-900">Reset your password</h1>
          {sent ? (
            <p className="text-sm text-slate-600">
              If that email has a Vetted account, we&rsquo;ve sent a reset link to it. Check
              your inbox.
            </p>
          ) : (
            <form action={requestPasswordResetAction} className="space-y-4">
              <Field label="Email" name="email" type="email" required />
              <SubmitButton className="w-full">Send reset link</SubmitButton>
            </form>
          )}
        </Card>
        <p className="mt-4 text-center text-sm text-slate-500">
          <Link href="/login" className="font-medium text-slate-900 underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

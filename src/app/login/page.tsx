import Link from "next/link";
import { loginAction } from "@/app/actions/auth";
import { Card, Field, SubmitButton, ErrorBanner } from "@/components/ui";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center bg-slate-50 px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Link href="/" className="text-xl font-semibold tracking-tight text-slate-900">
            CertTrack
          </Link>
        </div>
        <Card className="p-6">
          <h1 className="mb-4 text-lg font-semibold text-slate-900">Sign in</h1>
          <form action={loginAction} className="space-y-4">
            <ErrorBanner message={error} />
            <Field label="Email" name="email" type="email" required />
            <Field label="Password" name="password" type="password" required />
            <SubmitButton className="w-full">Sign in</SubmitButton>
          </form>
        </Card>
        <p className="mt-4 text-center text-sm text-slate-500">
          No account?{" "}
          <Link href="/register" className="font-medium text-slate-900 underline">
            Start your free trial
          </Link>
        </p>
      </div>
    </div>
  );
}

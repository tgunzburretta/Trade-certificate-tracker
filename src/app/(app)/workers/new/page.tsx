import Link from "next/link";
import { createWorkerAction } from "@/app/actions/workers";
import { Card, Field, SubmitButton, ErrorBanner } from "@/components/ui";

export default async function NewWorkerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-md space-y-4">
      <Link href="/workers" className="text-sm text-slate-500 hover:underline">
        ← Workers
      </Link>
      <h1 className="text-2xl font-semibold text-slate-900">Add worker</h1>
      <Card className="p-6">
        <form action={createWorkerAction} className="space-y-4">
          <ErrorBanner message={error} />
          <Field label="Full name" name="name" required placeholder="Sam Taylor" />
          <Field label="Job title (optional)" name="jobTitle" placeholder="Roofer" />
          <SubmitButton className="w-full">Add worker</SubmitButton>
        </form>
      </Card>
    </div>
  );
}

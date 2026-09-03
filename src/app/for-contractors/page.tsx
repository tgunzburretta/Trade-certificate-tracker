import Link from "next/link";
import { CONTRACTOR_PLAN_PRICE_GBP, TRIAL_DAYS } from "@/lib/constants";
import { Logo } from "@/components/Logo";

const FEATURES = [
  {
    title: "One dashboard, every subcontractor",
    body: "Add each subcontractor's compliance card link once. See who's covered and who isn't at a glance, before you put them on site.",
  },
  {
    title: "Always current",
    body: "Status is pulled live from each subcontractor's own Vetted account — no chasing them for a PDF before every job.",
  },
  {
    title: "Nothing sensitive, just status",
    body: "You see red/amber/green compliance status, never the underlying documents. Subcontractors control what they publish.",
  },
];

export default function ForContractorsPage() {
  return (
    <div className="flex flex-1 flex-col bg-white">
      <header className="border-b border-slate-100">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/contractor/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Sign in
            </Link>
            <Link
              href="/contractor/register"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Start free trial
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Know your subcontractors are covered — before the job starts.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-slate-600">
            Main contractors use Vetted to keep a live dashboard of every subcontractor&rsquo;s
            insurance, CSCS cards and safety certs, instead of chasing paperwork by email.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/contractor/register"
              className="rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Start your {TRIAL_DAYS}-day free trial
            </Link>
            <span className="text-sm text-slate-500">
              £{CONTRACTOR_PLAN_PRICE_GBP}/mo after · no card to start
            </span>
          </div>
        </section>

        <section className="border-t border-slate-100 bg-slate-50 py-16">
          <div className="mx-auto grid max-w-5xl gap-6 px-4 sm:grid-cols-3 sm:px-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-semibold text-slate-900">{f.title}</h3>
                <p className="mt-1.5 text-sm text-slate-600">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
          <h2 className="text-2xl font-semibold text-slate-900">Simple pricing</h2>
          <p className="mt-2 text-slate-600">
            £{CONTRACTOR_PLAN_PRICE_GBP} per month. Unlimited subcontractors tracked.
          </p>
          <Link
            href="/contractor/register"
            className="mt-6 inline-block rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Get started
          </Link>
        </section>

        <section className="border-t border-slate-100 py-10 text-center">
          <p className="text-sm text-slate-500">
            Running a small trade business instead?{" "}
            <Link href="/" className="font-medium text-slate-900 underline">
              See Vetted for trades
            </Link>
          </p>
        </section>
      </main>

      <footer className="border-t border-slate-100 py-8 text-center text-xs text-slate-400">
        Vetted — certificate renewal tracking for trades.
      </footer>
    </div>
  );
}

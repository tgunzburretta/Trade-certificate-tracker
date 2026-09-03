import Link from "next/link";
import { PLAN_TIERS, TRIAL_DAYS } from "@/lib/constants";
import { Logo } from "@/components/Logo";

const FROM_PRICE = Math.min(...PLAN_TIERS.map((t) => t.priceGBP));

const CERT_EXAMPLES = [
  "Public liability insurance",
  "CSCS cards",
  "Van MOT",
  "Ladder inspections",
  "DBS checks",
];

const FEATURES = [
  {
    title: "Add a cert, set the expiry",
    body: "One record per certificate — public liability, CSCS, MOT, ladder checks, DBS. Attach a worker or keep it company-wide.",
  },
  {
    title: "Alerts at 60 / 30 / 7 days",
    body: "Automatic email reminders before anything lapses, so a job never gets turned away over paperwork.",
  },
  {
    title: "Per-worker view",
    body: "See exactly who's covered and who isn't at a glance — built for 1–6 person outfits, not enterprise HR.",
  },
  {
    title: "One-tap document upload",
    body: "Snap a photo of the certificate with your phone and it's attached. No filing cabinet, no lost paperwork.",
  },
  {
    title: "Shareable compliance card",
    body: "A public link you can text or email to a customer or main contractor, showing your certs are current — without exposing the documents themselves.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-white">
      <header className="border-b border-slate-100">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Logo />
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Sign in
            </Link>
            <Link
              href="/register"
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
            Never lose a job to a lapsed certificate.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-slate-600">
            {CERT_EXAMPLES.join(", ")} — every expiry date, in one place, with alerts before
            they lapse. Built for roofers, sparkies, plumbers and scaffolders running small
            crews.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Start your {TRIAL_DAYS}-day free trial
            </Link>
            <span className="text-sm text-slate-500">From £{FROM_PRICE}/mo after · no card to start</span>
          </div>
        </section>

        <section className="border-t border-slate-100 bg-slate-50 py-16">
          <div className="mx-auto grid max-w-5xl gap-6 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-semibold text-slate-900">{f.title}</h3>
                <p className="mt-1.5 text-sm text-slate-600">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-slate-900">Simple pricing</h2>
            <p className="mt-2 text-slate-600">Priced by crew size. Unlimited certificates on every plan.</p>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {PLAN_TIERS.map((tier) => (
              <div
                key={tier.id}
                className={`flex flex-col rounded-xl border p-6 ${
                  tier.popular ? "border-slate-900 ring-1 ring-slate-900" : "border-slate-200"
                }`}
              >
                {tier.popular && (
                  <span className="mb-2 inline-flex w-fit items-center rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-medium text-white">
                    Most popular
                  </span>
                )}
                <h3 className="font-semibold text-slate-900">{tier.name}</h3>
                <p className="mt-1 text-sm text-slate-500">{tier.blurb}</p>
                <p className="mt-3 text-2xl font-semibold text-slate-900">
                  £{tier.priceGBP}
                  <span className="text-sm font-normal text-slate-500">/mo</span>
                </p>
                <ul className="mt-4 flex-1 space-y-1 text-left text-sm text-slate-600">
                  {tier.features.map((f) => (
                    <li key={f}>✓ {f}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link
              href="/register"
              className="inline-block rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Get started
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-100 py-8 text-center text-xs text-slate-400">
        Vetted — certificate renewal tracking for trades.
      </footer>
    </div>
  );
}

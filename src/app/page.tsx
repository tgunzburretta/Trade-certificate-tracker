import Link from "next/link";
import { PLAN_PRICE_GBP, TRIAL_DAYS } from "@/lib/constants";

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
          <span className="text-lg font-semibold tracking-tight text-slate-900">CertTrack</span>
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
            <span className="text-sm text-slate-500">£{PLAN_PRICE_GBP}/mo after · no card to start</span>
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

        <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
          <h2 className="text-2xl font-semibold text-slate-900">Simple pricing</h2>
          <p className="mt-2 text-slate-600">
            £{PLAN_PRICE_GBP} per month per company. Unlimited workers, unlimited certificates.
          </p>
          <Link
            href="/register"
            className="mt-6 inline-block rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Get started
          </Link>
        </section>
      </main>

      <footer className="border-t border-slate-100 py-8 text-center text-xs text-slate-400">
        CertTrack — certificate renewal tracking for trades.
      </footer>
    </div>
  );
}

import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function ForContractorsPage() {
  return (
    <div className="flex flex-1 flex-col bg-white">
      <header className="border-b border-slate-100">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/">
            <Logo />
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center">
        <section className="mx-auto max-w-lg px-4 py-24 text-center sm:px-6">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            For contractors — coming soon.
          </h1>
          <p className="mx-auto mt-4 max-w-md text-slate-600">
            We&rsquo;re building a dashboard for main contractors to check subcontractors&rsquo;
            compliance status at a glance. It&rsquo;s not open yet — check back soon.
          </p>
          <Link
            href="/"
            className="mt-8 inline-block rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Back to Vetted for trades
          </Link>
        </section>
      </main>

      <footer className="border-t border-slate-100 py-8 text-center text-xs text-slate-400">
        Vetted — certificate renewal tracking for trades.
      </footer>
    </div>
  );
}

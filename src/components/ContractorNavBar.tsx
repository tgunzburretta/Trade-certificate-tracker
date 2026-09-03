import Link from "next/link";
import { logoutContractorAction } from "@/app/actions/contractorAuth";

const LINKS = [
  { href: "/contractor/dashboard", label: "Dashboard" },
  { href: "/contractor/billing", label: "Billing" },
];

export function ContractorNavBar({ businessName }: { businessName: string }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-6">
          <Link
            href="/contractor/dashboard"
            className="text-lg font-semibold tracking-tight text-slate-900"
          >
            CertTrack <span className="text-slate-400">for contractors</span>
          </Link>
          <nav className="hidden gap-4 sm:flex">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-slate-500 sm:inline">{businessName}</span>
          <form action={logoutContractorAction}>
            <button type="submit" className="text-sm font-medium text-slate-500 hover:text-slate-900">
              Sign out
            </button>
          </form>
        </div>
      </div>
      <nav className="flex gap-4 border-t border-slate-100 px-4 py-2 sm:hidden">
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="text-sm font-medium text-slate-600">
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

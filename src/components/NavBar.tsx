import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/workers", label: "Workers" },
  { href: "/billing", label: "Billing" },
];

export function NavBar({ companyName }: { companyName: string }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-lg font-semibold tracking-tight text-slate-900">
            CertTrack
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
          <span className="hidden text-sm text-slate-500 sm:inline">{companyName}</span>
          <form action={logoutAction}>
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

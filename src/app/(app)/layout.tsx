import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { NavBar } from "@/components/NavBar";
import { TrialBanner } from "@/components/TrialBanner";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <NavBar companyName={user.company.name} />
      <TrialBanner company={user.company} now={new Date()} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}

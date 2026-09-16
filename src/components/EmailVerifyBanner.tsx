import { resendVerificationAction } from "@/app/actions/auth";

export function EmailVerifyBanner({ emailVerifiedAt }: { emailVerifiedAt: Date | null }) {
  if (emailVerifiedAt) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 bg-amber-50 px-4 py-2 text-center text-sm text-amber-800">
      <span>Verify your email to make sure you get renewal alerts.</span>
      <form action={resendVerificationAction}>
        <button type="submit" className="font-semibold underline">
          Resend verification email
        </button>
      </form>
    </div>
  );
}

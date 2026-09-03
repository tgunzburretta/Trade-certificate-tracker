import { resendContractorVerificationAction } from "@/app/actions/contractorAuth";

export function ContractorEmailVerifyBanner({ emailVerifiedAt }: { emailVerifiedAt: Date | null }) {
  if (emailVerifiedAt) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 bg-amber-50 px-4 py-2 text-center text-sm text-amber-800">
      <span>Verify your email to secure your account.</span>
      <form action={resendContractorVerificationAction}>
        <button type="submit" className="font-semibold underline">
          Resend verification email
        </button>
      </form>
    </div>
  );
}

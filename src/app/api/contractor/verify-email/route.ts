import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { consumeToken } from "@/lib/tokens";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = req.nextUrl.searchParams.get("token");
  const appUrl = req.nextUrl.origin;

  if (!token) {
    return NextResponse.redirect(
      `${appUrl}/contractor/login?error=${encodeURIComponent("Missing verification link.")}`,
    );
  }

  const contractorId = await consumeToken(token, "EMAIL_VERIFY_CONTRACTOR");
  if (!contractorId) {
    return NextResponse.redirect(
      `${appUrl}/contractor/login?error=${encodeURIComponent("This verification link is invalid or has expired.")}`,
    );
  }

  await prisma.contractor.update({
    where: { id: contractorId },
    data: { emailVerifiedAt: new Date() },
  });
  return NextResponse.redirect(`${appUrl}/contractor/dashboard?verified=1`);
}

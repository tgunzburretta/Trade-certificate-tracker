import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { consumeToken } from "@/lib/tokens";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = req.nextUrl.searchParams.get("token");
  const appUrl = req.nextUrl.origin;

  if (!token) {
    return NextResponse.redirect(`${appUrl}/login?error=${encodeURIComponent("Missing verification link.")}`);
  }

  const userId = await consumeToken(token, "EMAIL_VERIFY_USER");
  if (!userId) {
    return NextResponse.redirect(
      `${appUrl}/login?error=${encodeURIComponent("This verification link is invalid or has expired.")}`,
    );
  }

  await prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
  return NextResponse.redirect(`${appUrl}/dashboard?verified=1`);
}

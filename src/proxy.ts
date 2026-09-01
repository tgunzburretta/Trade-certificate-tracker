import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PROTECTED_PREFIXES = ["/dashboard", "/workers", "/certificates", "/billing"];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!isProtected(pathname)) return NextResponse.next();

  const token = req.cookies.get("session")?.value;
  if (!token) return redirectToLogin(req);

  try {
    const secret = process.env.AUTH_SECRET;
    if (!secret) throw new Error("missing AUTH_SECRET");
    await jwtVerify(token, new TextEncoder().encode(secret));
    return NextResponse.next();
  } catch {
    return redirectToLogin(req);
  }
}

function redirectToLogin(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/dashboard/:path*", "/workers/:path*", "/certificates/:path*", "/billing/:path*"],
};

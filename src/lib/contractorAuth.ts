import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

// Deliberately a different cookie name from the trade-company `session`
// cookie in src/lib/auth.ts — a contractor and a trade-company owner are
// unrelated account types and may be signed into both at once (e.g. someone
// running their own crew who also checks on subcontractors).
const SESSION_COOKIE = "contractor_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET is missing or too short (need at least 32 characters). Set a long random string in your .env file, e.g. `openssl rand -hex 32`.",
    );
  }
  return new TextEncoder().encode(secret);
}

interface ContractorSessionPayload {
  contractorId: string;
  [key: string]: unknown;
}

export async function createContractorSession(payload: ContractorSessionPayload): Promise<void> {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: (process.env.APP_URL || "").startsWith("https://"),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroyContractorSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export interface CurrentContractor {
  id: string;
  businessName: string;
  email: string;
  planStatus: string;
  trialEndsAt: Date;
}

/** Returns null if there's no valid session — callers decide whether to redirect. */
export async function getCurrentContractor(): Promise<CurrentContractor | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  let contractorId: string;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.contractorId !== "string") return null;
    contractorId = payload.contractorId;
  } catch {
    return null;
  }

  const contractor = await prisma.contractor.findUnique({ where: { id: contractorId } });
  if (!contractor) return null;

  return {
    id: contractor.id,
    businessName: contractor.businessName,
    email: contractor.email,
    planStatus: contractor.planStatus,
    trialEndsAt: contractor.trialEndsAt,
  };
}

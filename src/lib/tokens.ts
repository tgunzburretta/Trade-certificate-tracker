import "server-only";
import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";

export type TokenPurpose =
  | "EMAIL_VERIFY_USER"
  | "EMAIL_VERIFY_CONTRACTOR"
  | "PASSWORD_RESET_USER"
  | "PASSWORD_RESET_CONTRACTOR";

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** Returns the raw token to embed in a link — never store this, only its hash. */
export async function createToken(
  purpose: TokenPurpose,
  subjectId: string,
  ttlMs: number,
): Promise<string> {
  const raw = randomBytes(32).toString("hex");
  await prisma.verificationToken.create({
    data: {
      tokenHash: hashToken(raw),
      purpose,
      subjectId,
      expiresAt: new Date(Date.now() + ttlMs),
    },
  });
  return raw;
}

/**
 * Consumes a token: valid, unused, unexpired, and of the expected purpose.
 * Returns the subjectId (User.id or Contractor.id) on success, marking the
 * token used so it can't be replayed; returns null on any failure.
 */
export async function consumeToken(raw: string, purpose: TokenPurpose): Promise<string | null> {
  const tokenHash = hashToken(raw);
  const token = await prisma.verificationToken.findUnique({ where: { tokenHash } });
  if (!token || token.purpose !== purpose) return null;
  if (token.usedAt || token.expiresAt < new Date()) return null;

  await prisma.verificationToken.update({
    where: { id: token.id },
    data: { usedAt: new Date() },
  });
  return token.subjectId;
}

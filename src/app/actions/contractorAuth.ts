"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth";
import {
  createContractorSession,
  destroyContractorSession,
  getCurrentContractor,
} from "@/lib/contractorAuth";
import { TRIAL_DAYS, REFERRAL_SOURCES } from "@/lib/constants";
import { checkRateLimit } from "@/lib/rateLimit";
import { createToken, consumeToken } from "@/lib/tokens";
import { sendEmail, verificationEmail, passwordResetEmail } from "@/lib/email";

const LOGIN_LIMIT = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const RESEND_LIMIT = 3;
const RESEND_WINDOW_MS = 15 * 60 * 1000;
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

function appUrl(): string {
  return process.env.APP_URL || "http://localhost:3000";
}

async function sendContractorVerificationEmail(
  contractorId: string,
  name: string,
  email: string,
): Promise<void> {
  const token = await createToken("EMAIL_VERIFY_CONTRACTOR", contractorId, VERIFY_TTL_MS);
  const { subject, html, text } = verificationEmail({
    name,
    verifyUrl: `${appUrl()}/api/contractor/verify-email?token=${token}`,
  });
  await sendEmail({ to: email, subject, html, text });
}

const referralSourceValues = REFERRAL_SOURCES.map((r) => r.value) as [string, ...string[]];

const registerSchema = z.object({
  businessName: z.string().trim().min(2, "Business name is too short"),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  referralSource: z.enum(referralSourceValues).optional(),
});

export async function registerContractorAction(formData: FormData): Promise<void> {
  const parsed = registerSchema.safeParse({
    businessName: formData.get("businessName"),
    email: formData.get("email"),
    password: formData.get("password"),
    referralSource: formData.get("referralSource") || undefined,
  });

  if (!parsed.success) {
    redirect(`/contractor/register?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  const { businessName, email, password, referralSource } = parsed.data;

  const existing = await prisma.contractor.findUnique({ where: { email } });
  if (existing) {
    redirect(
      `/contractor/register?error=${encodeURIComponent("An account with that email already exists")}`,
    );
  }

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

  const passwordHash = await hashPassword(password);

  const contractor = await prisma.contractor.create({
    data: { businessName, email, passwordHash, trialEndsAt, referralSource },
  });

  await sendContractorVerificationEmail(contractor.id, contractor.businessName, contractor.email);
  await createContractorSession({ contractorId: contractor.id });
  redirect("/contractor/dashboard");
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export async function loginContractorAction(formData: FormData): Promise<void> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  const genericError = `/contractor/login?error=${encodeURIComponent("Incorrect email or password")}`;
  const rateLimitedError = `/contractor/login?error=${encodeURIComponent("Too many attempts. Try again in a few minutes.")}`;
  if (!parsed.success) redirect(genericError);

  const { email, password } = parsed.data;
  if (!(await checkRateLimit(`login:contractor:${email}`, LOGIN_LIMIT, LOGIN_WINDOW_MS))) {
    redirect(rateLimitedError);
  }

  const contractor = await prisma.contractor.findUnique({ where: { email } });
  if (!contractor) redirect(genericError);

  const valid = await verifyPassword(password, contractor.passwordHash);
  if (!valid) redirect(genericError);

  await createContractorSession({ contractorId: contractor.id });
  redirect("/contractor/dashboard");
}

export async function logoutContractorAction(): Promise<void> {
  await destroyContractorSession();
  redirect("/contractor/login");
}

export async function resendContractorVerificationAction(): Promise<void> {
  const contractor = await getCurrentContractor();
  if (!contractor) redirect("/contractor/login");
  if (contractor.emailVerifiedAt) redirect("/contractor/dashboard");

  if (!(await checkRateLimit(`resend-verify:${contractor.id}`, RESEND_LIMIT, RESEND_WINDOW_MS))) {
    redirect(
      "/contractor/dashboard?error=" + encodeURIComponent("Too many requests. Try again in a few minutes."),
    );
  }

  await sendContractorVerificationEmail(contractor.id, contractor.businessName, contractor.email);
  redirect("/contractor/dashboard?resent=1");
}

const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

/**
 * Always redirects to the same "check your email" page whether or not the
 * address is registered — revealing that would let anyone enumerate which
 * emails have contractor accounts.
 */
export async function requestContractorPasswordResetAction(formData: FormData): Promise<void> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) redirect("/contractor/forgot-password?sent=1");

  const { email } = parsed.data;
  const allowed = await checkRateLimit(
    `forgot-password:contractor:${email}`,
    RESEND_LIMIT,
    RESEND_WINDOW_MS,
  );
  if (!allowed) redirect("/contractor/forgot-password?sent=1");

  const contractor = await prisma.contractor.findUnique({ where: { email } });
  if (contractor) {
    const token = await createToken("PASSWORD_RESET_CONTRACTOR", contractor.id, RESET_TTL_MS);
    const { subject, html, text } = passwordResetEmail({
      name: contractor.businessName,
      resetUrl: `${appUrl()}/contractor/reset-password?token=${token}`,
    });
    await sendEmail({ to: contractor.email, subject, html, text });
  }

  redirect("/contractor/forgot-password?sent=1");
}

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function resetContractorPasswordAction(formData: FormData): Promise<void> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const token = formData.get("token");
    redirect(
      `/contractor/reset-password?token=${encodeURIComponent(typeof token === "string" ? token : "")}&error=${encodeURIComponent(parsed.error.issues[0].message)}`,
    );
  }

  const { token, password } = parsed.data;
  const contractorId = await consumeToken(token, "PASSWORD_RESET_CONTRACTOR");
  if (!contractorId) {
    redirect(
      `/contractor/reset-password?token=${encodeURIComponent(token)}&error=${encodeURIComponent("This link is invalid or has expired.")}`,
    );
  }

  const passwordHash = await hashPassword(password);
  await prisma.contractor.update({ where: { id: contractorId }, data: { passwordHash } });

  redirect("/contractor/login?reset=1");
}

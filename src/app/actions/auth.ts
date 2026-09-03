"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword, createSession, destroySession, getCurrentUser } from "@/lib/auth";
import { makeShareSlug } from "@/lib/slug";
import { TRIAL_DAYS } from "@/lib/constants";
import { checkRateLimit } from "@/lib/rateLimit";
import { createToken, consumeToken } from "@/lib/tokens";
import { sendEmail, verificationEmail, passwordResetEmail } from "@/lib/email";

const LOGIN_LIMIT = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

function appUrl(): string {
  return process.env.APP_URL || "http://localhost:3000";
}

async function sendVerificationEmail(userId: string, name: string, email: string): Promise<void> {
  const token = await createToken("EMAIL_VERIFY_USER", userId, VERIFY_TTL_MS);
  const { subject, html, text } = verificationEmail({
    name,
    verifyUrl: `${appUrl()}/api/verify-email?token=${token}`,
  });
  await sendEmail({ to: email, subject, html, text });
}

const registerSchema = z.object({
  companyName: z.string().trim().min(2, "Company name is too short"),
  name: z.string().trim().min(2, "Your name is too short"),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function registerAction(formData: FormData): Promise<void> {
  const parsed = registerSchema.safeParse({
    companyName: formData.get("companyName"),
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirect(`/register?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  const { companyName, name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    redirect(`/register?error=${encodeURIComponent("An account with that email already exists")}`);
  }

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "OWNER",
      company: {
        create: {
          name: companyName,
          shareSlug: makeShareSlug(companyName),
          trialEndsAt,
        },
      },
    },
  });

  await sendVerificationEmail(user.id, user.name, user.email);
  await createSession({ userId: user.id, companyId: user.companyId });
  redirect("/dashboard");
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export async function loginAction(formData: FormData): Promise<void> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  const genericError = `/login?error=${encodeURIComponent("Incorrect email or password")}`;
  const rateLimitedError = `/login?error=${encodeURIComponent("Too many attempts. Try again in a few minutes.")}`;
  if (!parsed.success) redirect(genericError);

  const { email, password } = parsed.data;
  if (!(await checkRateLimit(`login:user:${email}`, LOGIN_LIMIT, LOGIN_WINDOW_MS))) {
    redirect(rateLimitedError);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) redirect(genericError);

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) redirect(genericError);

  await createSession({ userId: user.id, companyId: user.companyId });
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}

const RESEND_LIMIT = 3;
const RESEND_WINDOW_MS = 15 * 60 * 1000;

export async function resendVerificationAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.emailVerifiedAt) redirect("/dashboard");

  if (!(await checkRateLimit(`resend-verify:${user.id}`, RESEND_LIMIT, RESEND_WINDOW_MS))) {
    redirect("/dashboard?error=" + encodeURIComponent("Too many requests. Try again in a few minutes."));
  }

  await sendVerificationEmail(user.id, user.name, user.email);
  redirect("/dashboard?resent=1");
}

const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

/**
 * Always redirects to the same "check your email" page whether or not the
 * address is registered — revealing that would let anyone enumerate which
 * emails have Vetted accounts.
 */
export async function requestPasswordResetAction(formData: FormData): Promise<void> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) redirect("/forgot-password?sent=1");

  const { email } = parsed.data;
  const allowed = await checkRateLimit(`forgot-password:${email}`, RESEND_LIMIT, RESEND_WINDOW_MS);
  if (!allowed) redirect("/forgot-password?sent=1");

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const token = await createToken("PASSWORD_RESET_USER", user.id, RESET_TTL_MS);
    const { subject, html, text } = passwordResetEmail({
      name: user.name,
      resetUrl: `${appUrl()}/reset-password?token=${token}`,
    });
    await sendEmail({ to: user.email, subject, html, text });
  }

  redirect("/forgot-password?sent=1");
}

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function resetPasswordAction(formData: FormData): Promise<void> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const token = formData.get("token");
    redirect(
      `/reset-password?token=${encodeURIComponent(typeof token === "string" ? token : "")}&error=${encodeURIComponent(parsed.error.issues[0].message)}`,
    );
  }

  const { token, password } = parsed.data;
  const userId = await consumeToken(token, "PASSWORD_RESET_USER");
  if (!userId) {
    redirect(`/reset-password?token=${encodeURIComponent(token)}&error=${encodeURIComponent("This link is invalid or has expired.")}`);
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  redirect("/login?reset=1");
}

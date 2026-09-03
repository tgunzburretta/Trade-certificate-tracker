"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { createContractorSession, destroyContractorSession } from "@/lib/contractorAuth";
import { TRIAL_DAYS } from "@/lib/constants";
import { checkRateLimit } from "@/lib/rateLimit";

const LOGIN_LIMIT = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

const registerSchema = z.object({
  businessName: z.string().trim().min(2, "Business name is too short"),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function registerContractorAction(formData: FormData): Promise<void> {
  const parsed = registerSchema.safeParse({
    businessName: formData.get("businessName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirect(`/contractor/register?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  const { businessName, email, password } = parsed.data;

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
    data: { businessName, email, passwordHash, trialEndsAt },
  });

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
  if (!checkRateLimit(`login:${email}`, LOGIN_LIMIT, LOGIN_WINDOW_MS)) {
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

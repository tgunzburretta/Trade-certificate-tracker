"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword, createSession, destroySession } from "@/lib/auth";
import { makeShareSlug } from "@/lib/slug";
import { TRIAL_DAYS } from "@/lib/constants";

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
  if (!parsed.success) redirect(genericError);

  const { email, password } = parsed.data;
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

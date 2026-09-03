"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentContractor } from "@/lib/contractorAuth";
import { extractShareSlug } from "@/lib/slug";

const addSchema = z.object({
  label: z.string().trim().min(1, "Give this subcontractor a name"),
  link: z.string().trim().min(1, "Paste their compliance card link or code"),
});

export async function addWatchedSubAction(formData: FormData): Promise<void> {
  const contractor = await getCurrentContractor();
  if (!contractor) redirect("/contractor/login");

  const trialActive =
    contractor.planStatus === "TRIAL" && new Date(contractor.trialEndsAt) > new Date();
  if (contractor.planStatus !== "ACTIVE" && !trialActive) {
    redirect("/contractor/billing");
  }

  const parsed = addSchema.safeParse({
    label: formData.get("label"),
    link: formData.get("link"),
  });
  if (!parsed.success) {
    redirect(`/contractor/dashboard?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  const shareSlug = extractShareSlug(parsed.data.link);

  await prisma.watchedSub.upsert({
    where: { contractorId_shareSlug: { contractorId: contractor.id, shareSlug } },
    update: { label: parsed.data.label },
    create: { contractorId: contractor.id, shareSlug, label: parsed.data.label },
  });

  revalidatePath("/contractor/dashboard");
  redirect("/contractor/dashboard");
}

export async function removeWatchedSubAction(formData: FormData): Promise<void> {
  const contractor = await getCurrentContractor();
  if (!contractor) redirect("/contractor/login");

  const id = formData.get("id");
  if (typeof id !== "string") redirect("/contractor/dashboard");

  await prisma.watchedSub.deleteMany({ where: { id, contractorId: contractor.id } });

  revalidatePath("/contractor/dashboard");
  redirect("/contractor/dashboard");
}

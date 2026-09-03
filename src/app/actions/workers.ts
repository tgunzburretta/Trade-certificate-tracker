"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getWorkerLimit } from "@/lib/constants";

const workerSchema = z.object({
  name: z.string().trim().min(2, "Name is too short"),
  jobTitle: z.string().trim().optional(),
});

export async function createWorkerAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const parsed = workerSchema.safeParse({
    name: formData.get("name"),
    jobTitle: formData.get("jobTitle") || undefined,
  });

  if (!parsed.success) {
    redirect(`/workers/new?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  const company = await prisma.company.findUniqueOrThrow({ where: { id: user.companyId } });
  const limit = getWorkerLimit(company.planTier);
  if (limit !== null) {
    const workerCount = await prisma.worker.count({ where: { companyId: user.companyId } });
    if (workerCount >= limit) {
      redirect(
        `/workers/new?error=${encodeURIComponent(
          `Your plan is capped at ${limit} worker${limit === 1 ? "" : "s"}. Upgrade to add more.`,
        )}`,
      );
    }
  }

  const worker = await prisma.worker.create({
    data: {
      name: parsed.data.name,
      jobTitle: parsed.data.jobTitle || null,
      companyId: user.companyId,
    },
  });

  revalidatePath("/workers");
  redirect(`/workers/${worker.id}`);
}

export async function deleteWorkerAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const workerId = formData.get("workerId");
  if (typeof workerId !== "string") redirect("/workers");

  await prisma.worker.deleteMany({ where: { id: workerId, companyId: user.companyId } });

  revalidatePath("/workers");
  redirect("/workers");
}

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { saveUploadedDocument } from "@/lib/storage";
import { CERT_TYPES, certTypeLabel } from "@/lib/constants";

const certTypeValues = CERT_TYPES.map((c) => c.value) as [string, ...string[]];

const certSchema = z.object({
  type: z.enum(certTypeValues),
  label: z.string().trim().optional(),
  workerId: z.string().trim().optional(),
  issuedDate: z.string().trim().optional(),
  expiryDate: z.string().trim().min(1, "Expiry date is required"),
  notes: z.string().trim().optional(),
});

function emptyFile(file: FormDataEntryValue | null): file is null {
  return !file || (file instanceof File && file.size === 0);
}

export async function createCertificateAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const raw = {
    type: formData.get("type"),
    label: formData.get("label") || undefined,
    workerId: formData.get("workerId") || undefined,
    issuedDate: formData.get("issuedDate") || undefined,
    expiryDate: formData.get("expiryDate"),
    notes: formData.get("notes") || undefined,
  };

  const parsed = certSchema.safeParse(raw);
  const backTo = raw.workerId ? `/certificates/new?workerId=${raw.workerId}` : "/certificates/new";
  if (!parsed.success) {
    redirect(`${backTo}&error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  const { type, label, workerId, issuedDate, expiryDate, notes } = parsed.data;

  if (workerId) {
    const worker = await prisma.worker.findFirst({ where: { id: workerId, companyId: user.companyId } });
    if (!worker) redirect(backTo);
  }

  let documentPath: string | undefined;
  let documentName: string | undefined;
  const file = formData.get("document");
  if (!emptyFile(file) && file instanceof File) {
    try {
      const saved = await saveUploadedDocument(user.companyId, file);
      documentPath = saved.path;
      documentName = saved.name;
    } catch (err) {
      redirect(`${backTo}&error=${encodeURIComponent((err as Error).message)}`);
    }
  }

  const cert = await prisma.certificate.create({
    data: {
      type,
      label: label || certTypeLabel(type),
      workerId: workerId || null,
      companyId: user.companyId,
      issuedDate: issuedDate ? new Date(issuedDate) : null,
      expiryDate: new Date(expiryDate),
      notes: notes || null,
      documentPath,
      documentName,
    },
  });

  revalidatePath("/dashboard");
  if (workerId) revalidatePath(`/workers/${workerId}`);
  redirect(`/certificates/${cert.id}`);
}

const renewSchema = z.object({
  expiryDate: z.string().trim().min(1, "Expiry date is required"),
  issuedDate: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export async function renewCertificateAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const certId = formData.get("certificateId");
  if (typeof certId !== "string") redirect("/dashboard");

  const existing = await prisma.certificate.findFirst({
    where: { id: certId, companyId: user.companyId },
  });
  if (!existing) redirect("/dashboard");

  const parsed = renewSchema.safeParse({
    expiryDate: formData.get("expiryDate"),
    issuedDate: formData.get("issuedDate") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) {
    redirect(`/certificates/${certId}?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  let documentPath = existing.documentPath;
  let documentName = existing.documentName;
  const file = formData.get("document");
  if (!emptyFile(file) && file instanceof File) {
    try {
      const saved = await saveUploadedDocument(user.companyId, file);
      documentPath = saved.path;
      documentName = saved.name;
    } catch (err) {
      redirect(`/certificates/${certId}?error=${encodeURIComponent((err as Error).message)}`);
    }
  }

  await prisma.certificate.update({
    where: { id: certId },
    data: {
      expiryDate: new Date(parsed.data.expiryDate),
      issuedDate: parsed.data.issuedDate ? new Date(parsed.data.issuedDate) : existing.issuedDate,
      notes: parsed.data.notes || existing.notes,
      documentPath,
      documentName,
    },
  });

  // Renewing clears out old reminder history so the new expiry gets its own 60/30/7 cycle.
  await prisma.reminderLog.deleteMany({ where: { certificateId: certId } });

  revalidatePath("/dashboard");
  if (existing.workerId) revalidatePath(`/workers/${existing.workerId}`);
  revalidatePath(`/certificates/${certId}`);
  redirect(`/certificates/${certId}`);
}

export async function deleteCertificateAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const certId = formData.get("certificateId");
  if (typeof certId !== "string") redirect("/dashboard");

  const existing = await prisma.certificate.findFirst({
    where: { id: certId, companyId: user.companyId },
  });
  if (!existing) redirect("/dashboard");

  await prisma.certificate.delete({ where: { id: certId } });

  revalidatePath("/dashboard");
  redirect(existing.workerId ? `/workers/${existing.workerId}` : "/dashboard");
}

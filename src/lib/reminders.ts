// No "server-only" guard here: this module is also imported directly by
// scripts/send-reminders.ts via tsx, which isn't bundled through Next.js —
// "server-only" throws unconditionally outside that bundler context.
import { prisma } from "@/lib/prisma";
import { getCertStatus } from "@/lib/certStatus";
import { REMINDER_WINDOWS, REMINDER_WINDOW_DAYS, certTypeLabel } from "@/lib/constants";
import { sendEmail, reminderEmail } from "@/lib/email";

// Most urgent first, so a brand-new certificate that's already close to
// expiry gets exactly one (the most urgent) reminder rather than three at once.
const WINDOWS_BY_URGENCY = [...REMINDER_WINDOWS].sort(
  (a, b) => REMINDER_WINDOW_DAYS[a] - REMINDER_WINDOW_DAYS[b],
);

export interface ReminderSweepResult {
  checked: number;
  sent: number;
  errors: string[];
}

export async function runReminderSweep(): Promise<ReminderSweepResult> {
  const appUrl = process.env.APP_URL || "http://localhost:3000";

  const certificates = await prisma.certificate.findMany({
    include: {
      worker: true,
      company: { include: { users: true } },
      reminders: true,
    },
  });

  const result: ReminderSweepResult = { checked: certificates.length, sent: 0, errors: [] };

  for (const cert of certificates) {
    const { daysRemaining } = getCertStatus(cert.expiryDate);
    if (daysRemaining < 0) continue;

    // Only ever escalate to a *more* urgent window than anything already
    // sent — otherwise a daily catch-up run would fire the 30-day email the
    // day after the 7-day one already went out for the same certificate.
    const sentThresholds = cert.reminders.map((r) => REMINDER_WINDOW_DAYS[r.window as keyof typeof REMINDER_WINDOW_DAYS]);
    const minSentThreshold = sentThresholds.length > 0 ? Math.min(...sentThresholds) : Infinity;
    const dueWindow = WINDOWS_BY_URGENCY.find(
      (window) => daysRemaining <= REMINDER_WINDOW_DAYS[window] && REMINDER_WINDOW_DAYS[window] < minSentThreshold,
    );
    if (!dueWindow) continue;

    const recipients = cert.company.users.map((u) => u.email);
    if (recipients.length === 0) continue;

    const { subject, html, text } = reminderEmail({
      companyName: cert.company.name,
      workerName: cert.worker?.name ?? null,
      certLabel: cert.label || certTypeLabel(cert.type),
      daysRemaining,
      expiryDate: cert.expiryDate,
      dashboardUrl: `${appUrl}/certificates/${cert.id}`,
    });

    try {
      for (const to of recipients) {
        await sendEmail({ to, subject, html, text });
      }
      await prisma.reminderLog.create({
        data: { certificateId: cert.id, window: dueWindow },
      });
      result.sent++;
    } catch (err) {
      result.errors.push(`cert ${cert.id}: ${(err as Error).message}`);
    }
  }

  return result;
}

// No "server-only" guard: imported transitively by scripts/send-reminders.ts
// (run via tsx, outside the Next.js bundler where that guard would throw).
import { Resend } from "resend";

interface SendEmailArgs {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Sends via Resend when RESEND_API_KEY is set. Otherwise logs to the console
 * so reminders are still visible (and testable) in local dev / demos without
 * needing a real email account wired up.
 */
export async function sendEmail({ to, subject, html, text }: SendEmailArgs): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.REMINDER_FROM_EMAIL || "alerts@example.com";

  if (!apiKey) {
    console.log(`[email:dev-mode] to=${to} subject="${subject}"\n${text}`);
    return;
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({ from, to, subject, html, text });
  if (error) {
    throw new Error(`Resend failed to send to ${to}: ${error.message}`);
  }
}

export function reminderEmail(args: {
  companyName: string;
  workerName: string | null;
  certLabel: string;
  daysRemaining: number;
  expiryDate: Date;
  dashboardUrl: string;
}): { subject: string; html: string; text: string } {
  const { companyName, workerName, certLabel, daysRemaining, expiryDate, dashboardUrl } = args;
  const who = workerName ? `${workerName}'s ${certLabel}` : certLabel;
  const when = daysRemaining <= 0 ? "has expired" : `expires in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}`;
  const dateStr = expiryDate.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const subject =
    daysRemaining <= 0
      ? `EXPIRED: ${who} — ${companyName}`
      : `${who} ${when} — ${companyName}`;

  const text = `${who} ${when} (${dateStr}).\n\nUpdate it before it lapses a job: ${dashboardUrl}`;
  const html = `
    <div style="font-family: -apple-system, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="margin: 0 0 12px;">${who} ${when}</h2>
      <p style="color:#374151; line-height:1.5;">Expiry date: <strong>${dateStr}</strong></p>
      <p style="color:#374151; line-height:1.5;">A lapsed certificate can lose you a job on site checks — renew it and upload the new document to keep ${companyName}'s compliance card current.</p>
      <p style="margin-top:20px;">
        <a href="${dashboardUrl}" style="background:#111827;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;">Open dashboard</a>
      </p>
    </div>
  `;

  return { subject, html, text };
}

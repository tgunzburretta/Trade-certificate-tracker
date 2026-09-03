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

/** workerName, certLabel and companyName are all user-entered free text — escape before interpolating into HTML. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
  const whoHtml = workerName
    ? `${escapeHtml(workerName)}&rsquo;s ${escapeHtml(certLabel)}`
    : escapeHtml(certLabel);
  const companyNameHtml = escapeHtml(companyName);
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
      <h2 style="margin: 0 0 12px;">${whoHtml} ${when}</h2>
      <p style="color:#374151; line-height:1.5;">Expiry date: <strong>${dateStr}</strong></p>
      <p style="color:#374151; line-height:1.5;">A lapsed certificate can lose you a job on site checks — renew it and upload the new document to keep ${companyNameHtml}&rsquo;s compliance card current.</p>
      <p style="margin-top:20px;">
        <a href="${dashboardUrl}" style="background:#111827;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;">Open dashboard</a>
      </p>
    </div>
  `;

  return { subject, html, text };
}

function emailLayout(bodyHtml: string): string {
  return `
    <div style="font-family: -apple-system, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      ${bodyHtml}
    </div>
  `;
}

function emailButton(url: string, label: string): string {
  return `<p style="margin-top:20px;"><a href="${url}" style="background:#111827;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;">${label}</a></p>`;
}

export function verificationEmail(args: { name: string; verifyUrl: string }): {
  subject: string;
  html: string;
  text: string;
} {
  const nameHtml = escapeHtml(args.name);
  const subject = "Verify your email — CertTrack";
  const text = `Hi ${args.name},\n\nConfirm this is your email address to finish setting up CertTrack: ${args.verifyUrl}\n\nThis link expires in 24 hours. If you didn't request this, you can ignore it.`;
  const html = emailLayout(`
      <h2 style="margin: 0 0 12px;">Verify your email</h2>
      <p style="color:#374151; line-height:1.5;">Hi ${nameHtml}, confirm this is your email address to finish setting up CertTrack.</p>
      ${emailButton(args.verifyUrl, "Verify email")}
      <p style="color:#9ca3af; font-size:12px; margin-top:20px;">This link expires in 24 hours. If you didn't request this, you can ignore it.</p>
  `);
  return { subject, html, text };
}

export function passwordResetEmail(args: { name: string; resetUrl: string }): {
  subject: string;
  html: string;
  text: string;
} {
  const nameHtml = escapeHtml(args.name);
  const subject = "Reset your password — CertTrack";
  const text = `Hi ${args.name},\n\nReset your CertTrack password: ${args.resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, you can ignore it — your password won't change.`;
  const html = emailLayout(`
      <h2 style="margin: 0 0 12px;">Reset your password</h2>
      <p style="color:#374151; line-height:1.5;">Hi ${nameHtml}, we got a request to reset your CertTrack password.</p>
      ${emailButton(args.resetUrl, "Reset password")}
      <p style="color:#9ca3af; font-size:12px; margin-top:20px;">This link expires in 1 hour. If you didn't request this, you can ignore it — your password won't change.</p>
  `);
  return { subject, html, text };
}

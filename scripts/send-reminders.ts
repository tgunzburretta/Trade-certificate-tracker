/**
 * Local/manual runner for the 60/30/7-day reminder sweep — the same logic
 * the deployed /api/cron/reminders endpoint runs on GitHub Actions'
 * schedule. Useful for testing without standing up the cron secret + a
 * running server. Usage: npm run reminders
 */
import { runReminderSweep } from "../src/lib/reminders";
import { prisma } from "../src/lib/prisma";

async function main() {
  const result = await runReminderSweep();
  console.log(`Checked ${result.checked} certificate(s), sent ${result.sent} reminder(s).`);
  if (result.errors.length > 0) {
    console.error("Errors:", result.errors);
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

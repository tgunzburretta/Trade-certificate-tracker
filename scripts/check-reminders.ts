/**
 * Exercises the reminder and verification sweeps by moving a certificate's
 * expiry date around, simulating it ageing towards its deadline over months.
 *
 * The escalation rule is the subtle part and the reason this exists: each
 * window fires once, and a less urgent reminder must never follow a more
 * urgent one (a naive implementation sends the 30-day email the day after
 * the 7-day one). Needs no API keys and no browser.
 *
 * Usage: npm run test:reminders
 */
import { prisma } from "../src/lib/prisma";
import { runReminderSweep } from "../src/lib/reminders";
import { runVerificationSweep } from "../src/lib/verification/sweep";
import { getProvider } from "../src/lib/verification";

let passes = 0;
const failures: string[] = [];

function check(name: string, ok: boolean, detail = "") {
  if (ok) {
    passes++;
    console.log(`  PASS  ${name}`);
  } else {
    failures.push(name);
    console.log(`  FAIL  ${name}${detail ? `\n          ${detail}` : ""}`);
  }
}

function section(t: string) {
  console.log(`\n=== ${t} ===`);
}

const days = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};

/** Captures the dev-mode emails printed during one sweep. */
async function sweepCapturingEmails() {
  const sent: string[] = [];
  const original = console.log;
  console.log = (...args: unknown[]) => {
    const line = args.join(" ");
    if (line.includes("[email:dev-mode]")) sent.push(line);
  };
  const result = await runReminderSweep();
  console.log = original;
  return { result, sent };
}

async function main() {
  const stamp = Date.now();
  const company = await prisma.company.create({
    data: {
      name: "Sweep Test Ltd",
      shareSlug: `sweep-test-${stamp}`,
      trialEndsAt: days(14),
      companyNumber: "01234567",
      users: {
        create: {
          name: "Sweep Owner",
          email: `sweep${stamp}@example.com`,
          passwordHash: "x",
          role: "OWNER",
        },
      },
    },
  });

  const cert = await prisma.certificate.create({
    data: {
      type: "PUBLIC_LIABILITY",
      label: "Public liability — £5m",
      companyId: company.id,
      expiryDate: days(90),
    },
  });

  const setExpiry = (n: number) =>
    prisma.certificate.update({ where: { id: cert.id }, data: { expiryDate: days(n) } });
  const windows = async () =>
    (await prisma.reminderLog.findMany({ where: { certificateId: cert.id } })).map((r) => r.window);

  section("A. Nothing fires while the certificate is far from expiry");
  let r = await sweepCapturingEmails();
  check("no reminder at 90 days out", (await windows()).length === 0, (await windows()).join(","));

  section("B. Crossing each threshold fires exactly one reminder");
  await setExpiry(55);
  r = await sweepCapturingEmails();
  check("60-day window fires at 55 days", (await windows()).join(",") === "DAYS_60", (await windows()).join(","));
  check("exactly one email sent", r.sent.length === 1, `${r.sent.length} emails`);
  check("email names the company", r.sent[0]?.includes("Sweep Test Ltd"), r.sent[0]);

  r = await sweepCapturingEmails();
  check("same-day re-run sends nothing", r.sent.length === 0, `${r.sent.length} emails`);

  await setExpiry(50);
  r = await sweepCapturingEmails();
  check("still nothing while inside the same window", r.sent.length === 0, `${r.sent.length} emails`);

  await setExpiry(25);
  r = await sweepCapturingEmails();
  check("30-day window fires at 25 days", (await windows()).sort().join(",") === "DAYS_30,DAYS_60", (await windows()).join(","));
  check("exactly one email for the 30-day crossing", r.sent.length === 1, `${r.sent.length} emails`);

  await setExpiry(3);
  r = await sweepCapturingEmails();
  check("7-day window fires at 3 days", (await windows()).sort().join(",") === "DAYS_30,DAYS_60,DAYS_7", (await windows()).join(","));
  check("exactly one email for the 7-day crossing", r.sent.length === 1, `${r.sent.length} emails`);

  section("C. No back-sliding to a less urgent reminder");
  for (let i = 0; i < 3; i++) {
    r = await sweepCapturingEmails();
    check(`repeat run ${i + 1} stays silent`, r.sent.length === 0, `${r.sent.length} emails`);
  }

  section("D. Expired certificates stop nagging");
  await setExpiry(-5);
  r = await sweepCapturingEmails();
  check("no reminder once expired", r.sent.length === 0, `${r.sent.length} emails`);

  section("E. A brand-new certificate already inside 7 days gets ONE email, not three");
  const urgent = await prisma.certificate.create({
    data: { type: "VAN_MOT", label: "Van MOT", companyId: company.id, expiryDate: days(4) },
  });
  r = await sweepCapturingEmails();
  const urgentWindows = (await prisma.reminderLog.findMany({ where: { certificateId: urgent.id } })).map((x) => x.window);
  check("only the most urgent window is logged", urgentWindows.join(",") === "DAYS_7", urgentWindows.join(","));
  check("only one email sent", r.sent.length === 1, `${r.sent.length} emails`);

  section("F. Renewing resets the cycle");
  await prisma.certificate.update({ where: { id: urgent.id }, data: { expiryDate: days(400) } });
  await prisma.reminderLog.deleteMany({ where: { certificateId: urgent.id } });
  await prisma.certificate.update({ where: { id: urgent.id }, data: { expiryDate: days(55) } });
  r = await sweepCapturingEmails();
  const renewedWindows = (await prisma.reminderLog.findMany({ where: { certificateId: urgent.id } })).map((x) => x.window);
  check("renewed certificate starts a fresh 60-day cycle", renewedWindows.join(",") === "DAYS_60", renewedWindows.join(","));

  section("G. Verification re-check sweep");
  if (!getProvider("COMPANIES_HOUSE").isConfigured()) {
    console.log("  SKIP  Companies House not configured (set COMPANIES_HOUSE_API_KEY to cover this)");
  } else {
    const v = await runVerificationSweep();
    check("sweep finds companies with a company number", v.checked > 0, `checked=${v.checked}`);
    const latest = await prisma.companyVerification.findFirst({
      where: { companyId: company.id },
      orderBy: { checkedAt: "desc" },
    });
    check("a verification row was written", Boolean(latest), "none");

    // A register we cannot reach is an environment problem, not a code one —
    // and by design it yields CHECK_FAILED rather than an adverse finding, so
    // the liquidation assertion below would fail for the wrong reason.
    if (latest?.status === "CHECK_FAILED") {
      console.log(`  SKIP  register unreachable (${latest.detail}) — cannot test the liquidation path`);
    } else {
      // Point the company at a register record that is in liquidation.
      await prisma.company.update({ where: { id: company.id }, data: { companyNumber: "07777777" } });
      await prisma.companyVerification.deleteMany({ where: { companyId: company.id } });
      const v2 = await runVerificationSweep();
      check(
        "a company entering liquidation is reported as newly adverse",
        v2.newlyAdverse.some((s) => s.includes("Sweep Test Ltd")),
        JSON.stringify(v2.newlyAdverse),
      );
    }
  }

  // Leave no test data behind — cascades clear certificates, reminders,
  // verifications and the user.
  await prisma.company.delete({ where: { id: company.id } });

  console.log(`\n${"=".repeat(50)}`);
  console.log(`${passes} passed, ${failures.length} failed`);
  if (failures.length) failures.forEach((f) => console.log(`  - ${f}`));
  await prisma.$disconnect();
  process.exit(failures.length === 0 ? 0 : 1);
}

main();

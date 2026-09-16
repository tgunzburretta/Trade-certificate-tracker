import { NextResponse, type NextRequest } from "next/server";
import { runReminderSweep } from "@/lib/reminders";
import { runVerificationSweep } from "@/lib/verification/sweep";

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const header = req.headers.get("x-cron-secret");
  const query = req.nextUrl.searchParams.get("secret");
  return header === expected || query === expected;
}

async function handle(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Verifications first: a company that has just gone into liquidation should
  // be reflected before we send anything claiming its paperwork is in order.
  const verifications = await runVerificationSweep();
  const reminders = await runReminderSweep();
  return NextResponse.json({ reminders, verifications });
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}

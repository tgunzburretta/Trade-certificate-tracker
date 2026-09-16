import { timingSafeEqual } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { runReminderSweep } from "@/lib/reminders";
import { runVerificationSweep } from "@/lib/verification/sweep";

function secretsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  // timingSafeEqual throws on mismatched lengths rather than just returning
  // false, so short-circuit that case first (leaking length alone isn't a
  // meaningful signal for a random secret this long).
  return a.length === b.length && timingSafeEqual(a, b);
}

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const header = req.headers.get("x-cron-secret");
  const query = req.nextUrl.searchParams.get("secret");
  const provided = header ?? query;
  return provided !== null && secretsMatch(provided, expected);
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

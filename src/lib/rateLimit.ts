import "server-only";

/**
 * Best-effort in-memory rate limiter — fine for a single Node process
 * (the "single-instance deployment" case the README already calls out for
 * local document storage) but resets per instance and isn't shared across
 * replicas. For a multi-instance/serverless production deployment, swap
 * this for a shared store (e.g. Upstash Redis) keyed the same way.
 */
const attempts = new Map<string, { count: number; resetAt: number }>();

// Sweep occasionally so the map doesn't grow unbounded under sustained load.
let lastSweep = Date.now();
function sweep(now: number): void {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, entry] of attempts) {
    if (entry.resetAt <= now) attempts.delete(key);
  }
}

/**
 * Returns true and records the attempt if `key` is still under `limit`
 * attempts within `windowMs`. Returns false without recording if the limit
 * has already been reached — call this before doing the expensive/sensitive
 * work (password check), not after.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  sweep(now);

  const entry = attempts.get(key);
  if (!entry || entry.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

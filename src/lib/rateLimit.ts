import "server-only";
import { Redis } from "@upstash/redis";

/**
 * Uses Upstash Redis (REST-based, so it works from serverless/edge without
 * a persistent connection) when UPSTASH_REDIS_REST_URL/TOKEN are set — that
 * shares limits correctly across multiple instances/replicas. Falls back to
 * an in-memory counter otherwise: fine for a single Node process (the
 * "single-instance deployment" case the README already calls out for local
 * document storage), but resets per instance and isn't shared across
 * replicas.
 */
let redisClient: Redis | null | undefined;
function getRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  redisClient = url && token ? new Redis({ url, token }) : null;
  return redisClient;
}

const attempts = new Map<string, { count: number; resetAt: number }>();

// Sweep occasionally so the in-memory map doesn't grow unbounded under sustained load.
let lastSweep = Date.now();
function sweep(now: number): void {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, entry] of attempts) {
    if (entry.resetAt <= now) attempts.delete(key);
  }
}

function checkInMemory(key: string, limit: number, windowMs: number): boolean {
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

/**
 * Returns true and records the attempt if `key` is still under `limit`
 * attempts within `windowMs`. Returns false without recording if the limit
 * has already been reached — call this before doing the expensive/sensitive
 * work (password check), not after.
 */
export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return checkInMemory(key, limit, windowMs);

  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
  const count = await redis.incr(key);
  if (count === 1) {
    // Only the request that created the key sets its expiry, so a slow
    // straggler request can't reset the window for everyone else.
    await redis.expire(key, windowSeconds);
  }
  return count <= limit;
}

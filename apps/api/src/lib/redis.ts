import { Redis } from "ioredis";
import type { Env } from "../config/env.js";

/**
 * The only Redis client of the app. `rediss://` URLs enable TLS (required by Upstash).
 * Keys are prefixed per environment with REDIS_PREFIX.
 * Upstash Free has a monthly command quota: avoid polling and blocking commands.
 */
export function creaRedis(env: Pick<Env, "REDIS_URL" | "REDIS_PREFIX">): Redis {
  return new Redis(env.REDIS_URL, {
    keyPrefix: env.REDIS_PREFIX,
    lazyConnect: true,
    maxRetriesPerRequest: 2,
  });
}

import type { Redis } from "ioredis";
import type { Logger } from "pino";
import { providerOccupato } from "./provider.js";

// Open Food Facts allows 15 product reads per minute per IP: every user shares our server's IP.
const FINESTRA_S = 60;
const MAX_CHIAMATE = 12;

/**
 * Global fixed-window limit on provider calls, on Redis (same scheme as the login rate limit).
 * If Redis is down the call is allowed and a warning is logged.
 */
export function creaLimiteProvider(
  redis: Redis,
  logger: Logger,
  { chiave = "provider:off", max = MAX_CHIAMATE, finestraS = FINESTRA_S } = {},
) {
  return {
    /** Counts a provider call; throws 429 PROVIDER_OCCUPATO past the limit. */
    async registraChiamata(): Promise<void> {
      let risultati;
      try {
        risultati = await redis
          .multi()
          .incr(chiave)
          .expire(chiave, finestraS, "NX")
          .ttl(chiave)
          .exec();
      } catch (err) {
        logger.warn({ err }, "limite delle chiamate al provider non disponibile");
        return;
      }
      const chiamate = Number(risultati?.[0]?.[1] ?? 0);
      const ttl = Number(risultati?.[2]?.[1] ?? 0);
      if (chiamate > max) throw providerOccupato(Math.max(ttl, 1));
    },
  };
}

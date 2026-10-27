import type { Redis } from "ioredis";
import type { Logger } from "pino";
import { ErroreApp } from "../../lib/errori.js";

const FINESTRA_S = 15 * 60;
// Per user: slows down guessing one password. Per IP: slows down trying many usernames.
const MAX_PER_UTENTE = 5;
const MAX_PER_IP = 20;

/**
 * Fixed-window rate limit on password checks, on Redis (2 commands per counter, mindful of the
 * Upstash quota). `gruppo` separates the counters: "login" (by username) and "password" (the user
 * changing their own password, by user id).
 * If Redis is down the attempt is allowed and a warning is logged: scrypt still slows down attacks.
 */
export function creaLimiteLogin(
  redis: Redis,
  logger: Logger,
  gruppo: "login" | "password" = "login",
) {
  async function incrementa(chiave: string): Promise<{ tentativi: number; ttl: number }> {
    const risultati = await redis
      .multi()
      .incr(chiave)
      .expire(chiave, FINESTRA_S, "NX")
      .ttl(chiave)
      .exec();
    return { tentativi: Number(risultati?.[0]?.[1] ?? 0), ttl: Number(risultati?.[2]?.[1] ?? 0) };
  }

  return {
    /** Counts an attempt; throws 429 TROPPI_TENTATIVI past the limit. */
    async registraTentativo(utente: string, ip: string): Promise<void> {
      let conteggi;
      try {
        conteggi = await Promise.all([
          incrementa(`${gruppo}:utente:${utente}`),
          incrementa(`${gruppo}:ip:${ip}`),
        ]);
      } catch (err) {
        logger.warn({ err, gruppo }, "rate limit dei tentativi non disponibile");
        return;
      }
      const [perUtente, perIp] = conteggi;
      const superati = [
        perUtente.tentativi > MAX_PER_UTENTE && perUtente,
        perIp.tentativi > MAX_PER_IP && perIp,
      ].filter((c) => c !== false);
      if (superati.length) {
        const riprovaTraS = Math.max(...superati.map((c) => c.ttl), 1);
        throw new ErroreApp(429, "TROPPI_TENTATIVI", "Troppi tentativi, riprova più tardi", {
          riprovaTraS,
        });
      }
    },

    /** After a correct password the user counter starts over. */
    async azzera(utente: string): Promise<void> {
      await redis.del(`${gruppo}:utente:${utente}`).catch(() => undefined);
    },
  };
}

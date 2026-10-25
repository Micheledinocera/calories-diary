import type { Redis } from "ioredis";
import type { Logger } from "pino";
import { ErroreApp } from "../../lib/errori.js";

const FINESTRA_S = 15 * 60;
// Per email: slows down guessing one password. Per IP: slows down trying many emails.
const MAX_PER_EMAIL = 5;
const MAX_PER_IP = 20;

/**
 * Fixed-window login rate limit on Redis (2 commands per counter, mindful of the Upstash quota).
 * If Redis is down the login is allowed and a warning is logged: scrypt still slows down attacks.
 */
export function creaLimiteLogin(redis: Redis, logger: Logger) {
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
    async registraTentativo(email: string, ip: string): Promise<void> {
      let conteggi;
      try {
        conteggi = await Promise.all([
          incrementa(`login:email:${email}`),
          incrementa(`login:ip:${ip}`),
        ]);
      } catch (err) {
        logger.warn({ err }, "rate limit del login non disponibile");
        return;
      }
      const [perEmail, perIp] = conteggi;
      const superati = [
        perEmail.tentativi > MAX_PER_EMAIL && perEmail,
        perIp.tentativi > MAX_PER_IP && perIp,
      ].filter((c) => c !== false);
      if (superati.length) {
        const riprovaTraS = Math.max(...superati.map((c) => c.ttl), 1);
        throw new ErroreApp(
          429,
          "TROPPI_TENTATIVI",
          "Troppi tentativi di accesso, riprova più tardi",
          {
            riprovaTraS,
          },
        );
      }
    },

    /** After a successful login the email counter starts over. */
    async azzera(email: string): Promise<void> {
      await redis.del(`login:email:${email}`).catch(() => undefined);
    },
  };
}

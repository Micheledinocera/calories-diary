import { jwtVerify, SignJWT } from "jose";

/** A token lasts one week; the client renews it (sliding expiry) with POST /auth/rinnova. */
export const DURATA_TOKEN_S = 7 * 24 * 60 * 60;
const ALGORITMO = "HS256";
const EMITTENTE = "calories-diary";

export function creaGestoreToken(segreto: string) {
  const chiave = new TextEncoder().encode(segreto);

  return {
    async firma(utenteId: string): Promise<{ token: string; scadeIl: Date }> {
      const ora = Math.floor(Date.now() / 1000);
      const scadenza = ora + DURATA_TOKEN_S;
      const token = await new SignJWT()
        .setProtectedHeader({ alg: ALGORITMO })
        .setSubject(utenteId)
        .setIssuer(EMITTENTE)
        .setIssuedAt(ora)
        .setExpirationTime(scadenza)
        .sign(chiave);
      return { token, scadeIl: new Date(scadenza * 1000) };
    },

    /** Returns the user id, or null if the token is invalid or expired. */
    async verifica(token: string): Promise<string | null> {
      try {
        const { payload } = await jwtVerify(token, chiave, {
          algorithms: [ALGORITMO],
          issuer: EMITTENTE,
        });
        return payload.sub ?? null;
      } catch {
        return null;
      }
    },
  };
}

export type GestoreToken = ReturnType<typeof creaGestoreToken>;

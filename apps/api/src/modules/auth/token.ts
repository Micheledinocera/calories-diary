import { jwtVerify, SignJWT } from "jose";

/** A token lasts one week; the client renews it (sliding expiry) with POST /auth/rinnova. */
export const DURATA_TOKEN_S = 7 * 24 * 60 * 60;
const ALGORITMO = "HS256";
const EMITTENTE = "calories-diary";

/** Token payload: the user and their `versioneSessione` when the token was issued. */
export interface DatiToken {
  utenteId: string;
  versione: number;
}

export function creaGestoreToken(segreto: string) {
  const chiave = new TextEncoder().encode(segreto);

  return {
    async firma({ utenteId, versione }: DatiToken): Promise<{ token: string; scadeIl: Date }> {
      const ora = Math.floor(Date.now() / 1000);
      const scadenza = ora + DURATA_TOKEN_S;
      const token = await new SignJWT({ ver: versione })
        .setProtectedHeader({ alg: ALGORITMO })
        .setSubject(utenteId)
        .setIssuer(EMITTENTE)
        .setIssuedAt(ora)
        .setExpirationTime(scadenza)
        .sign(chiave);
      return { token, scadeIl: new Date(scadenza * 1000) };
    },

    /**
     * Returns user and session version, or null if the token is invalid or expired.
     * Tokens issued before the versions existed have no `ver`: they count as version 0.
     */
    async verifica(token: string): Promise<DatiToken | null> {
      try {
        const { payload } = await jwtVerify(token, chiave, {
          algorithms: [ALGORITMO],
          issuer: EMITTENTE,
        });
        if (!payload.sub) return null;
        const versione = typeof payload.ver === "number" ? payload.ver : 0;
        return { utenteId: payload.sub, versione };
      } catch {
        return null;
      }
    },
  };
}

export type GestoreToken = ReturnType<typeof creaGestoreToken>;

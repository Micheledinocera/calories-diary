import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

// scrypt from node:crypto (no native dependency). Parameters as recommended by OWASP.
const PARAMETRI = { N: 2 ** 17, r: 8, p: 1 };
const LUNGHEZZA_CHIAVE = 64;

function deriva(password: string, salt: Buffer, opzioni: ScryptOptions): Promise<Buffer> {
  // maxmem must exceed 128 * N * r (128 MiB with the parameters above).
  const maxmem = 256 * (opzioni.N ?? 0) * (opzioni.r ?? 0);
  return new Promise((resolve, reject) =>
    scrypt(password, salt, LUNGHEZZA_CHIAVE, { ...opzioni, maxmem }, (err, chiave) =>
      err ? reject(err) : resolve(chiave),
    ),
  );
}

/** Returns `scrypt$N$r$p$<salt>$<hash>` (base64), with the parameters stored for future changes. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const chiave = await deriva(password, salt, PARAMETRI);
  const { N, r, p } = PARAMETRI;
  return ["scrypt", N, r, p, salt.toString("base64"), chiave.toString("base64")].join("$");
}

export async function verificaPassword(password: string, hash: string): Promise<boolean> {
  const [algoritmo, N, r, p, salt, atteso] = hash.split("$");
  if (algoritmo !== "scrypt" || !salt || !atteso) return false;
  const chiaveAttesa = Buffer.from(atteso, "base64");
  const chiave = await deriva(password, Buffer.from(salt, "base64"), {
    N: Number(N),
    r: Number(r),
    p: Number(p),
  });
  return chiave.length === chiaveAttesa.length && timingSafeEqual(chiave, chiaveAttesa);
}

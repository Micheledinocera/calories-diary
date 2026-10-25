import { sessioneSchema, type Sessione } from "@calories-diary/shared";

const GIORNO_MS = 24 * 60 * 60 * 1000;
// Tokens last 7 days: renewing once they are a day old keeps a week of offline margin
// without calling the API every time the app is opened.
const RINNOVA_SOTTO_MS = 6 * GIORNO_MS;

/** Parses the session saved in localStorage; null if missing or not valid. */
export function leggiSessioneSalvata(valore: string | null): Sessione | null {
  if (!valore) return null;
  try {
    const parsed = sessioneSchema.safeParse(JSON.parse(valore));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function daRinnovare(sessione: Sessione, ora = Date.now()): boolean {
  return Date.parse(sessione.scadeIl) - ora < RINNOVA_SOTTO_MS;
}

import { erroreApiSchema, type ErroreApi } from "@calories-diary/shared";

export type ErroreNormalizzato = ErroreApi["errore"] & { status?: number };

/**
 * Turns any $fetch failure into a single shape for the UI:
 * API error body, timeout (cold start of the server) or network error.
 */
export function normalizzaErrore(err: unknown): ErroreNormalizzato {
  const e = err as { name?: string; statusCode?: number; data?: unknown; cause?: unknown };
  const parsed = erroreApiSchema.safeParse(e?.data);
  if (parsed.success) return { ...parsed.data.errore, status: e.statusCode };

  const causa = e?.cause as { name?: string } | undefined;
  if (causa?.name === "TimeoutError" || causa?.name === "AbortError") {
    return { codice: "TIMEOUT", messaggio: "Il server non ha risposto in tempo" };
  }
  if (e?.statusCode) {
    return { codice: "HTTP", messaggio: `Errore HTTP ${e.statusCode}`, status: e.statusCode };
  }
  return { codice: "RETE", messaggio: "Server non raggiungibile" };
}

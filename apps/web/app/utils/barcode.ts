// Food barcodes: the formats on retail labels, the only ones the lookup accepts.
export const FORMATI_BARCODE = ["ean_13", "ean_8", "upc_a", "upc_e"] as const;

/** First read value made only of digits (what the lookup accepts), or null. */
export function codiceLetto(rilevati: { rawValue: string }[]): string | null {
  for (const r of rilevati) {
    const valore = r.rawValue.trim();
    if (/^\d{1,20}$/.test(valore)) return valore;
  }
  return null;
}

/** Message for a getUserMedia failure (DOMException name). */
export function messaggioErroreFotocamera(err: unknown): string {
  const nome = (err as { name?: string } | undefined)?.name;
  switch (nome) {
    case "NotAllowedError":
    case "SecurityError":
      return "Permesso per la fotocamera negato: abilitalo nelle impostazioni del browser.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "Nessuna fotocamera disponibile su questo dispositivo.";
    case "NotReadableError":
      return "La fotocamera è usata da un'altra app.";
    default:
      return "Impossibile avviare la fotocamera.";
  }
}

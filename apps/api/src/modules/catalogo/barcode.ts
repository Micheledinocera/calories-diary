/**
 * Normalizes a barcode like Open Food Facts does, so the same product is never stored twice:
 * leading zeros are dropped, then short codes are padded to 8 digits and mid-length ones to EAN-13
 * (e.g. `0000000000017` → `00000017`, `76809513753` → `0076809513753`).
 */
export function normalizzaBarcode(codice: string): string {
  const senzaZeri = codice.replace(/^0+/, "");
  if (senzaZeri.length <= 7) return senzaZeri.padStart(8, "0");
  if (senzaZeri.length >= 9 && senzaZeri.length <= 12) return senzaZeri.padStart(13, "0");
  return senzaZeri;
}

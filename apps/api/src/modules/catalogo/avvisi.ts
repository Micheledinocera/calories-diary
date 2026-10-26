import type { AvvisoCatalogo, ValoriAlimento, ValoriPer100 } from "@calories-diary/shared";

/** Above this gap between declared and estimated kcal the values are suspicious. */
const SOGLIA_INCOERENZA = 0.2;

/** kcal estimated from the macros: 4 × proteins + 4 × carbohydrates + 9 × fat. */
export const kcalStimate = (proteine: number, carboidrati: number, grassi: number) =>
  4 * proteine + 4 * carboidrati + 9 * grassi;

/** Warnings shown before importing a product: missing values or kcal not matching the macros. */
export function calcolaAvvisi(valori: ValoriPer100): AvvisoCatalogo[] {
  const { kcal, proteine, carboidrati, grassi } = valori;
  const principali = [kcal, proteine, carboidrati, grassi];
  if (Object.values(valori).every((v) => v === null)) return ["SENZA_VALORI"];
  if (principali.some((v) => v === null)) return ["VALORI_PARZIALI"];

  return kcalIncoerenti({
    kcal: kcal!,
    proteine: proteine!,
    carboidrati: carboidrati!,
    grassi: grassi!,
  })
    ? ["KCAL_INCOERENTI"]
    : [];
}

/** Declared kcal more than 20% away from the estimate (with 0 kcal, any positive estimate). */
export function kcalIncoerenti({ kcal, proteine, carboidrati, grassi }: ValoriAlimento): boolean {
  const stimate = kcalStimate(proteine, carboidrati, grassi);
  return kcal === 0 ? stimate > 0 : Math.abs(kcal - stimate) / kcal > SOGLIA_INCOERENZA;
}

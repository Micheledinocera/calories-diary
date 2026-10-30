import type { Valori, VoceSuggerita } from "@calories-diary/shared";
import type { Alimento } from "../alimenti/alimento.entity.js";
import { usoDi } from "../alimenti/uso.js";

export const zero = (): Valori => ({ kcal: 0, proteine: 0, carboidrati: 0, grassi: 0 });

export const somma = (valori: Valori[]): Valori =>
  valori.reduce(
    (tot, v) => ({
      kcal: tot.kcal + v.kcal,
      proteine: tot.proteine + v.proteine,
      carboidrati: tot.carboidrati + v.carboidrati,
      grassi: tot.grassi + v.grassi,
    }),
    zero(),
  );

/** `valore_per_100 × quantità / 100`, from the food's current values. Rounded only when shown. */
export const valoriVoce = (a: Alimento, quantita: number): Valori => ({
  kcal: (a.kcal * quantita) / 100,
  proteine: (a.proteine * quantita) / 100,
  carboidrati: (a.carboidrati * quantita) / 100,
  grassi: (a.grassi * quantita) / 100,
});

/** Archived for `utenteId`, the only one who sees the entry. `a.usi` must be populated. */
export const archiviatoPer = (a: Alimento, utenteId: string) =>
  usoDi(a, utenteId)?.archiviato ?? false;

export const versoDtoVoce = (a: Alimento, quantita: number, utenteId: string): VoceSuggerita => ({
  alimento: {
    id: a.id,
    nome: a.nome,
    marca: a.marca ?? null,
    unitaBase: a.unitaBase,
    archiviato: archiviatoPer(a, utenteId),
  },
  quantita,
  valori: valoriVoce(a, quantita),
});

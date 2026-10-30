import type { Alimento, Valori, VoceSuggerita } from "@calories-diary/shared";

/** An entry of the form: built from a chosen food, before the API has saved it. */
export function voceDaAlimento(alimento: Alimento, quantita: number): VoceSuggerita {
  const per = (v: number) => (v * quantita) / 100;
  const { kcal, proteine, carboidrati, grassi } = alimento.valoriPer100;
  return {
    alimento: {
      id: alimento.id,
      nome: alimento.nome,
      marca: alimento.marca,
      unitaBase: alimento.unitaBase,
      archiviato: alimento.archiviato,
    },
    quantita,
    valori: {
      kcal: per(kcal),
      proteine: per(proteine),
      carboidrati: per(carboidrati),
      grassi: per(grassi),
    },
  };
}

/** The same entry with another quantity: values scale with it. */
export function conQuantita(voce: VoceSuggerita, quantita: number): VoceSuggerita {
  const per = (v: number) => (v * quantita) / voce.quantita;
  const { kcal, proteine, carboidrati, grassi } = voce.valori;
  return {
    ...voce,
    quantita,
    valori: {
      kcal: per(kcal),
      proteine: per(proteine),
      carboidrati: per(carboidrati),
      grassi: per(grassi),
    },
  };
}

export const totaliVoci = (voci: VoceSuggerita[]): Valori =>
  voci.reduce(
    (tot, { valori: v }) => ({
      kcal: tot.kcal + v.kcal,
      proteine: tot.proteine + v.proteine,
      carboidrati: tot.carboidrati + v.carboidrati,
      grassi: tot.grassi + v.grassi,
    }),
    { kcal: 0, proteine: 0, carboidrati: 0, grassi: 0 },
  );

export const numeroAlimenti = (n: number) => (n === 1 ? "1 alimento" : `${n} alimenti`);

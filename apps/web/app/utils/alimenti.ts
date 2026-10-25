import type {
  Alimento,
  NuovoAlimento,
  ProdottoCatalogo,
  ValoriAlimento,
} from "@calories-diary/shared";

/**
 * Form state of a food: like `NuovoAlimento`, but values can be empty while the user types
 * (and are empty when the provider does not give them). The form validates it with the schema.
 */
export type StatoFormAlimento = Omit<NuovoAlimento, "valoriPer100" | "porzioni"> & {
  valoriPer100: { [K in keyof ValoriAlimento]?: number };
  porzioni: { nome: string; quantita?: number; predefinita: boolean }[];
};

export const statoVuoto = (barcode: string | null = null): StatoFormAlimento => ({
  nome: "",
  marca: null,
  barcode,
  unitaBase: "g",
  valoriPer100: {},
  porzioni: [],
  verificato: false,
});

export const statoDaAlimento = (a: Alimento): StatoFormAlimento => ({
  nome: a.nome,
  marca: a.marca,
  barcode: a.barcode,
  unitaBase: a.unitaBase,
  valoriPer100: { ...a.valoriPer100 },
  porzioni: a.porzioni.map(({ nome, quantita, predefinita }) => ({ nome, quantita, predefinita })),
  verificato: a.verificato,
});

/** Preview of a catalog product before saving it: only kcal and macros, the provider portion as default. */
export function statoDaProdotto(p: ProdottoCatalogo): StatoFormAlimento {
  const { kcal, proteine, carboidrati, grassi } = p.valoriPer100;
  const valore = (v: number | null) => v ?? undefined;
  return {
    ...statoVuoto(p.barcode),
    nome: p.nome ?? "",
    marca: p.marca,
    unitaBase: p.unitaBase,
    valoriPer100: {
      kcal: valore(kcal),
      proteine: valore(proteine),
      carboidrati: valore(carboidrati),
      grassi: valore(grassi),
    },
    porzioni: p.porzione
      ? [
          {
            nome: (p.porzione.descrizione ?? "1 porzione").slice(0, 50),
            quantita: p.porzione.quantita,
            predefinita: true,
          },
        ]
      : [],
  };
}

const formatoNumero = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 1 });

/** Rounding only when shown: stored values keep their precision. */
export const formattaValore = (v: number) => formatoNumero.format(v);

export const messaggiAvvisi: Record<string, string> = {
  SENZA_VALORI: "Il prodotto non ha valori nutrizionali: inseriscili dall'etichetta.",
  VALORI_PARZIALI: "Mancano alcuni valori: completali dall'etichetta.",
  KCAL_INCOERENTI: "Le kcal non tornano con i macro: controlla l'etichetta.",
};

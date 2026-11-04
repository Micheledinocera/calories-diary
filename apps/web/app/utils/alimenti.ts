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

/**
 * Preview of a catalog product before saving it: only kcal and macros, the provider portion as
 * default. Marked as verified: the user can still turn it off.
 */
export function statoDaProdotto(p: ProdottoCatalogo): StatoFormAlimento {
  const { kcal, proteine, carboidrati, grassi } = p.valoriPer100;
  const valore = (v: number | null) => v ?? undefined;
  return {
    ...statoVuoto(p.barcode),
    verificato: true,
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

// Default precision is the database's (numeric(10,3)); no grouping, the text is edited by hand.
const formatiDecimali = new Map<number, Intl.NumberFormat>();

export function formattaDecimale(v: number | undefined, decimali = 3) {
  if (v === undefined) return "";
  let formato = formatiDecimali.get(decimali);
  if (!formato) {
    formato = new Intl.NumberFormat("it-IT", {
      maximumFractionDigits: decimali,
      useGrouping: false,
    });
    formatiDecimali.set(decimali, formato);
  }
  return formato.format(v);
}

/** Rounds to `decimali` digits, without the float noise of `0.1 + 0.2`. */
export function arrotonda(v: number, decimali = 3) {
  const fattore = 10 ** decimali;
  return Math.round(v * fattore) / fattore;
}

/**
 * Number typed in a form, with comma or dot as decimal separator (never as thousands separator),
 * rounded to `decimali` digits; `undefined` if it is empty or not a number.
 */
export function leggiDecimale(testo: string, decimali = 3): number | undefined {
  const numero = testo.trim().replace(",", ".");
  if (!/^(\d+\.?\d*|\.\d+)$/.test(numero)) return undefined;
  return arrotonda(Number(numero), decimali);
}

export const messaggiAvvisi: Record<string, string> = {
  SENZA_VALORI: "Il prodotto non ha valori nutrizionali: inseriscili dall'etichetta.",
  VALORI_PARZIALI: "Mancano alcuni valori: completali dall'etichetta.",
  KCAL_INCOERENTI: "Le kcal non tornano con i macro: controlla l'etichetta.",
};

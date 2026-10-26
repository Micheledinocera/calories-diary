import type {
  Obiettivi,
  Pasto,
  RipartizioneMacro,
  TipoPasto,
  Valori,
} from "@calories-diary/shared";

export const nomiPasti: Record<TipoPasto, string> = {
  colazione: "Colazione",
  pranzo: "Pranzo",
  cena: "Cena",
  spuntino: "Spuntino",
};

/** Definite article of each meal name ("ha pesato di più la cena"). */
export const articoloPasto = (tipo: TipoPasto) =>
  ({ colazione: "la", pranzo: "il", cena: "la", spuntino: "lo" })[tipo];

const due = (n: number) => String(n).padStart(2, "0");

/** `YYYY-MM-DD` of a date in local time: "today" is the user's day, not the UTC one. */
export const giornoLocale = (data = new Date()) =>
  `${data.getFullYear()}-${due(data.getMonth() + 1)}-${due(data.getDate())}`;

export function spostaGiorno(giorno: string, giorni: number): string {
  const [a, m, g] = giorno.split("-").map(Number) as [number, number, number];
  return giornoLocale(new Date(a, m - 1, g + giorni));
}

const formatoGiorno = new Intl.DateTimeFormat("it-IT", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function formattaGiorno(giorno: string): string {
  const [a, m, g] = giorno.split("-").map(Number) as [number, number, number];
  return formatoGiorno.format(new Date(a, m - 1, g));
}

export type ChiaveMacro = keyof RipartizioneMacro;

/** The macros in display order, everywhere: carbohydrates, proteins, fats. */
export const macro = [
  { chiave: "carboidrati", etichetta: "Carboidrati", sigla: "C" },
  { chiave: "proteine", etichetta: "Proteine", sigla: "P" },
  { chiave: "grassi", etichetta: "Grassi", sigla: "G" },
] as const satisfies { chiave: ChiaveMacro; etichetta: string; sigla: string }[];

export const kcalPerGrammo: Record<ChiaveMacro, number> = {
  carboidrati: 4,
  proteine: 4,
  grassi: 9,
};

/** kcal from each macro: the base of the split and of the ring's slices. */
const kcalMacro = (valori: Valori) =>
  Object.fromEntries(
    macro.map((m) => [m.chiave, valori[m.chiave] * kcalPerGrammo[m.chiave]]),
  ) as Record<ChiaveMacro, number>;

/**
 * Share of the day's kcal from each macro, in percent (4 kcal/g for carbohydrates and proteins,
 * 9 kcal/g for fats). Null when nothing has been eaten.
 */
export function ripartizioneGiorno(valori: Valori): RipartizioneMacro | null {
  const { carboidrati, grassi, proteine } = kcalMacro(valori);
  const totale = carboidrati + grassi + proteine;
  if (!totale) return null;
  return {
    carboidrati: (carboidrati / totale) * 100,
    grassi: (grassi / totale) * 100,
    proteine: (proteine / totale) * 100,
  };
}

/**
 * Meal ids after moving the item at `da` to `a` (indexes in the list of the day's meals),
 * or null if the move would change the order of colazione, pranzo and cena.
 */
export function nuovoOrdine(pasti: Pasto[], da: number, a: number): string[] | null {
  const lista = [...pasti];
  const [spostato] = lista.splice(da, 1);
  if (!spostato) return null;
  lista.splice(a, 0, spostato);
  const principali = lista.filter((p) => p.tipo !== "spuntino").map((p) => p.tipo);
  const attesi = pasti.filter((p) => p.tipo !== "spuntino").map((p) => p.tipo);
  if (principali.some((t, i) => t !== attesi[i]) || lista.some((p) => !p.id)) return null;
  return lista.map((p) => p.id!);
}

/** Daily target of each macro in grams, from the need and the split. Null without a need. */
export function obiettiviGrammi(obiettivi: Obiettivi): Record<ChiaveMacro, number> | null {
  const { fabbisogno, ripartizione } = obiettivi;
  if (!fabbisogno) return null;
  return Object.fromEntries(
    macro.map((m) => [
      m.chiave,
      (fabbisogno * ripartizione[m.chiave]) / 100 / kcalPerGrammo[m.chiave],
    ]),
  ) as Record<ChiaveMacro, number>;
}

export type StatoGiornata =
  | { tipo: "ok" }
  | { tipo: "attenzione"; sforati: ChiaveMacro[] }
  | { tipo: "oltre"; eccesso: number };

/**
 * How the day went, the same rule in the day and in the calendar: over the need ("oltre"),
 * within it but with at least one macro over its target in grams ("attenzione"), or within
 * ("ok"). Null without a need or with nothing eaten.
 */
export function statoGiornata(totali: Valori, obiettivi: Obiettivi): StatoGiornata | null {
  const grammi = obiettiviGrammi(obiettivi);
  if (!grammi || !obiettivi.fabbisogno || totali.kcal <= 0) return null;
  if (totali.kcal > obiettivi.fabbisogno) {
    return { tipo: "oltre", eccesso: totali.kcal - obiettivi.fabbisogno };
  }
  const sforati = macro.filter((m) => totali[m.chiave] > grammi[m.chiave]).map((m) => m.chiave);
  return sforati.length ? { tipo: "attenzione", sforati } : { tipo: "ok" };
}

/** The meal with the most kcal (the first one in the day on a tie), null if nothing was eaten. */
export function pastoPiuPesante(pasti: Pasto[]): Pasto | null {
  return pasti.reduce<Pasto | null>(
    (max, p) => (p.totali.kcal > (max?.totali.kcal ?? 0) ? p : max),
    null,
  );
}

export interface SpicchioAnello {
  chiave: ChiaveMacro;
  /** Start and length along the ring, as fractions of a full turn. */
  inizio: number;
  lunghezza: number;
}

/**
 * The macro ring: its coloured length is the share of the need already eaten (one full turn at
 * most), split by the kcal of each macro; past the need, `extra` is the excess as a fraction of a
 * turn (shown as a thin outer lap). Without a need the slices fill the whole turn.
 */
export function anelloMacro(
  totali: Valori,
  fabbisogno: number | null,
): { spicchi: SpicchioAnello[]; extra: number } {
  const kcal = kcalMacro(totali);
  const totale = macro.reduce((t, m) => t + kcal[m.chiave], 0);
  if (!totale) return { spicchi: [], extra: 0 };
  const pieno = fabbisogno ? Math.min(totali.kcal / fabbisogno, 1) : 1;
  let inizio = 0;
  const spicchi = macro.map((m) => {
    const lunghezza = (pieno * kcal[m.chiave]) / totale;
    const spicchio = { chiave: m.chiave, inizio, lunghezza };
    inizio += lunghezza;
    return spicchio;
  });
  const extra = fabbisogno ? Math.min(Math.max(totali.kcal - fabbisogno, 0) / fabbisogno, 1) : 0;
  return { spicchi, extra };
}

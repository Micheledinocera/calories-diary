import type { Pasto, RipartizioneMacro, TipoPasto, Valori } from "@calories-diary/shared";

export const nomiPasti: Record<TipoPasto, string> = {
  colazione: "Colazione",
  pranzo: "Pranzo",
  cena: "Cena",
  spuntino: "Spuntino",
};

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

/**
 * Share of the day's kcal from each macro, in percent (4 kcal/g for carbohydrates and proteins,
 * 9 kcal/g for fats). Null when nothing has been eaten.
 */
export function ripartizioneGiorno(valori: Valori): RipartizioneMacro | null {
  const carboidrati = valori.carboidrati * 4;
  const grassi = valori.grassi * 9;
  const proteine = valori.proteine * 4;
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

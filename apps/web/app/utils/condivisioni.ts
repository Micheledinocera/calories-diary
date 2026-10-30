import type { DurataCondivisione, GiornoCondiviso } from "@calories-diary/shared";
import { formattaGiornoBreve } from "./diario";

export const opzioniDurata: { valore: DurataCondivisione; etichetta: string }[] = [
  { valore: "giorno", etichetta: "1 giorno" },
  { valore: "settimana", etichetta: "1 settimana" },
  { valore: "mese", etichetta: "1 mese" },
  { valore: "sempre", etichetta: "Per sempre" },
];

export const linkCondivisione = (token: string) => `${location.origin}/condivisi/${token}`;

/** "2 mar" for a single day, "2 mar – 8 mar" for a range. */
export const periodoCondiviso = (da: string, a: string) =>
  da === a ? formattaGiornoBreve(da) : `${formattaGiornoBreve(da)} – ${formattaGiornoBreve(a)}`;

/** The day a shared page opens on: the first one with something to see. */
export const giornoIniziale = (giorni: GiornoCondiviso[]) =>
  giorni.find((g) => g.pasti.length) ?? giorni[0];

const formatoScadenza = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export const testoScadenza = (scadeIl: string | null) =>
  scadeIl ? `Scade il ${formatoScadenza.format(new Date(scadeIl))}` : "Non scade";

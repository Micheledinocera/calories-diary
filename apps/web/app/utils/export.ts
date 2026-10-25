import type { Giornata, Obiettivi, Valori } from "@calories-diary/shared";
import { formattaValore } from "./alimenti";
import { formattaGiorno, nomiPasti, ripartizioneGiorno } from "./diario";

/** Longest range of days that can be exported at once. */
export const MAX_GIORNI_EXPORT = 7;

const macro = [
  { chiave: "carboidrati", etichetta: "Carboidrati" },
  { chiave: "grassi", etichetta: "Grassi" },
  { chiave: "proteine", etichetta: "Proteine" },
] as const;

const kcal = (v: number) => formattaValore(Math.round(v));
const grammi = (v: number) => `${formattaValore(v)} g`;

/** A food name can contain `|` or markdown characters: they would break the table. */
const testo = (s: string) => s.replace(/([\\|*_`[\]<>])/g, "\\$1");

const riga = (celle: string[]) => `| ${celle.join(" | ")} |`;

const intestazione = [
  riga(["Alimento", "Quantità", "kcal", ...macro.map((m) => m.etichetta)]),
  "| --- | ---: | ---: | ---: | ---: | ---: |",
];

const celleValori = (v: Valori) => [kcal(v.kcal), ...macro.map((m) => grammi(v[m.chiave]))];

/** kcal against the daily need, e.g. "1850 kcal su 2000 (150 in meno)". */
function confrontoKcal(v: Valori, fabbisogno: number | null): string {
  const base = `${kcal(v.kcal)} kcal`;
  if (!fabbisogno) return base;
  const differenza = Math.round(v.kcal - fabbisogno);
  const nota = differenza > 0 ? `${kcal(differenza)} in più` : `${kcal(-differenza)} in meno`;
  return `${base} su ${kcal(fabbisogno)} (${differenza === 0 ? "in linea" : nota})`;
}

/** Grams and share of kcal of each macro against the target split. */
function confrontoMacro(v: Valori, obiettivi: Obiettivi): string {
  const quote = ripartizioneGiorno(v);
  return macro
    .map((m) => {
      const quota = quote ? `${Math.round(quote[m.chiave])}%` : "–";
      return `${m.etichetta} ${grammi(v[m.chiave])} (${quota}, obiettivo ${obiettivi.ripartizione[m.chiave]}%)`;
    })
    .join(" · ");
}

function sezioneGiorno(g: Giornata, obiettivi: Obiettivi): string[] {
  const titolo = formattaGiorno(g.giorno);
  const righe = [`## ${titolo.charAt(0).toUpperCase()}${titolo.slice(1)}`, ""];
  const pasti = g.pasti.filter((p) => p.voci.length);
  if (!pasti.length) return [...righe, "Nessun alimento registrato.", ""];

  righe.push(
    `**Totale: ${confrontoKcal(g.totali, obiettivi.fabbisogno)}**`,
    "",
    confrontoMacro(g.totali, obiettivi),
    "",
  );
  for (const pasto of pasti) {
    righe.push(
      `### ${nomiPasti[pasto.tipo]} — ${kcal(pasto.totali.kcal)} kcal`,
      "",
      ...intestazione,
    );
    for (const voce of pasto.voci) {
      const nome = voce.alimento.marca
        ? `${voce.alimento.nome} (${voce.alimento.marca})`
        : voce.alimento.nome;
      righe.push(
        riga([
          testo(nome),
          `${formattaValore(voce.quantita)} ${voce.alimento.unitaBase}`,
          ...celleValori(voce.valori),
        ]),
      );
    }
    righe.push(riga(["**Totale**", "", ...celleValori(pasto.totali).map((c) => `**${c}**`)]), "");
  }
  return righe;
}

/**
 * Markdown of the given days, to share or convert to PDF: goals, a summary table and, for each
 * day, totals against the goals and the foods of every meal. Days are sorted by date.
 */
export function markdownDiario(giornate: Giornata[], obiettivi: Obiettivi): string {
  const ordinate = [...giornate].sort((a, b) => a.giorno.localeCompare(b.giorno));
  const prima = ordinate[0];
  const ultima = ordinate.at(-1);
  if (!prima || !ultima) return "";

  const periodo =
    prima === ultima
      ? formattaGiorno(prima.giorno)
      : `dal ${formattaGiorno(prima.giorno)} al ${formattaGiorno(ultima.giorno)}`;
  const { carboidrati, grassi, proteine } = obiettivi.ripartizione;

  const righe = [
    "# Diario alimentare",
    "",
    `Periodo: ${periodo}`,
    "",
    `**Obiettivi**: fabbisogno ${obiettivi.fabbisogno ? `${kcal(obiettivi.fabbisogno)} kcal` : "non impostato"} · ripartizione carboidrati ${carboidrati}%, grassi ${grassi}%, proteine ${proteine}%`,
    "",
  ];

  if (ordinate.length > 1) {
    righe.push(
      "## Riepilogo",
      "",
      riga(["Giorno", "kcal", ...macro.map((m) => m.etichetta)]),
      "| --- | ---: | ---: | ---: | ---: |",
      ...ordinate.map((g) => riga([formattaGiorno(g.giorno), ...celleValori(g.totali)])),
      "",
    );
  }

  for (const g of ordinate) righe.push(...sezioneGiorno(g, obiettivi));
  return `${righe.join("\n").trimEnd()}\n`;
}

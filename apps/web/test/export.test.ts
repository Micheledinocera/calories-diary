import type { Giornata, Obiettivi } from "@calories-diary/shared";
import { describe, expect, it } from "vitest";
import { markdownDiario } from "../app/utils/export";

const zero = { kcal: 0, proteine: 0, carboidrati: 0, grassi: 0 };

const obiettivi: Obiettivi = {
  fabbisogno: 2000,
  ripartizione: { carboidrati: 50, grassi: 30, proteine: 20 },
};

const giornata = (giorno: string, kcal = 0): Giornata => {
  const valori = { kcal, carboidrati: 10, grassi: 2, proteine: 5.25 };
  return {
    giorno,
    totali: kcal ? valori : zero,
    pasti: [
      {
        id: kcal ? "00000000-0000-4000-8000-000000000001" : null,
        tipo: "colazione",
        totali: kcal ? valori : zero,
        suggerite: [],
        voci: kcal
          ? [
              {
                id: "00000000-0000-4000-8000-000000000002",
                alimento: {
                  id: "00000000-0000-4000-8000-000000000003",
                  nome: "Yogurt | greco",
                  marca: "Fage",
                  unitaBase: "g",
                  archiviato: false,
                },
                quantita: 150,
                valori,
              },
            ]
          : [],
      },
      { id: null, tipo: "pranzo", totali: zero, suggerite: [], voci: [] },
    ],
  };
};

describe("markdownDiario", () => {
  it("riporta obiettivi, totali del giorno e voci dei pasti", () => {
    const md = markdownDiario([giornata("2026-10-19", 1850)], obiettivi);
    expect(md).toContain("**Obiettivi**: fabbisogno 2000 kcal");
    expect(md).toContain("## Lunedì 19 ottobre 2026");
    expect(md).toContain("**Totale: 1850 kcal su 2000 (150 in meno)**");
    expect(md).toContain("Carboidrati 10 g (");
    expect(md).toContain("obiettivo 50%");
    expect(md).toContain("### Colazione — 1850 kcal");
    // The pipe in the name is escaped, decimals use the comma.
    expect(md).toContain("| Yogurt \\| greco (Fage) | 150 g | 1850 | 10 g | 2 g | 5,3 g |");
    // Empty meals are left out.
    expect(md).not.toContain("### Pranzo");
    // No summary table for a single day.
    expect(md).not.toContain("## Riepilogo");
  });

  it("ordina i giorni, aggiunge il riepilogo e segnala i giorni vuoti", () => {
    const md = markdownDiario([giornata("2026-10-20"), giornata("2026-10-19", 2100)], {
      ...obiettivi,
      fabbisogno: null,
    });
    expect(md).toContain("Periodo: dal lunedì 19 ottobre 2026 al martedì 20 ottobre 2026");
    expect(md).toContain("fabbisogno non impostato");
    expect(md).toContain("## Riepilogo");
    expect(md.indexOf("## Lunedì")).toBeLessThan(md.indexOf("## Martedì"));
    expect(md).toContain("**Totale: 2100 kcal**");
    expect(md).toContain("## Martedì 20 ottobre 2026\n\nNessun alimento registrato.");
  });

  it("restituisce una stringa vuota senza giorni", () => {
    expect(markdownDiario([], obiettivi)).toBe("");
  });
});

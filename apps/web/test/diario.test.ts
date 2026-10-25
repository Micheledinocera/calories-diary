import type { Pasto } from "@calories-diary/shared";
import { describe, expect, it } from "vitest";
import { nuovoOrdine, ripartizioneGiorno, spostaGiorno } from "../app/utils/diario";

const pasto = (id: string, tipo: Pasto["tipo"]): Pasto => ({
  id,
  tipo,
  voci: [],
  totali: { kcal: 0, proteine: 0, carboidrati: 0, grassi: 0 },
  suggerite: [],
});

describe("spostaGiorno", () => {
  it("passa al mese e all'anno successivi o precedenti", () => {
    expect(spostaGiorno("2026-10-31", 1)).toBe("2026-11-01");
    expect(spostaGiorno("2026-01-01", -1)).toBe("2025-12-31");
    // Day of the switch to daylight saving time in Italy.
    expect(spostaGiorno("2026-03-29", 1)).toBe("2026-03-30");
  });
});

describe("ripartizioneGiorno", () => {
  it("calcola la quota di kcal di ogni macro", () => {
    // 100 g carbohydrates (400 kcal), 20 g fats (180), 30 g proteins (120): 700 kcal.
    const r = ripartizioneGiorno({ kcal: 700, carboidrati: 100, grassi: 20, proteine: 30 })!;
    expect(r.carboidrati).toBeCloseTo(57.14, 1);
    expect(r.grassi).toBeCloseTo(25.71, 1);
    expect(r.proteine).toBeCloseTo(17.14, 1);
  });

  it("restituisce null senza niente mangiato", () => {
    expect(ripartizioneGiorno({ kcal: 0, carboidrati: 0, grassi: 0, proteine: 0 })).toBeNull();
  });
});

describe("nuovoOrdine", () => {
  const pasti = [
    pasto("c", "colazione"),
    pasto("p", "pranzo"),
    pasto("n", "cena"),
    pasto("s", "spuntino"),
  ];

  it("sposta uno spuntino tra i pasti principali", () => {
    expect(nuovoOrdine(pasti, 3, 1)).toEqual(["c", "s", "p", "n"]);
  });

  it("rifiuta uno spostamento che cambia l'ordine dei pasti principali", () => {
    expect(nuovoOrdine(pasti, 0, 2)).toBeNull();
  });

  it("rifiuta se un pasto non è ancora salvato", () => {
    expect(nuovoOrdine([{ ...pasti[0]!, id: null }, ...pasti.slice(1)], 3, 0)).toBeNull();
  });
});

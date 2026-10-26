import type { Pasto } from "@calories-diary/shared";
import { describe, expect, it } from "vitest";
import {
  anelloMacro,
  nuovoOrdine,
  obiettiviGrammi,
  pastoPiuPesante,
  ripartizioneGiorno,
  spostaGiorno,
  statoGiornata,
} from "../app/utils/diario";

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

const obiettivi = {
  fabbisogno: 2000,
  ripartizione: { carboidrati: 50, grassi: 30, proteine: 20 },
};
const valori = (carboidrati: number, proteine: number, grassi: number) => ({
  kcal: carboidrati * 4 + proteine * 4 + grassi * 9,
  carboidrati,
  proteine,
  grassi,
});

describe("obiettiviGrammi", () => {
  it("ricava i grammi dal fabbisogno e dalla ripartizione", () => {
    const g = obiettiviGrammi(obiettivi)!;
    expect(g.carboidrati).toBe(250);
    expect(g.proteine).toBe(100);
    expect(g.grassi).toBeCloseTo(66.67, 1);
  });

  it("restituisce null senza fabbisogno", () => {
    expect(obiettiviGrammi({ ...obiettivi, fabbisogno: null })).toBeNull();
  });
});

describe("statoGiornata", () => {
  it("è ok con kcal e macro entro gli obiettivi", () => {
    expect(statoGiornata(valori(170, 82, 48), obiettivi)).toEqual({ tipo: "ok" });
  });

  it("è attenzione con kcal entro ma un macro oltre, e dice quali", () => {
    expect(statoGiornata(valori(150, 95, 82), obiettivi)).toEqual({
      tipo: "attenzione",
      sforati: ["grassi"],
    });
  });

  it("è oltre con le kcal sopra il fabbisogno, anche se i macro sono oltre", () => {
    expect(statoGiornata(valori(290, 110, 88), obiettivi)).toEqual({ tipo: "oltre", eccesso: 392 });
  });

  it("non c'è senza fabbisogno o senza niente mangiato", () => {
    expect(statoGiornata(valori(100, 50, 20), { ...obiettivi, fabbisogno: null })).toBeNull();
    expect(statoGiornata(valori(0, 0, 0), obiettivi)).toBeNull();
  });
});

describe("pastoPiuPesante", () => {
  const conKcal = (id: string, tipo: Pasto["tipo"], kcal: number): Pasto => ({
    ...pasto(id, tipo),
    totali: { kcal, proteine: 0, carboidrati: 0, grassi: 0 },
  });

  it("sceglie il pasto con più kcal, il primo a parità", () => {
    const pasti = [
      conKcal("c", "colazione", 400),
      conKcal("p", "pranzo", 900),
      conKcal("n", "cena", 900),
    ];
    expect(pastoPiuPesante(pasti)?.id).toBe("p");
  });

  it("restituisce null se non si è mangiato niente", () => {
    expect(pastoPiuPesante([pasto("c", "colazione")])).toBeNull();
  });
});

describe("anelloMacro", () => {
  it("riempie la quota di fabbisogno mangiata, divisa per kcal dei macro", () => {
    // 100 g C (400 kcal), 50 g P (200), 0 g G: 600 kcal su 2000.
    const { spicchi, extra } = anelloMacro(valori(100, 50, 0), 2000);
    expect(spicchi.map((s) => s.chiave)).toEqual(["carboidrati", "proteine", "grassi"]);
    expect(spicchi[0]!.lunghezza).toBeCloseTo(0.2);
    expect(spicchi[1]!.inizio).toBeCloseTo(0.2);
    expect(spicchi[1]!.lunghezza).toBeCloseTo(0.1);
    expect(extra).toBe(0);
  });

  it("oltre il fabbisogno è pieno e l'eccesso va nel giro esterno", () => {
    const { spicchi, extra } = anelloMacro(valori(500, 0, 0), 1000);
    expect(spicchi.reduce((t, s) => t + s.lunghezza, 0)).toBeCloseTo(1);
    expect(extra).toBe(1);
  });

  it("senza fabbisogno occupa il giro intero", () => {
    const { spicchi } = anelloMacro(valori(50, 50, 0), null);
    expect(spicchi.reduce((t, s) => t + s.lunghezza, 0)).toBeCloseTo(1);
  });
});

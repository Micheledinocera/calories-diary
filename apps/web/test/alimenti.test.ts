import type { ProdottoCatalogo } from "@calories-diary/shared";
import { describe, expect, it } from "vitest";
import { formattaValore, statoDaProdotto } from "../app/utils/alimenti";

const prodotto: ProdottoCatalogo = {
  barcode: "8076809513753",
  fonte: "off",
  nome: "Pesto alla genovese",
  marca: "Barilla",
  unitaBase: "g",
  valoriPer100: {
    kcal: 492,
    proteine: 4.7,
    carboidrati: 11,
    grassi: null,
    zuccheri: 5,
    grassiSaturi: 5.3,
    fibre: null,
    sale: 3.2,
  },
  porzione: { descrizione: "47.5 g", quantita: 47.5 },
  immagineUrl: null,
  aggiornatoIl: "2026-10-25T14:00:00.000Z",
};

describe("statoDaProdotto", () => {
  it("tiene solo kcal e macro, lasciando vuoti i valori mancanti", () => {
    expect(statoDaProdotto(prodotto)).toEqual({
      nome: "Pesto alla genovese",
      marca: "Barilla",
      barcode: "8076809513753",
      unitaBase: "g",
      valoriPer100: { kcal: 492, proteine: 4.7, carboidrati: 11, grassi: undefined },
      porzioni: [{ nome: "47.5 g", quantita: 47.5, predefinita: true }],
      verificato: false,
    });
  });

  it("senza nome e porzione lascia il form da completare", () => {
    const stato = statoDaProdotto({ ...prodotto, nome: null, porzione: null });
    expect(stato.nome).toBe("");
    expect(stato.porzioni).toEqual([]);
  });
});

describe("formattaValore", () => {
  it("arrotonda a un decimale con la virgola", () => {
    expect(formattaValore(4.75)).toBe("4,8");
    expect(formattaValore(492)).toBe("492");
  });
});

import { describe, expect, it } from "vitest";
import { filtriAlimentiSchema, nuovoAlimentoSchema } from "../src/alimenti.js";

const valoriPer100 = { kcal: 97, proteine: 9, carboidrati: 4, grassi: 5 };

describe("nuovoAlimentoSchema", () => {
  it("applica i predefiniti e normalizza i testi vuoti", () => {
    expect(nuovoAlimentoSchema.parse({ nome: " Yogurt ", marca: " ", valoriPer100 })).toEqual({
      nome: "Yogurt",
      marca: null,
      barcode: null,
      unitaBase: "g",
      valoriPer100,
      porzioni: [],
      verificato: false,
    });
  });

  it("rifiuta più porzioni predefinite o con lo stesso nome", () => {
    const porzione = { nome: "1 vasetto", quantita: 125, predefinita: true };
    for (const porzioni of [
      [porzione, { ...porzione, nome: "2 vasetti" }],
      [porzione, { ...porzione, nome: "1 VASETTO", predefinita: false }],
    ]) {
      expect(nuovoAlimentoSchema.safeParse({ nome: "Y", valoriPer100, porzioni }).success).toBe(
        false,
      );
    }
  });

  it("richiede kcal e macro", () => {
    const { grassi: _, ...senzaGrassi } = valoriPer100;
    expect(nuovoAlimentoSchema.safeParse({ nome: "Y", valoriPer100: senzaGrassi }).success).toBe(
      false,
    );
  });
});

describe("filtriAlimentiSchema", () => {
  it("legge la query string", () => {
    expect(filtriAlimentiSchema.parse({ archiviati: "true", limite: "5" })).toEqual({
      ordine: "uso",
      archiviati: true,
      limite: 5,
    });
  });
});

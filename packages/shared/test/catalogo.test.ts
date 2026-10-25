import { describe, expect, it } from "vitest";
import { lookupBarcodeSchema } from "../src/catalogo.js";

const lookup = {
  prodotto: {
    barcode: "5449000000996",
    fonte: "off",
    nome: "Coca-Cola",
    marca: null,
    unitaBase: "ml",
    valoriPer100: {
      kcal: 42.4,
      proteine: 0,
      carboidrati: 10.6,
      grassi: 0,
      zuccheri: 10.6,
      grassiSaturi: 0,
      fibre: null,
      sale: 0,
    },
    porzione: { descrizione: "1 portion (330 ml)", quantita: 330 },
    immagineUrl: null,
    aggiornatoIl: "2026-10-25T14:00:00.000Z",
  },
  origine: "provider",
  avvisi: [],
};

describe("lookupBarcodeSchema", () => {
  it("accetta un lookup valido, con valori mancanti", () => {
    expect(lookupBarcodeSchema.parse(lookup)).toEqual(lookup);
  });

  it("rifiuta valori negativi e avvisi sconosciuti", () => {
    const negativo = {
      ...lookup,
      prodotto: { ...lookup.prodotto, valoriPer100: { ...lookup.prodotto.valoriPer100, kcal: -1 } },
    };
    expect(lookupBarcodeSchema.safeParse(negativo).success).toBe(false);
    expect(lookupBarcodeSchema.safeParse({ ...lookup, avvisi: ["ALTRO"] }).success).toBe(false);
  });
});

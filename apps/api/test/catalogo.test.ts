import { describe, expect, it } from "vitest";
import { calcolaAvvisi } from "../src/modules/catalogo/avvisi.js";
import { normalizzaBarcode } from "../src/modules/catalogo/barcode.js";
import { daProdottoOff, type ProdottoOff } from "../src/modules/catalogo/open-food-facts.js";

const nessunValore = {
  kcal: null,
  proteine: null,
  carboidrati: null,
  grassi: null,
  zuccheri: null,
  grassiSaturi: null,
  fibre: null,
  sale: null,
};

describe("normalizzaBarcode", () => {
  it("normalizza come Open Food Facts", () => {
    expect(normalizzaBarcode("0000000000017")).toBe("00000017");
    expect(normalizzaBarcode("12345")).toBe("00012345");
    expect(normalizzaBarcode("000000000012345")).toBe("00012345");
    expect(normalizzaBarcode("049000028911")).toBe("0049000028911");
    expect(normalizzaBarcode("3017620422003")).toBe("3017620422003");
    expect(normalizzaBarcode("12345678")).toBe("12345678");
  });
});

describe("calcolaAvvisi", () => {
  const pesto = { ...nessunValore, kcal: 492, proteine: 4.7, carboidrati: 11, grassi: 47 };

  it("nessun avviso se le kcal tornano con i macro", () => {
    expect(calcolaAvvisi(pesto)).toEqual([]);
  });

  it("segnala valori assenti o parziali", () => {
    expect(calcolaAvvisi(nessunValore)).toEqual(["SENZA_VALORI"]);
    expect(calcolaAvvisi({ ...nessunValore, kcal: 100, sale: 1 })).toEqual(["VALORI_PARZIALI"]);
  });

  it("segnala le kcal incoerenti oltre il 20%", () => {
    // Estimated: 4 × 4.7 + 4 × 11 + 9 × 47 = 485.8
    expect(calcolaAvvisi({ ...pesto, kcal: 600 })).toEqual([]);
    expect(calcolaAvvisi({ ...pesto, kcal: 620 })).toEqual(["KCAL_INCOERENTI"]);
    expect(calcolaAvvisi({ ...pesto, kcal: 380 })).toEqual(["KCAL_INCOERENTI"]);
    expect(calcolaAvvisi({ ...pesto, kcal: 0 })).toEqual(["KCAL_INCOERENTI"]);
  });
});

describe("daProdottoOff", () => {
  // Trimmed from a real v3.6 response.
  const pestoOff: ProdottoOff = {
    code: "8076809513753",
    product_name: "Barilla PESTO alla GENOVESE",
    product_name_it: "Pesto alla genovese",
    brands: "Barilla, Barilla G. e R. Fratelli",
    serving_size: "47.5 g",
    serving_quantity: 47.5,
    serving_quantity_unit: "g",
    product_quantity_unit: "g",
    image_small_url:
      "https://images.openfoodfacts.org/images/products/807/680/951/3753/front.200.jpg",
    nutrition: {
      aggregated_set: {
        per: "100g",
        preparation: "as_sold",
        nutrients: {
          "energy-kcal": { source: "manufacturer", unit: "kcal", value: 492 },
          proteins: { source: "manufacturer", unit: "g", value: 4.7 },
          carbohydrates: { source: "manufacturer", unit: "g", value: 11 },
          fat: { source: "manufacturer", unit: "g", value: 47 },
          sugars: { source: "manufacturer", unit: "g", value: 5 },
          "saturated-fat": { source: "manufacturer", unit: "g", value: 5.3 },
          fiber: { source: "estimate", unit: "g", value: 3 },
          salt: { source: "packaging", unit: "mg", value: 3200 },
        },
      },
    },
  };

  it("normalizza il prodotto, ignorando i valori stimati", () => {
    expect(daProdottoOff("8076809513753", pestoOff)).toEqual({
      barcode: "8076809513753",
      fonte: "off",
      idFonte: "8076809513753",
      nome: "Pesto alla genovese",
      marca: "Barilla",
      unitaBase: "g",
      valoriPer100: {
        kcal: 492,
        proteine: 4.7,
        carboidrati: 11,
        grassi: 47,
        zuccheri: 5,
        grassiSaturi: 5.3,
        fibre: null,
        sale: 3.2,
      },
      porzione: { descrizione: "47.5 g", quantita: 47.5 },
      immagineUrl: pestoOff.image_small_url,
    });
  });

  it("riconosce i liquidi e ricava le kcal dai kJ", () => {
    const prodotto = daProdottoOff("5449000000996", {
      code: "5449000000996",
      product_name: "Coca-Cola Original",
      product_quantity_unit: "ml",
      nutrition: {
        aggregated_set: {
          preparation: "as_sold",
          nutrients: { "energy-kj": { source: "packaging", unit: "kJ", value: 180 } },
        },
      },
    });
    expect(prodotto.unitaBase).toBe("ml");
    expect(prodotto.valoriPer100.kcal).toBe(43);
    expect(prodotto.porzione).toBeNull();
  });

  it("gestisce un prodotto quasi vuoto", () => {
    const prodotto = daProdottoOff("00000017", { brands: " ", image_small_url: "non-un-url" });
    expect(prodotto).toMatchObject({
      barcode: "00000017",
      nome: null,
      marca: null,
      unitaBase: "g",
      valoriPer100: nessunValore,
      porzione: null,
      immagineUrl: null,
    });
  });
});

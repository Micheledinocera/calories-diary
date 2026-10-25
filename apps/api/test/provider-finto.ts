import {
  providerNonDisponibile,
  type ProdottoProvider,
  type ProviderAlimenti,
} from "../src/modules/catalogo/provider.js";

/** Barcodes known by the fake provider. */
export const prodottiFinti: Record<string, ProdottoProvider> = {
  "8076809513753": {
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
      fibre: 3,
      sale: 3.2,
    },
    porzione: { descrizione: "47.5 g", quantita: 47.5 },
    immagineUrl: null,
  },
  "00012345": {
    barcode: "00012345",
    fonte: "off",
    idFonte: "00012345",
    nome: null,
    marca: null,
    unitaBase: "ml",
    valoriPer100: {
      kcal: 42,
      proteine: null,
      carboidrati: 10.6,
      grassi: null,
      zuccheri: null,
      grassiSaturi: null,
      fibre: null,
      sale: null,
    },
    porzione: null,
    immagineUrl: null,
  },
};

/** In-memory provider: counts the calls; `guasto` simulates a provider that cannot be reached. */
export function creaProviderFinto() {
  const stato = { chiamate: [] as string[], guasto: false };
  const provider: ProviderAlimenti = {
    async cercaBarcode(barcode) {
      stato.chiamate.push(barcode);
      if (stato.guasto) throw providerNonDisponibile();
      return prodottiFinti[barcode] ?? null;
    },
  };
  return { provider, stato };
}

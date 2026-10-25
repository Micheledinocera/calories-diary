import type { UnitaBase, ValoriPer100 } from "@calories-diary/shared";
import type { Logger } from "pino";
import { normalizzaBarcode } from "./barcode.js";
import {
  providerNonDisponibile,
  providerOccupato,
  type ProdottoProvider,
  type ProviderAlimenti,
} from "./provider.js";

// v3.6: values in `nutrition.aggregated_set` (the old `nutriments` comes back empty).
const VERSIONE_API = "v3.6";
const CAMPI = [
  "code",
  "product_name",
  "product_name_it",
  "brands",
  "nutrition",
  "serving_size",
  "serving_quantity",
  "serving_quantity_unit",
  "product_quantity_unit",
  "image_small_url",
].join(",");
const TIMEOUT_MS = 5_000;

interface Nutriente {
  value?: number;
  unit?: string;
  source?: string;
}

/** The fields we ask for (`CAMPI`); everything is optional, OFF data is crowdsourced. */
export interface ProdottoOff {
  code?: string;
  product_name?: string;
  product_name_it?: string;
  brands?: string;
  nutrition?: {
    aggregated_set?: { per?: string; preparation?: string; nutrients?: Record<string, Nutriente> };
  };
  serving_size?: string;
  serving_quantity?: number | string;
  serving_quantity_unit?: string;
  product_quantity_unit?: string;
  image_small_url?: string;
}

const NUTRIENTI: Record<Exclude<keyof ValoriPer100, "kcal">, string> = {
  proteine: "proteins",
  carboidrati: "carbohydrates",
  grassi: "fat",
  zuccheri: "sugars",
  grassiSaturi: "saturated-fat",
  fibre: "fiber",
  sale: "salt",
};

/** Trimmed text, cut to the column length (OFF data is crowdsourced, any length). */
const testo = (v: string | undefined, max = 255) => v?.trim().slice(0, max).trim() || null;

/** Only a complete https URL that fits the column, otherwise no image. */
function urlValido(v: string | undefined) {
  const url = v?.trim();
  return url && url.length <= 500 && URL.canParse(url) && url.startsWith("https://") ? url : null;
}

/** Value in grams (or kcal), ignoring OFF estimates: only label or manufacturer data. */
function valoreDichiarato(n: Nutriente | undefined, unitaAttesa: "g" | "kcal" | "kJ") {
  if (!n || n.source === "estimate" || typeof n.value !== "number") return null;
  if (!Number.isFinite(n.value) || n.value < 0) return null;
  if (n.unit === unitaAttesa) return n.value;
  if (unitaAttesa === "g" && n.unit === "mg") return n.value / 1000;
  return null;
}

function valoriPer100(prodotto: ProdottoOff): ValoriPer100 {
  const set = prodotto.nutrition?.aggregated_set;
  const nutrienti = set?.preparation === "as_sold" ? (set.nutrients ?? {}) : {};
  const kj = valoreDichiarato(nutrienti["energy-kj"], "kJ");
  const kcal =
    valoreDichiarato(nutrienti["energy-kcal"], "kcal") ??
    (kj === null ? null : Math.round((kj / 4.184) * 10) / 10);
  const valori = { kcal } as ValoriPer100;
  for (const [nostro, off] of Object.entries(NUTRIENTI)) {
    valori[nostro as keyof typeof NUTRIENTI] = valoreDichiarato(nutrienti[off], "g");
  }
  return valori;
}

function unitaBase(prodotto: ProdottoOff): UnitaBase {
  const unita = [prodotto.product_quantity_unit, prodotto.serving_quantity_unit];
  return unita.some((u) => u?.toLowerCase() === "ml") ? "ml" : "g";
}

/** Maps an OFF v3.6 product to our normalized shape. */
export function daProdottoOff(barcode: string, prodotto: ProdottoOff): ProdottoProvider {
  const quantita = Number(prodotto.serving_quantity);
  return {
    barcode: normalizzaBarcode(prodotto.code ?? barcode),
    fonte: "off",
    idFonte: prodotto.code ?? barcode,
    nome: testo(prodotto.product_name_it) ?? testo(prodotto.product_name),
    // OFF lists the brand and its owners ("Nutella, Ferrero"): the first one is enough.
    marca: testo(prodotto.brands?.split(",")[0]),
    unitaBase: unitaBase(prodotto),
    valoriPer100: valoriPer100(prodotto),
    porzione:
      Number.isFinite(quantita) && quantita > 0
        ? { descrizione: testo(prodotto.serving_size, 100), quantita }
        : null,
    immagineUrl: urlValido(prodotto.image_small_url),
  };
}

export interface OpzioniOpenFoodFacts {
  baseUrl: string;
  /** "AppName/version (contact email)", required by OFF. */
  userAgent: string;
  logger: Logger;
}

/** Open Food Facts adapter: barcode lookup with the v3.6 API. */
export function creaOpenFoodFacts({
  baseUrl,
  userAgent,
  logger,
}: OpzioniOpenFoodFacts): ProviderAlimenti {
  return {
    async cercaBarcode(barcode) {
      const url = new URL(`/api/${VERSIONE_API}/product/${barcode}`, baseUrl);
      url.searchParams.set("fields", CAMPI);
      let risposta: Response;
      try {
        risposta = await fetch(url, {
          headers: { "User-Agent": userAgent, Accept: "application/json" },
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
      } catch (err) {
        logger.warn({ err, barcode }, "open food facts non raggiungibile");
        throw providerNonDisponibile();
      }

      if (risposta.status === 404) return null;
      if (risposta.status === 429) throw providerOccupato(60);
      if (!risposta.ok) {
        logger.warn({ status: risposta.status, barcode }, "open food facts ha risposto con errore");
        throw providerNonDisponibile();
      }
      const corpo = (await risposta.json()) as { product?: ProdottoOff };
      if (!corpo.product) return null;
      return daProdottoOff(barcode, corpo.product);
    },
  };
}

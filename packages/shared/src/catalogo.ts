import { z } from "zod";

const valore = z.number().nonnegative().nullable();

/** Nutritional values per 100 g (or 100 ml): null when the source does not provide them. */
export const valoriPer100Schema = z.object({
  kcal: valore,
  proteine: valore,
  carboidrati: valore,
  grassi: valore,
  zuccheri: valore,
  grassiSaturi: valore,
  fibre: valore,
  sale: valore,
});

export type ValoriPer100 = z.infer<typeof valoriPer100Schema>;

export const unitaBaseSchema = z.enum(["g", "ml"]);

export type UnitaBase = z.infer<typeof unitaBaseSchema>;

/** Shared catalog product: our normalized copy of a provider product. */
export const prodottoCatalogoSchema = z.object({
  barcode: z.string().regex(/^\d+$/),
  fonte: z.enum(["off"]),
  nome: z.string().nullable(),
  marca: z.string().nullable(),
  unitaBase: unitaBaseSchema,
  valoriPer100: valoriPer100Schema,
  porzione: z
    .object({ descrizione: z.string().nullable(), quantita: z.number().positive() })
    .nullable(),
  immagineUrl: z.url().nullable(),
  aggiornatoIl: z.iso.datetime(),
});

export type ProdottoCatalogo = z.infer<typeof prodottoCatalogoSchema>;

export const avvisoCatalogoSchema = z.enum(["SENZA_VALORI", "VALORI_PARZIALI", "KCAL_INCOERENTI"]);

export type AvvisoCatalogo = z.infer<typeof avvisoCatalogoSchema>;

/** Response of `GET /catalogo/barcode/:codice`. */
export const lookupBarcodeSchema = z.object({
  prodotto: prodottoCatalogoSchema,
  origine: z.enum(["catalogo", "provider"]),
  avvisi: z.array(avvisoCatalogoSchema),
});

export type LookupBarcode = z.infer<typeof lookupBarcodeSchema>;

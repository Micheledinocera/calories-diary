import { z } from "zod";
import { avvisoCatalogoSchema, unitaBaseSchema } from "./catalogo.js";

const valore = z.number().nonnegative().max(10_000);

/** Values tracked for the user's foods (MVP): kcal and the three macros, per 100 g or 100 ml. */
export const valoriAlimentoSchema = z.object({
  kcal: valore,
  proteine: valore,
  carboidrati: valore,
  grassi: valore,
});

export type ValoriAlimento = z.infer<typeof valoriAlimentoSchema>;

export const fonteAlimentoSchema = z.enum(["manuale", "off"]);

export type FonteAlimento = z.infer<typeof fonteAlimentoSchema>;

/** A named portion of a food (e.g. "1 vasetto" = 125), in the food's base unit (g or ml). */
export const porzioneSchema = z.object({
  id: z.uuid(),
  nome: z.string().min(1),
  quantita: z.number().positive(),
  predefinita: z.boolean(),
});

export type Porzione = z.infer<typeof porzioneSchema>;

/** The user's own copy of a food: corrected and used in the diary. */
export const alimentoSchema = z.object({
  id: z.uuid(),
  nome: z.string().min(1),
  marca: z.string().nullable(),
  barcode: z.string().regex(/^\d+$/).nullable(),
  fonte: fonteAlimentoSchema,
  unitaBase: unitaBaseSchema,
  valoriPer100: valoriAlimentoSchema,
  porzioni: z.array(porzioneSchema),
  verificato: z.boolean(),
  archiviato: z.boolean(),
  ultimoUso: z.iso.datetime().nullable(),
  utilizzi: z.int().nonnegative(),
  /** Only KCAL_INCOERENTI can apply: the four values are always present. */
  avvisi: z.array(avvisoCatalogoSchema),
  importatoIl: z.iso.datetime().nullable(),
  aggiornatoIl: z.iso.datetime(),
});

export type Alimento = z.infer<typeof alimentoSchema>;

export const listaAlimentiSchema = z.array(alimentoSchema);

const nuovaPorzioneSchema = z.object({
  nome: z.string().trim().min(1).max(50),
  quantita: z.number().positive().max(100_000),
  predefinita: z.boolean().default(false),
});

const porzioniSchema = z
  .array(nuovaPorzioneSchema)
  .max(20)
  .refine((porzioni) => porzioni.filter((p) => p.predefinita).length <= 1, {
    message: "al massimo una porzione predefinita",
  })
  .refine(
    (porzioni) => new Set(porzioni.map((p) => p.nome.toLowerCase())).size === porzioni.length,
    { message: "nomi delle porzioni duplicati" },
  );

const testoFacoltativo = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((t) => t || null);

/**
 * Body of `POST /alimenti`. With a barcode already in the catalog, the food is linked to that
 * product (fonte "off"); otherwise it is a manual food.
 */
export const nuovoAlimentoSchema = z.object({
  nome: z.string().trim().min(1).max(255),
  marca: testoFacoltativo(255),
  barcode: z
    .string()
    .regex(/^\d{1,20}$/, "solo cifre")
    .nullish()
    .transform((b) => b ?? null),
  unitaBase: unitaBaseSchema.default("g"),
  valoriPer100: valoriAlimentoSchema,
  porzioni: porzioniSchema.default([]),
  verificato: z.boolean().default(false),
});

export type NuovoAlimento = z.input<typeof nuovoAlimentoSchema>;

/** Body of `PATCH /alimenti/:id`: every field is optional; `porzioni` replaces the whole list. */
export const modificaAlimentoSchema = z
  .object({
    nome: z.string().trim().min(1).max(255),
    marca: testoFacoltativo(255),
    unitaBase: unitaBaseSchema,
    valoriPer100: valoriAlimentoSchema,
    porzioni: porzioniSchema,
    verificato: z.boolean(),
    archiviato: z.boolean(),
  })
  .partial();

export type ModificaAlimento = z.input<typeof modificaAlimentoSchema>;

/** Orders of `GET /alimenti`: by use (frequency, then recency), most recent, by name. */
export const ordineAlimentiSchema = z.enum(["uso", "recenti", "nome"]);

export type OrdineAlimenti = z.infer<typeof ordineAlimentiSchema>;

/** Query of `GET /alimenti`. */
export const filtriAlimentiSchema = z.object({
  q: z.string().trim().max(100).optional(),
  ordine: ordineAlimentiSchema.default("uso"),
  archiviati: z.stringbool().default(false),
  limite: z.coerce.number().int().min(1).max(200).default(100),
});

export type FiltriAlimenti = z.input<typeof filtriAlimentiSchema>;

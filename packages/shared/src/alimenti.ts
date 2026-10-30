import { z } from "zod";
import { avvisoCatalogoSchema, unitaBaseSchema } from "./catalogo.js";
import { paginaSchema, paginazioneSchema } from "./paginazione.js";

const valore = z
  .number("Inserisci un numero")
  .nonnegative("Il valore non può essere negativo")
  .max(10_000, "Massimo 10000");

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

/**
 * A food of the shared pool: every user sees it, uses it and can correct it. `archiviato`,
 * `ultimoUso` and `utilizzi` are the current user's.
 */
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
  /** Only its author can delete a food, and only while no diary or favorite meal uses it. */
  eliminabile: z.boolean(),
  /** Only KCAL_INCOERENTI can apply: the four values are always present. */
  avvisi: z.array(avvisoCatalogoSchema),
  importatoIl: z.iso.datetime().nullable(),
  aggiornatoIl: z.iso.datetime(),
});

export type Alimento = z.infer<typeof alimentoSchema>;

export const paginaAlimentiSchema = paginaSchema(alimentoSchema);

const nuovaPorzioneSchema = z.object({
  nome: z.string().trim().min(1, "Inserisci il nome della porzione").max(50),
  quantita: z
    .number("Inserisci la quantità della porzione")
    .positive("La quantità deve essere maggiore di zero")
    .max(100_000, "Massimo 100000"),
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
  nome: z.string().trim().min(1, "Inserisci il nome").max(255),
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

/**
 * Body of `PATCH /alimenti/:id`: every field is optional; `porzioni` replaces the whole list.
 * `archiviato` hides the food only for the current user.
 */
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

/** Orders of `GET /alimenti`: last used, by use (frequency, then recency), by name. */
export const ordineAlimentiSchema = z.enum(["recenti", "uso", "nome", "nomeDesc"]);

export type OrdineAlimenti = z.infer<typeof ordineAlimentiSchema>;

/** Query of `GET /alimenti`. */
export const filtriAlimentiSchema = z.object({
  q: z.string().trim().max(100).optional(),
  ordine: ordineAlimentiSchema.default("uso"),
  archiviati: z.stringbool().default(false),
  ...paginazioneSchema.shape,
});

/** Filters as the client sends them (the query string carries them as text). */
export type FiltriAlimenti = Partial<z.output<typeof filtriAlimentiSchema>>;

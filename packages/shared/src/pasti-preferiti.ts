import { z } from "zod";
import {
  giornoSchema,
  nuovaVoceSchema,
  tipoPastoSchema,
  valoriSchema,
  voceSuggeritaSchema,
} from "./diario.js";
import { paginaSchema, paginazioneSchema } from "./paginazione.js";

/**
 * A tag of the favorite meals: one shared vocabulary for every user. Stored lowercase, with
 * single spaces, so "Colazione " and "colazione" are the same tag.
 */
export const tagSchema = z
  .string()
  .trim()
  .min(1)
  .max(30)
  .transform((t) => t.toLowerCase().replace(/\s+/g, " "));

/**
 * A saved composition of foods, reusable in any day. Every user sees and uses all of them;
 * only the author changes them (`mio`). Values always come from the foods' current values.
 */
export const pastoPreferitoSchema = z.object({
  id: z.uuid(),
  nome: z.string().min(1),
  autore: z.string(),
  mio: z.boolean(),
  voci: z.array(voceSuggeritaSchema),
  /** In alphabetical order. */
  tags: z.array(z.string()),
  totali: valoriSchema,
  aggiornatoIl: z.iso.datetime(),
});

export type PastoPreferito = z.infer<typeof pastoPreferitoSchema>;

export const paginaPastiPreferitiSchema = paginaSchema(pastoPreferitoSchema);

/** Body of `POST /pasti-preferiti` and `PUT /pasti-preferiti/:id` (which replaces the entries). */
export const nuovoPastoPreferitoSchema = z.object({
  nome: z.string().trim().min(1).max(100),
  voci: z.array(nuovaVoceSchema).min(1).max(50),
  /** Replaced as a whole, like the entries. Repeated tags count once. */
  tags: z
    .array(tagSchema)
    .max(10)
    .default([])
    .transform((tags) => [...new Set(tags)]),
});

/** Body as the client sends it (`tags` may be missing). */
export type NuovoPastoPreferito = z.input<typeof nuovoPastoPreferitoSchema>;

export const autorePastiPreferitiSchema = z.enum(["miei", "tutti"]);

/** Orders of `GET /pasti-preferiti`: by name, or by when the meal was inserted. */
export const ordinePastiPreferitiSchema = z.enum([
  "nome",
  "nomeDesc",
  "inseritiRecenti",
  "inseritiLontani",
]);

export type OrdinePastiPreferiti = z.infer<typeof ordinePastiPreferitiSchema>;

/** Query of `GET /pasti-preferiti`. */
export const filtriPastiPreferitiSchema = z.object({
  q: z.string().trim().max(100).optional(),
  autore: autorePastiPreferitiSchema.default("tutti"),
  ordine: ordinePastiPreferitiSchema.default("nome"),
  /** Meals with all these tags (`?tag=a&tag=b`). */
  tag: z
    .preprocess((v) => (v === undefined || Array.isArray(v) ? v : [v]), z.array(tagSchema).max(10))
    .default([]),
  ...paginazioneSchema.shape,
});

/** Filters as the client sends them. */
export type FiltriPastiPreferiti = Partial<z.output<typeof filtriPastiPreferitiSchema>>;

/** A tag of `GET /pasti-preferiti/tag`, with how many favorite meals of every user have it. */
export const tagUsatoSchema = z.object({
  nome: z.string(),
  pasti: z.number().int().positive(),
});

export type TagUsato = z.infer<typeof tagUsatoSchema>;

/** Body of `POST /diario/pasti/:id/preferito`: saves the meal of the day as a favorite meal. */
export const nuovoPreferitoDaPastoSchema = nuovoPastoPreferitoSchema.pick({ nome: true });

export type NuovoPreferitoDaPasto = z.infer<typeof nuovoPreferitoDaPastoSchema>;

/**
 * Body of `POST /diario/:giorno/preferiti`: fills an empty meal of the day with a favorite meal.
 * `pasto` is the id of a saved snack; without it, `tipo` chooses the meal as in `nuovoPastoSchema`.
 */
export const aggiuntaPreferitoSchema = z.object({
  preferito: z.uuid(),
  tipo: tipoPastoSchema,
  pasto: z.uuid().optional(),
});

export type AggiuntaPreferito = z.infer<typeof aggiuntaPreferitoSchema>;

/** Body of `POST /diario/:giorno/copia`: adds the entries of the day `da` to the day. */
export const copiaGiornoSchema = z.object({ da: giornoSchema });

export type CopiaGiorno = z.infer<typeof copiaGiornoSchema>;

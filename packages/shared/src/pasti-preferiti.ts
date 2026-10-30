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
 * A saved composition of foods, reusable in any day. Every user sees and uses all of them;
 * only the author changes them (`mio`). Values always come from the foods' current values.
 */
export const pastoPreferitoSchema = z.object({
  id: z.uuid(),
  nome: z.string().min(1),
  autore: z.string(),
  mio: z.boolean(),
  voci: z.array(voceSuggeritaSchema),
  totali: valoriSchema,
  aggiornatoIl: z.iso.datetime(),
});

export type PastoPreferito = z.infer<typeof pastoPreferitoSchema>;

export const paginaPastiPreferitiSchema = paginaSchema(pastoPreferitoSchema);

/** Body of `POST /pasti-preferiti` and `PUT /pasti-preferiti/:id` (which replaces the entries). */
export const nuovoPastoPreferitoSchema = z.object({
  nome: z.string().trim().min(1).max(100),
  voci: z.array(nuovaVoceSchema).min(1).max(50),
});

export type NuovoPastoPreferito = z.infer<typeof nuovoPastoPreferitoSchema>;

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
  ...paginazioneSchema.shape,
});

/** Filters as the client sends them. */
export type FiltriPastiPreferiti = Partial<z.output<typeof filtriPastiPreferitiSchema>>;

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

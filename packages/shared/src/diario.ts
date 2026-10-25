import { z } from "zod";
import { unitaBaseSchema } from "./catalogo.js";

/** Fixed meal types, in display order. Only "spuntino" can appear more than once in a day. */
export const tipiPasto = ["colazione", "pranzo", "cena", "spuntino"] as const;

export const tipoPastoSchema = z.enum(tipiPasto);

export type TipoPasto = z.infer<typeof tipoPastoSchema>;

/** Meals present in every day, even before anything is added (shown empty). */
export const tipiPastoPrincipali = ["colazione", "pranzo", "cena"] as const satisfies TipoPasto[];

/** A calendar day as `YYYY-MM-DD`, in the user's local time (the client decides what "today" is). */
export const giornoSchema = z.iso.date();

/** kcal and macros of an entry, a meal or a day: always recalculated from the foods' current values. */
export const valoriSchema = z.object({
  kcal: z.number(),
  proteine: z.number(),
  carboidrati: z.number(),
  grassi: z.number(),
});

export type Valori = z.infer<typeof valoriSchema>;

/** A food eaten in a meal: food and quantity in its base unit (g or ml). */
export const voceSchema = z.object({
  id: z.uuid(),
  alimento: z.object({
    id: z.uuid(),
    nome: z.string(),
    marca: z.string().nullable(),
    unitaBase: unitaBaseSchema,
    archiviato: z.boolean(),
  }),
  quantita: z.number().positive(),
  valori: valoriSchema,
});

export type Voce = z.infer<typeof voceSchema>;

/** Same food of the same meal of the previous day, proposed for an empty meal. */
export const voceSuggeritaSchema = voceSchema.omit({ id: true });

export type VoceSuggerita = z.infer<typeof voceSuggeritaSchema>;

/** A meal of the day. `id` is null for a main meal not yet saved (shown empty). */
export const pastoSchema = z.object({
  id: z.uuid().nullable(),
  tipo: tipoPastoSchema,
  voci: z.array(voceSchema),
  totali: valoriSchema,
  /** Only for an empty main meal: what the same meal had the previous day. */
  suggerite: z.array(voceSuggeritaSchema),
});

export type Pasto = z.infer<typeof pastoSchema>;

/** Response of `GET /diario/:giorno` and of every diary write. */
export const giornataSchema = z.object({
  giorno: giornoSchema,
  pasti: z.array(pastoSchema),
  totali: valoriSchema,
});

export type Giornata = z.infer<typeof giornataSchema>;

/** Query of `GET /diario`: the days with at least one entry, for the calendar. */
export const intervalloGiorniSchema = z
  .object({ da: giornoSchema, a: giornoSchema })
  .refine(({ da, a }) => da <= a, { message: "da deve precedere a" })
  .refine(({ da, a }) => (Date.parse(a) - Date.parse(da)) / 86_400_000 <= 366, {
    message: "intervallo di al massimo un anno",
  });

export type IntervalloGiorni = z.infer<typeof intervalloGiorniSchema>;

export const riepilogoGiornoSchema = z.object({
  giorno: giornoSchema,
  totali: valoriSchema,
});

export type RiepilogoGiorno = z.infer<typeof riepilogoGiornoSchema>;

export const listaRiepiloghiSchema = z.array(riepilogoGiornoSchema);

const quantitaSchema = z.number().positive().max(100_000);

export const nuovaVoceSchema = z.object({
  alimento: z.uuid(),
  quantita: quantitaSchema,
});

export type NuovaVoce = z.infer<typeof nuovaVoceSchema>;

/**
 * Body of `POST /diario/:giorno/pasti`. A main meal is created once (a second call returns it,
 * adding the entries); every call with "spuntino" adds a new snack at the end of the day.
 */
export const nuovoPastoSchema = z.object({
  tipo: tipoPastoSchema,
  voci: z.array(nuovaVoceSchema).max(50).default([]),
});

export type NuovoPasto = z.input<typeof nuovoPastoSchema>;

/** Body of `PATCH /diario/voci/:id`. */
export const modificaVoceSchema = z.object({ quantita: quantitaSchema });

export type ModificaVoce = z.infer<typeof modificaVoceSchema>;

/**
 * Body of `PUT /diario/:giorno/ordine`: every saved meal of the day, in the new order.
 * Snacks can go anywhere; colazione, pranzo and cena must keep their order.
 */
export const ordinePastiSchema = z.object({
  pasti: z
    .array(z.uuid())
    .min(1)
    .refine((ids) => new Set(ids).size === ids.length, { message: "pasti duplicati" }),
});

export type OrdinePasti = z.infer<typeof ordinePastiSchema>;

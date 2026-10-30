import { z } from "zod";
import { unitaBaseSchema } from "./catalogo.js";
import { giornoSchema, tipoPastoSchema, valoriSchema } from "./diario.js";
import { obiettiviSchema } from "./obiettivi.js";

/** Longest range of days that can be exported or shared at once. */
export const MAX_GIORNI_EXPORT = 7;

/** How long a public link lasts. */
export const durateCondivisione = ["giorno", "settimana", "mese", "sempre"] as const;

export const durataCondivisioneSchema = z.enum(durateCondivisione);

export type DurataCondivisione = z.infer<typeof durataCondivisioneSchema>;

/** Body of `POST /condivisioni`. */
export const nuovaCondivisioneSchema = z
  .object({
    da: giornoSchema,
    a: giornoSchema,
    durata: durataCondivisioneSchema,
    /** Off: the copy holds neither the need nor the macro split, so the page cannot show them. */
    mostraFabbisogno: z.boolean(),
  })
  .refine(({ da, a }) => da <= a, { message: "da deve precedere a" })
  .refine(({ da, a }) => (Date.parse(a) - Date.parse(da)) / 86_400_000 < MAX_GIORNI_EXPORT, {
    message: `al massimo ${MAX_GIORNI_EXPORT} giorni`,
  });

export type NuovaCondivisione = z.infer<typeof nuovaCondivisioneSchema>;

/** A link of the current user, as listed in the export page. */
export const condivisioneSchema = z.object({
  id: z.uuid(),
  token: z.string(),
  da: giornoSchema,
  a: giornoSchema,
  /** ISO date and time; null for a link that never expires. */
  scadeIl: z.iso.datetime().nullable(),
});

export type Condivisione = z.infer<typeof condivisioneSchema>;

export const listaCondivisioniSchema = z.array(condivisioneSchema);

/** A public page shows only what it needs: no ids, no archive state, no suggestions. */
export const giornoCondivisoSchema = z.object({
  giorno: giornoSchema,
  /** Only the meals with at least one entry. */
  pasti: z.array(
    z.object({
      tipo: tipoPastoSchema,
      voci: z.array(
        z.object({
          nome: z.string(),
          marca: z.string().nullable(),
          unitaBase: unitaBaseSchema,
          quantita: z.number(),
          valori: valoriSchema,
        }),
      ),
      totali: valoriSchema,
    }),
  ),
  totali: valoriSchema,
});

export type GiornoCondiviso = z.infer<typeof giornoCondivisoSchema>;

/** The copy saved with the link: later changes to the diary or the goals do not reach it. */
export const datiCondivisiSchema = z.object({
  /** Null if the need was not shared, or not set. */
  obiettivi: obiettiviSchema.nullable(),
  giorni: z.array(giornoCondivisoSchema),
});

export type DatiCondivisi = z.infer<typeof datiCondivisiSchema>;

/** Response of `GET /pubblico/:token`. */
export const vistaCondivisaSchema = datiCondivisiSchema.extend({
  da: giornoSchema,
  a: giornoSchema,
  scadeIl: z.iso.datetime().nullable(),
});

export type VistaCondivisa = z.infer<typeof vistaCondivisaSchema>;

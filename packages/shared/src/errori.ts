import { z } from "zod";

/** Shape of every error response from the API. */
export const erroreApiSchema = z.object({
  errore: z.object({
    codice: z.string(),
    messaggio: z.string(),
    dettagli: z.unknown().optional(),
  }),
});

export type ErroreApi = z.infer<typeof erroreApiSchema>;

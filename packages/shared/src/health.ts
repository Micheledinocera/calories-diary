import { z } from "zod";

export const statoServizioSchema = z.enum(["ok", "errore"]);

export const healthSchema = z.object({
  stato: statoServizioSchema,
  db: statoServizioSchema,
  redis: statoServizioSchema,
  versione: z.string(),
});

export type Health = z.infer<typeof healthSchema>;

import { z } from "zod";

export const credenzialiSchema = z.object({
  // Normalized before the format check, so " Io@Esempio.it " is accepted as "io@esempio.it".
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1).max(200),
});

export type Credenziali = z.infer<typeof credenzialiSchema>;

export const utenteSchema = z.object({
  id: z.uuid(),
  email: z.email(),
});

export type Utente = z.infer<typeof utenteSchema>;

/** Response of login and renewal: a Bearer token valid until `scadeIl`. */
export const sessioneSchema = z.object({
  token: z.string().min(1),
  scadeIl: z.iso.datetime(),
  utente: utenteSchema,
});

export type Sessione = z.infer<typeof sessioneSchema>;

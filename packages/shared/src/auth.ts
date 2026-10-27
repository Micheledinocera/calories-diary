import { z } from "zod";

export const LUNGHEZZA_MINIMA_PASSWORD = 12;

/**
 * Username of a new or renamed user: 3-32 characters, saved as typed but unique ignoring
 * the case. `@` and `.` are allowed because the users migrated from the email login use the email.
 */
export const usernameSchema = z
  .string()
  .trim()
  .min(3, "almeno 3 caratteri")
  .max(32, "al massimo 32 caratteri")
  .regex(/^[A-Za-z0-9._@-]+$/, "solo lettere, cifre e . _ - @");

/** Password chosen by an admin or by the user (the login accepts any length). */
export const nuovaPasswordSchema = z
  .string()
  .min(LUNGHEZZA_MINIMA_PASSWORD, `almeno ${LUNGHEZZA_MINIMA_PASSWORD} caratteri`)
  .max(200);

export const credenzialiSchema = z.object({
  // Any case: the API looks it up ignoring it. Migrated usernames (old emails) can be longer
  // than a new username.
  username: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(200),
});

export type Credenziali = z.infer<typeof credenzialiSchema>;

export const ruoli = ["admin", "utente"] as const;
export const ruoloSchema = z.enum(ruoli);
export type Ruolo = z.infer<typeof ruoloSchema>;

/** The email stays in the database only: it is not exposed. */
export const utenteSchema = z.object({
  id: z.uuid(),
  username: z.string(),
  ruolo: ruoloSchema,
});

export type Utente = z.infer<typeof utenteSchema>;

/** Response of login and renewal: a Bearer token valid until `scadeIl`. */
export const sessioneSchema = z.object({
  token: z.string().min(1),
  scadeIl: z.iso.datetime(),
  utente: utenteSchema,
});

export type Sessione = z.infer<typeof sessioneSchema>;

/** Body of `PATCH /auth/io`: the user can change only their username. */
export const modificaProfiloSchema = z.object({ username: usernameSchema });

export type ModificaProfilo = z.infer<typeof modificaProfiloSchema>;

/** Body of `PUT /auth/password`: the current password (the old one, or the admin's) and the new one. */
export const cambioPasswordSchema = z.object({
  passwordAttuale: z.string().min(1).max(200),
  nuovaPassword: nuovaPasswordSchema,
});

export type CambioPassword = z.infer<typeof cambioPasswordSchema>;

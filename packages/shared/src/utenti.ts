import { z } from "zod";
import { nuovaPasswordSchema, usernameSchema, utenteSchema } from "./auth.js";

/** Response of `GET /utenti` (admin only), ordered by username. */
export const listaUtentiSchema = z.array(utenteSchema);

/** Body of `POST /utenti`: the admin creates normal users; admins are created from the CLI only. */
export const nuovoUtenteSchema = z.object({
  username: usernameSchema,
  password: nuovaPasswordSchema,
});

export type NuovoUtente = z.infer<typeof nuovoUtenteSchema>;

/** Body of `PATCH /utenti/:id`: a new password logs the user out of every device. */
export const modificaUtenteSchema = z
  .object({
    username: usernameSchema.optional(),
    password: nuovaPasswordSchema.optional(),
  })
  .refine(({ username, password }) => username !== undefined || password !== undefined, {
    message: "niente da modificare",
  });

export type ModificaUtente = z.infer<typeof modificaUtenteSchema>;

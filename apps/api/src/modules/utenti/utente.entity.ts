import { randomUUID } from "node:crypto";
import { defineEntity, p } from "@mikro-orm/core";
import { ruoli } from "@calories-diary/shared";

/** Case-insensitive key of a username: "Mario" and "mario" are the same user. */
export const chiaveUsername = (username: string) => username.toLowerCase();

export const UtenteSchema = defineEntity({
  name: "Utente",
  properties: {
    id: p
      .uuid()
      .primary()
      .onCreate(() => randomUUID()),
    // Saved as typed. 254 because migrated users use the email.
    username: p.string().length(254),
    // Lowercase copy kept in sync by the ORM: uniqueness and login ignore the case.
    chiaveUsername: p
      .string()
      .length(254)
      .unique()
      .onCreate((u) => chiaveUsername(u.username))
      .onUpdate((u) => chiaveUsername(u.username)),
    // Optional, in the database only for now (no UI, no password reset by email).
    email: p.string().length(254).nullable().unique(),
    passwordHash: p.string().length(255).hidden(),
    ruolo: p.enum(ruoli).default("utente"),
    // Written in the token: raising it (admin or user changing the password) invalidates the
    // tokens already issued, sliding renewal included.
    versioneSessione: p.integer().default(0),
    // Goals (`/obiettivi`): daily kcal need entered by hand, and the macro split in percent.
    fabbisogno: p.integer().nullable(),
    quotaCarboidrati: p.integer().default(50),
    quotaGrassi: p.integer().default(30),
    quotaProteine: p.integer().default(20),
    creatoIl: p.datetime().onCreate(() => new Date()),
    aggiornatoIl: p
      .datetime()
      .onCreate(() => new Date())
      .onUpdate(() => new Date()),
  },
});

export class Utente extends UtenteSchema.class {}
UtenteSchema.setClass(Utente);

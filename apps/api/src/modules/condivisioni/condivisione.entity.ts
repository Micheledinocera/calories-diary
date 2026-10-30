import { randomBytes, randomUUID } from "node:crypto";
import { defineEntity, p } from "@mikro-orm/core";
import type { DatiCondivisi } from "@calories-diary/shared";
import { Utente } from "../utenti/utente.entity.js";

/**
 * A public link to a copy of some days of a user's diary. Revoking deletes it; expired ones are
 * deleted the next time their owner lists the links.
 */
export const CondivisioneSchema = defineEntity({
  name: "Condivisione",
  properties: {
    id: p
      .uuid()
      .primary()
      .onCreate(() => randomUUID()),
    utente: () => p.manyToOne(Utente).deleteRule("cascade"),
    // Stands in for a login, so it cannot be guessed. In clear: the owner can copy the link again.
    token: p
      .string()
      .length(32)
      .unique()
      .onCreate(() => randomBytes(24).toString("base64url")),
    da: p.date(),
    a: p.date(),
    // Null: the link never expires.
    scadeIl: p.datetime().nullable(),
    dati: p.json<DatiCondivisi>(),
    creatoIl: p.datetime().onCreate(() => new Date()),
  },
  indexes: [{ properties: ["utente"] }],
});

export class Condivisione extends CondivisioneSchema.class {}
CondivisioneSchema.setClass(Condivisione);

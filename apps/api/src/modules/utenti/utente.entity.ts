import { randomUUID } from "node:crypto";
import { defineEntity, p } from "@mikro-orm/core";

export const UtenteSchema = defineEntity({
  name: "Utente",
  properties: {
    id: p
      .uuid()
      .primary()
      .onCreate(() => randomUUID()),
    // Always lowercase (credenzialiSchema normalizes it).
    email: p.string().length(254).unique(),
    passwordHash: p.string().length(255).hidden(),
    creatoIl: p.datetime().onCreate(() => new Date()),
    aggiornatoIl: p
      .datetime()
      .onCreate(() => new Date())
      .onUpdate(() => new Date()),
  },
});

export class Utente extends UtenteSchema.class {}
UtenteSchema.setClass(Utente);

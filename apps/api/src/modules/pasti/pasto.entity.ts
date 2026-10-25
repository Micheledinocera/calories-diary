import { randomUUID } from "node:crypto";
import { defineEntity, p } from "@mikro-orm/core";
import { Utente } from "../utenti/utente.entity.js";

export const PastoSchema = defineEntity({
  name: "Pasto",
  properties: {
    id: p
      .uuid()
      .primary()
      .onCreate(() => randomUUID()),
    // Meals are per user (unique name per user).
    utente: () => p.manyToOne(Utente).deleteRule("cascade"),
    nome: p.string().length(50),
    ordine: p.integer(),
    creatoIl: p.datetime().onCreate(() => new Date()),
    aggiornatoIl: p
      .datetime()
      .onCreate(() => new Date())
      .onUpdate(() => new Date()),
  },
  uniques: [{ properties: ["utente", "nome"] }],
});

export class Pasto extends PastoSchema.class {}
PastoSchema.setClass(Pasto);

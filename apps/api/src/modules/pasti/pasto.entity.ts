import { randomUUID } from "node:crypto";
import { defineEntity, p } from "@mikro-orm/core";

export const PastoSchema = defineEntity({
  name: "Pasto",
  properties: {
    id: p
      .uuid()
      .primary()
      .onCreate(() => randomUUID()),
    nome: p.string().length(50).unique(),
    ordine: p.integer(),
    creatoIl: p.datetime().onCreate(() => new Date()),
    aggiornatoIl: p
      .datetime()
      .onCreate(() => new Date())
      .onUpdate(() => new Date()),
  },
});

export class Pasto extends PastoSchema.class {}
PastoSchema.setClass(Pasto);

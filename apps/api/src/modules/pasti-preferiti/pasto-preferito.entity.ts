import { randomUUID } from "node:crypto";
import { defineEntity, p } from "@mikro-orm/core";
import { Utente } from "../utenti/utente.entity.js";
import { VocePreferita } from "./voce-preferita.entity.js";

/** A saved composition of foods: every user sees it and uses it, only the author changes it. */
export const PastoPreferitoSchema = defineEntity({
  name: "PastoPreferito",
  properties: {
    id: p
      .uuid()
      .primary()
      .onCreate(() => randomUUID()),
    autore: () => p.manyToOne(Utente).deleteRule("cascade"),
    nome: p.string().length(100),
    voci: () =>
      p
        .oneToMany(VocePreferita)
        .mappedBy("pastoPreferito")
        .orphanRemoval()
        .orderBy({ ordine: "asc" }),
    creatoIl: p.datetime().onCreate(() => new Date()),
    aggiornatoIl: p
      .datetime()
      .onCreate(() => new Date())
      .onUpdate(() => new Date()),
  },
  indexes: [{ properties: ["autore"] }],
});

export class PastoPreferito extends PastoPreferitoSchema.class {}
PastoPreferitoSchema.setClass(PastoPreferito);

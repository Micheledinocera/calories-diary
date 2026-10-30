import { randomUUID } from "node:crypto";
import { defineEntity, p } from "@mikro-orm/core";
import { tipiPasto } from "@calories-diary/shared";
import { PastoPreferito } from "../pasti-preferiti/pasto-preferito.entity.js";
import { Utente } from "../utenti/utente.entity.js";
import { Voce } from "./voce.entity.js";

/**
 * A meal of a user's day. Colazione, pranzo and cena are at most one per day (partial unique
 * index in the migration: MikroORM cannot declare it); snacks can be many.
 */
export const PastoSchema = defineEntity({
  name: "Pasto",
  properties: {
    id: p
      .uuid()
      .primary()
      .onCreate(() => randomUUID()),
    utente: () => p.manyToOne(Utente).deleteRule("cascade"),
    giorno: p.date(),
    tipo: p.enum(tipiPasto),
    // Position in the day: main meals keep their relative order, snacks can go anywhere.
    ordine: p.integer(),
    voci: () => p.oneToMany(Voce).mappedBy("pasto").orderBy({ creatoIl: "asc" }),
    // Set while the meal is identical to this favorite meal.
    preferito: () => p.manyToOne(PastoPreferito).nullable().deleteRule("set null"),
    creatoIl: p.datetime().onCreate(() => new Date()),
    aggiornatoIl: p
      .datetime()
      .onCreate(() => new Date())
      .onUpdate(() => new Date()),
  },
  indexes: [{ properties: ["utente", "giorno"] }],
});

export class Pasto extends PastoSchema.class {}
PastoSchema.setClass(Pasto);

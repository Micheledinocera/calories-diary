import { randomUUID } from "node:crypto";
import { defineEntity, p } from "@mikro-orm/core";
import { Utente } from "../utenti/utente.entity.js";
import { Alimento } from "./alimento.entity.js";

/**
 * How one user uses a food of the shared pool: "Recenti", "Più usati" and the archive, which
 * hides the food only for that user. A missing row means never used and not archived.
 */
export const UsoAlimentoSchema = defineEntity({
  name: "UsoAlimento",
  properties: {
    id: p
      .uuid()
      .primary()
      .onCreate(() => randomUUID()),
    utente: () => p.manyToOne(Utente).deleteRule("cascade"),
    alimento: () => p.manyToOne(Alimento).deleteRule("cascade"),
    // Updated by the diary when the food is used.
    ultimoUso: p.datetime().nullable(),
    utilizzi: p.integer().default(0),
    archiviato: p.boolean().default(false),
  },
  uniques: [{ properties: ["utente", "alimento"] }],
  indexes: [{ properties: ["alimento"] }],
});

export class UsoAlimento extends UsoAlimentoSchema.class {}
UsoAlimentoSchema.setClass(UsoAlimento);

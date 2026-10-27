import { randomUUID } from "node:crypto";
import { defineEntity, p } from "@mikro-orm/core";
import { ProdottoCatalogo } from "../catalogo/prodotto-catalogo.entity.js";
import { Utente } from "../utenti/utente.entity.js";
import { Porzione } from "./porzione.entity.js";
import { UsoAlimento } from "./uso-alimento.entity.js";

/**
 * A food of the shared pool: every user sees it, uses it and can correct it; how each user uses
 * it is in UsoAlimento. In the MVP it tracks only kcal and the three macros, per 100 g/ml.
 * Foods imported from the catalog keep the link to the product (for the phase 3 re-sync).
 */
export const AlimentoSchema = defineEntity({
  name: "Alimento",
  properties: {
    id: p
      .uuid()
      .primary()
      .onCreate(() => randomUUID()),
    // Who created it: the only one who can delete it. Other users' diaries may use it.
    autore: () => p.manyToOne(Utente).nullable().deleteRule("set null"),
    nome: p.string().length(255),
    marca: p.string().length(255).nullable(),
    // Normalized like the catalog; unique in the pool.
    barcode: p.string().length(14).nullable(),
    fonte: p.enum(["manuale", "off"] as const),
    prodottoCatalogo: () => p.manyToOne(ProdottoCatalogo).nullable().deleteRule("set null"),
    unitaBase: p.enum(["g", "ml"] as const),
    kcal: p.decimal("number").precision(10).scale(3),
    proteine: p.decimal("number").precision(10).scale(3),
    carboidrati: p.decimal("number").precision(10).scale(3),
    grassi: p.decimal("number").precision(10).scale(3),
    porzioni: () =>
      p.oneToMany(Porzione).mappedBy("alimento").orphanRemoval().orderBy({ nome: "asc" }),
    usi: () => p.oneToMany(UsoAlimento).mappedBy("alimento"),
    verificato: p.boolean().default(false),
    importatoIl: p.datetime().nullable(),
    creatoIl: p.datetime().onCreate(() => new Date()),
    aggiornatoIl: p
      .datetime()
      .onCreate(() => new Date())
      .onUpdate(() => new Date()),
  },
  uniques: [{ properties: ["barcode"] }],
});

export class Alimento extends AlimentoSchema.class {}
AlimentoSchema.setClass(Alimento);

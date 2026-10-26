import { randomUUID } from "node:crypto";
import { defineEntity, p } from "@mikro-orm/core";

/**
 * Shared catalog: provider products imported by any user, used as a common cache.
 * Values per 100 g/ml are all optional: the catalog reflects what the provider gives.
 */
export const ProdottoCatalogoSchema = defineEntity({
  name: "ProdottoCatalogo",
  properties: {
    id: p
      .uuid()
      .primary()
      .onCreate(() => randomUUID()),
    // Normalized like Open Food Facts does (see barcode.ts).
    barcode: p.string().length(14).unique(),
    fonte: p.enum(["off"] as const),
    idFonte: p.string().length(50),
    nome: p.string().length(255).nullable(),
    marca: p.string().length(255).nullable(),
    unitaBase: p.enum(["g", "ml"] as const),
    kcal: p.decimal("number").precision(10).scale(3).nullable(),
    proteine: p.decimal("number").precision(10).scale(3).nullable(),
    carboidrati: p.decimal("number").precision(10).scale(3).nullable(),
    grassi: p.decimal("number").precision(10).scale(3).nullable(),
    zuccheri: p.decimal("number").precision(10).scale(3).nullable(),
    grassiSaturi: p.decimal("number").precision(10).scale(3).nullable(),
    fibre: p.decimal("number").precision(10).scale(3).nullable(),
    sale: p.decimal("number").precision(10).scale(3).nullable(),
    porzioneDescrizione: p.string().length(100).nullable(),
    porzioneQuantita: p.decimal("number").precision(10).scale(3).nullable(),
    immagineUrl: p.string().length(500).nullable(),
    importatoIl: p.datetime().onCreate(() => new Date()),
    aggiornatoIl: p
      .datetime()
      .onCreate(() => new Date())
      .onUpdate(() => new Date()),
  },
});

export class ProdottoCatalogo extends ProdottoCatalogoSchema.class {}
ProdottoCatalogoSchema.setClass(ProdottoCatalogo);

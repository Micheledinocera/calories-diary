import { randomUUID } from "node:crypto";
import { defineEntity, p } from "@mikro-orm/core";
import { Alimento } from "../alimenti/alimento.entity.js";
import { PastoPreferito } from "./pasto-preferito.entity.js";

/**
 * A food of a favorite meal. As in the diary, only food and quantity are stored. A food in a
 * favorite meal cannot be deleted (no cascade): the meal must not lose it without notice.
 */
export const VocePreferitaSchema = defineEntity({
  name: "VocePreferita",
  properties: {
    id: p
      .uuid()
      .primary()
      .onCreate(() => randomUUID()),
    pastoPreferito: () => p.manyToOne(PastoPreferito).deleteRule("cascade"),
    alimento: () => p.manyToOne(Alimento),
    // In the food's base unit (g or ml).
    quantita: p.decimal("number").precision(10).scale(3),
    ordine: p.integer(),
  },
  indexes: [{ properties: ["pastoPreferito"] }, { properties: ["alimento"] }],
});

export class VocePreferita extends VocePreferitaSchema.class {}
VocePreferitaSchema.setClass(VocePreferita);

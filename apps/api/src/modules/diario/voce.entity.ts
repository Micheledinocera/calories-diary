import { randomUUID } from "node:crypto";
import { defineEntity, p } from "@mikro-orm/core";
import { Alimento } from "../alimenti/alimento.entity.js";
import { Pasto } from "./pasto.entity.js";

/**
 * A food eaten in a meal. Only food and quantity are stored: kcal and macros are always
 * recalculated from the food's current values, past days included.
 * A food with entries cannot be deleted (no cascade): it is archived instead.
 */
export const VoceSchema = defineEntity({
  name: "Voce",
  properties: {
    id: p
      .uuid()
      .primary()
      .onCreate(() => randomUUID()),
    pasto: () => p.manyToOne(Pasto).deleteRule("cascade"),
    alimento: () => p.manyToOne(Alimento),
    // In the food's base unit (g or ml).
    quantita: p.decimal("number").precision(10).scale(3),
    creatoIl: p.datetime().onCreate(() => new Date()),
    aggiornatoIl: p
      .datetime()
      .onCreate(() => new Date())
      .onUpdate(() => new Date()),
  },
  indexes: [{ properties: ["pasto"] }, { properties: ["alimento"] }],
});

export class Voce extends VoceSchema.class {}
VoceSchema.setClass(Voce);

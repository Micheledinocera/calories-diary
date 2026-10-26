import { randomUUID } from "node:crypto";
import { defineEntity, p } from "@mikro-orm/core";
import { Alimento } from "./alimento.entity.js";

/**
 * Named portion of a food (e.g. "1 vasetto" = 125), in the food's base unit.
 * Names are unique per food by validation (nuovoAlimentoSchema), not by a DB constraint:
 * replacing the list would insert the new rows before removing the old ones.
 */
export const PorzioneSchema = defineEntity({
  name: "Porzione",
  properties: {
    id: p
      .uuid()
      .primary()
      .onCreate(() => randomUUID()),
    alimento: () => p.manyToOne(Alimento).deleteRule("cascade"),
    nome: p.string().length(50),
    quantita: p.decimal("number").precision(10).scale(3),
    predefinita: p.boolean().default(false),
  },
  indexes: [{ properties: ["alimento"] }],
});

export class Porzione extends PorzioneSchema.class {}
PorzioneSchema.setClass(Porzione);

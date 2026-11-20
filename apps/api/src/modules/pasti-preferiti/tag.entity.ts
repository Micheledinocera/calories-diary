import { randomUUID } from "node:crypto";
import { defineEntity, p } from "@mikro-orm/core";

/**
 * A tag of the favorite meals: one vocabulary shared by every user. The name is already
 * normalized (lowercase, single spaces) by `tagSchema`. A tag no meal has any more is not listed.
 */
export const TagSchema = defineEntity({
  name: "Tag",
  properties: {
    id: p
      .uuid()
      .primary()
      .onCreate(() => randomUUID()),
    nome: p.string().length(30).unique(),
  },
});

export class Tag extends TagSchema.class {}
TagSchema.setClass(Tag);

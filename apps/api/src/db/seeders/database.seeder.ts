import type { EntityManager } from "@mikro-orm/core";
import { Seeder } from "@mikro-orm/seeder";
import { Pasto } from "../../modules/pasti/pasto.entity.js";

const pastiPredefiniti = ["Colazione", "Pranzo", "Cena", "Spuntino"];

/** Idempotent: inserts only the missing default meals. */
export class DatabaseSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const esistenti = new Set((await em.findAll(Pasto)).map((p) => p.nome));
    pastiPredefiniti.forEach((nome, ordine) => {
      if (!esistenti.has(nome)) em.create(Pasto, { nome, ordine });
    });
    await em.flush();
  }
}

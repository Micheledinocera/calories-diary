import type { EntityManager } from "@mikro-orm/core";
import { Seeder } from "@mikro-orm/seeder";
import { Pasto } from "../../modules/pasti/pasto.entity.js";
import { creaPastiPredefiniti } from "../../modules/pasti/pasti.service.js";
import { Utente } from "../../modules/utenti/utente.entity.js";

/** Idempotent: inserts the default meals missing for each user. Users are created with `utente:crea`. */
export class DatabaseSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    for (const utente of await em.findAll(Utente)) {
      const pasti = await em.find(Pasto, { utente });
      creaPastiPredefiniti(em, utente, new Set(pasti.map((p) => p.nome)));
    }
    await em.flush();
  }
}

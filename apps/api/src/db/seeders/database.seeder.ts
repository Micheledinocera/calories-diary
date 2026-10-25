import type { EntityManager } from "@mikro-orm/core";
import { Seeder } from "@mikro-orm/seeder";

/**
 * Nothing to seed for now: meal types are fixed in the shared package and users are created
 * with `utente:crea`. Kept so `pnpm db:seed` and the test setup have a place for future data.
 */
export class DatabaseSeeder extends Seeder {
  async run(_em: EntityManager): Promise<void> {}
}

import { MikroORM } from "@mikro-orm/postgresql";
import { caricaEnv } from "../src/config/env.js";
import { creaConfigOrm } from "../src/db/mikro-orm.config.js";
import { DatabaseSeeder } from "../src/db/seeders/database.seeder.js";

/** Rebuilds the test database from the migrations, then seeds it. */
export default async function setup() {
  const orm = await MikroORM.init(creaConfigOrm(caricaEnv()));
  try {
    await orm.schema.drop({ dropMigrationsTable: true });
    await orm.migrator.up();
    await orm.seeder.seed(DatabaseSeeder);
  } finally {
    await orm.close(true);
  }
}

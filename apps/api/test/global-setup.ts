import { MikroORM } from "@mikro-orm/postgresql";
import { Redis } from "ioredis";
import { caricaEnv } from "../src/config/env.js";
import { creaConfigOrm } from "../src/db/mikro-orm.config.js";
import { DatabaseSeeder } from "../src/db/seeders/database.seeder.js";
import { creaUtentiService } from "../src/modules/utenti/utenti.service.js";
import { altroUtenteTest, utenteTest } from "./utenti-test.js";

/** Rebuilds the test database from the migrations, creates the test users, then seeds it. */
export default async function setup() {
  const env = caricaEnv();
  const orm = await MikroORM.init(creaConfigOrm(env));
  try {
    await orm.schema.drop({ dropMigrationsTable: true });
    await orm.migrator.up();
    const utenti = creaUtentiService(orm.em.fork());
    for (const { email, password } of [utenteTest, altroUtenteTest]) {
      await utenti.crea(email, password);
    }
    await orm.seeder.seed(DatabaseSeeder);
  } finally {
    await orm.close(true);
  }
  await azzeraLimiteLogin(env.REDIS_URL, env.REDIS_PREFIX);
}

/** Login counters survive between runs: without this, runs close together would get 429. */
async function azzeraLimiteLogin(url: string, prefisso: string) {
  // No keyPrefix: SCAN returns full keys, which DEL must receive unchanged.
  const redis = new Redis(url);
  try {
    let cursore = "0";
    do {
      const [prossimo, chiavi] = await redis.scan(cursore, "MATCH", `${prefisso}login:*`);
      if (chiavi.length) await redis.del(...chiavi);
      cursore = prossimo;
    } while (cursore !== "0");
  } finally {
    await redis.quit();
  }
}

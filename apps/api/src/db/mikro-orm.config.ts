import { join } from "node:path";
import { Migrator } from "@mikro-orm/migrations";
import { defineConfig } from "@mikro-orm/postgresql";
import { SeedManager } from "@mikro-orm/seeder";
import type { Env } from "../config/env.js";
import { entita } from "./entita.js";

// Same relative path from src/db (tsx) and dist/src/db (compiled): apps/api/migrations or dist/migrations.
const cartellaMigrazioni = join(import.meta.dirname, "../../migrations");

// MikroORM takes only host, port, user, password and database from clientUrl: sslmode (Neon) becomes the pg `ssl` option.
const sslmodeCifrati = new Set(["require", "verify-ca", "verify-full"]);

/**
 * @param diretta use DATABASE_URL_DIRECT (Neon direct connection), for migrations only.
 */
export function creaConfigOrm(env: Env, { diretta = false } = {}) {
  const clientUrl = diretta ? (env.DATABASE_URL_DIRECT ?? env.DATABASE_URL) : env.DATABASE_URL;
  const sslmode = new URL(clientUrl).searchParams.get("sslmode");
  return defineConfig({
    clientUrl,
    driverOptions: sslmode && sslmodeCifrati.has(sslmode) ? { ssl: true } : {},
    entities: entita,
    extensions: [Migrator, SeedManager],
    migrations: {
      path: cartellaMigrazioni,
      glob: "!(*.d).{js,ts}",
      snapshotOnMigrate: false,
    },
    debug: env.LOG_LEVEL === "trace",
  });
}

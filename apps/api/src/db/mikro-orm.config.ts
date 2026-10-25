import { join } from "node:path";
import { Migrator } from "@mikro-orm/migrations";
import { defineConfig } from "@mikro-orm/postgresql";
import { SeedManager } from "@mikro-orm/seeder";
import type { Env } from "../config/env.js";
import { entita } from "./entita.js";

// Same relative path from src/db (tsx) and dist/src/db (compiled): apps/api/migrations or dist/migrations.
const cartellaMigrazioni = join(import.meta.dirname, "../../migrations");

/**
 * @param diretta use DATABASE_URL_DIRECT (Neon direct connection), for migrations only.
 */
export function creaConfigOrm(env: Env, { diretta = false } = {}) {
  return defineConfig({
    clientUrl: diretta ? (env.DATABASE_URL_DIRECT ?? env.DATABASE_URL) : env.DATABASE_URL,
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

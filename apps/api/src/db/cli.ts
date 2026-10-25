// DB commands, run with tsx in development (`pnpm migration:up`) and with node from dist in production
// (`node dist/src/db/cli.js migration:up`). Migrations never run at container start.
import { MikroORM } from "@mikro-orm/postgresql";
import { caricaEnv } from "../config/env.js";
import { creaConfigOrm } from "./mikro-orm.config.js";
import { DatabaseSeeder } from "./seeders/database.seeder.js";

const comandi = ["migration:create", "migration:up", "migration:down", "seed"] as const;
type Comando = (typeof comandi)[number];

const [comando, nome] = process.argv.slice(2);
if (!comandi.includes(comando as Comando)) {
  console.error(`Uso: cli.ts <${comandi.join("|")}> [nome migrazione]`);
  process.exit(1);
}

const env = caricaEnv();
const orm = await MikroORM.init(creaConfigOrm(env, { diretta: comando !== "seed" }));
try {
  switch (comando as Comando) {
    case "migration:create": {
      const result = await orm.migrator.create(undefined, false, false, nome);
      console.log(result.fileName ? `Creata ${result.fileName}` : "Nessuna modifica allo schema");
      break;
    }
    case "migration:up": {
      const eseguite = await orm.migrator.up();
      console.log(`Migrazioni eseguite: ${eseguite.map((m) => m.name).join(", ") || "nessuna"}`);
      break;
    }
    case "migration:down": {
      const annullate = await orm.migrator.down();
      console.log(`Migrazioni annullate: ${annullate.map((m) => m.name).join(", ") || "nessuna"}`);
      break;
    }
    case "seed":
      await orm.seeder.seed(DatabaseSeeder);
      console.log("Seed completato");
      break;
  }
} finally {
  await orm.close(true);
}

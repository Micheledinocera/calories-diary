// DB commands, run with tsx in development (`pnpm migration:up`) and with node from dist in production
// (`node dist/src/db/cli.js migration:up`). Migrations never run at container start.
// Users are created here too (`pnpm utente:crea <email>`): there is no public sign-up.
// `seed:demo <email>` fills a new user with fake data for usability tests (never in production).
import { credenzialiSchema } from "@calories-diary/shared";
import { MikroORM } from "@mikro-orm/postgresql";
import { z, ZodError } from "zod";
import { caricaEnv } from "../config/env.js";
import { ErroreApp } from "../lib/errori.js";
import { creaUtentiService } from "../modules/utenti/utenti.service.js";
import { chiediPassword } from "./chiedi-password.js";
import { creaConfigOrm } from "./mikro-orm.config.js";
import { DatabaseSeeder } from "./seeders/database.seeder.js";
import { ErroreDemo, seedDemo } from "./seeders/demo.seeder.js";

const comandi = [
  "migration:create",
  "migration:up",
  "migration:down",
  "seed",
  "seed:demo",
  "utente:crea",
] as const;
const LUNGHEZZA_MINIMA_PASSWORD = 12;
type Comando = (typeof comandi)[number];

class ErroreCli extends Error {}

// nome: migration name for migration:create, email for utente:crea.
const [comando, nome] = process.argv.slice(2);
if (!comandi.includes(comando as Comando)) {
  console.error(`Uso: cli.ts <${comandi.join("|")}> [nome migrazione | email]`);
  process.exit(1);
}

const env = caricaEnv();
const orm = await MikroORM.init(creaConfigOrm(env, { diretta: comando!.startsWith("migration:") }));
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
    case "seed:demo": {
      if (env.NODE_ENV === "production")
        throw new ErroreCli("Il seed demo non va mai in produzione");
      if (!nome) throw new ErroreCli("Uso: cli.ts seed:demo <email>");
      const { alimenti, giorni } = await seedDemo(orm.em.fork(), nome);
      console.log(`Dati demo per ${nome}: ${alimenti} alimenti, ${giorni} giorni di diario`);
      break;
    }
    case "utente:crea": {
      const password = await chiediPassword("Password: ");
      if (password.length < LUNGHEZZA_MINIMA_PASSWORD) {
        throw new ErroreCli(`La password deve avere almeno ${LUNGHEZZA_MINIMA_PASSWORD} caratteri`);
      }
      if (process.stdin.isTTY && (await chiediPassword("Ripeti la password: ")) !== password) {
        throw new ErroreCli("Le password non coincidono");
      }
      const credenziali = credenzialiSchema.parse({ email: nome, password });
      const utente = await creaUtentiService(orm.em.fork()).crea(credenziali.email, password);
      console.log(`Creato l'utente ${utente.email} (${utente.id})`);
      break;
    }
  }
} catch (err) {
  // Expected errors (validation, email in use) need no stack trace.
  if (!(
    err instanceof ErroreApp ||
    err instanceof ZodError ||
    err instanceof ErroreCli ||
    err instanceof ErroreDemo
  ))
    throw err;
  console.error(err instanceof ZodError ? z.prettifyError(err) : err.message);
  process.exitCode = 1;
} finally {
  await orm.close(true);
}

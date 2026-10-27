// DB commands, run with tsx in development (`pnpm migration:up`) and with node from dist in production
// (`node dist/src/db/cli.js migration:up`). Migrations never run at container start.
// Admins are created here only (`pnpm utente:crea <username> --admin`, or `utente:admin <username>`
// to promote an existing user); normal users also from the admin page of the app.
// `seed:demo <username>` fills a new user with fake data for usability tests (never in production).
import { nuovoUtenteSchema, usernameSchema } from "@calories-diary/shared";
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
  "utente:admin",
] as const;
type Comando = (typeof comandi)[number];

class ErroreCli extends Error {}

// nome: migration name for migration:create, username for the user commands.
const [comando, nome, ...opzioni] = process.argv.slice(2);
if (!comandi.includes(comando as Comando)) {
  console.error(`Uso: cli.ts <${comandi.join("|")}> [nome migrazione | username] [--admin]`);
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
      if (!nome) throw new ErroreCli("Uso: cli.ts seed:demo <username>");
      const { alimenti, giorni } = await seedDemo(orm.em.fork(), nome);
      console.log(`Dati demo per ${nome}: ${alimenti} alimenti, ${giorni} giorni di diario`);
      break;
    }
    case "utente:crea": {
      const username = usernameSchema.parse(nome);
      const password = await chiediPassword("Password: ");
      if (process.stdin.isTTY && (await chiediPassword("Ripeti la password: ")) !== password) {
        throw new ErroreCli("Le password non coincidono");
      }
      const dati = nuovoUtenteSchema.parse({ username, password });
      const ruolo = opzioni.includes("--admin") ? "admin" : "utente";
      const utente = await creaUtentiService(orm.em.fork()).crea(dati.username, password, ruolo);
      console.log(`Creato l'utente ${utente.username} (${utente.ruolo}, ${utente.id})`);
      break;
    }
    case "utente:admin": {
      if (!nome) throw new ErroreCli("Uso: cli.ts utente:admin <username>");
      const utente = await creaUtentiService(orm.em.fork()).promuoviAdmin(nome.trim());
      console.log(`${utente.username} ora è admin`);
      break;
    }
  }
} catch (err) {
  // Expected errors (validation, username in use) need no stack trace.
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

import { MikroORM } from "@mikro-orm/postgresql";
import { creaApp } from "./app.js";
import { caricaEnv, EnvNonValidaError } from "./config/env.js";
import { creaConfigOrm } from "./db/mikro-orm.config.js";
import { creaLogger } from "./lib/logger.js";
import { creaRedis } from "./lib/redis.js";
import { creaOpenFoodFacts } from "./modules/catalogo/open-food-facts.js";

let env;
try {
  env = caricaEnv();
} catch (err) {
  if (!(err instanceof EnvNonValidaError)) throw err;
  console.error(err.message);
  process.exit(1);
}

const logger = creaLogger(env);
const orm = await MikroORM.init(creaConfigOrm(env));
const redis = creaRedis(env);
redis.on("error", (err) => logger.warn({ err }, "redis non raggiungibile"));
await redis.connect().catch((err) => logger.warn({ err }, "connessione redis fallita all'avvio"));

const provider = creaOpenFoodFacts({
  baseUrl: env.OFF_BASE_URL,
  userAgent: `CaloriesDiary/${env.APP_VERSION} (${env.OFF_CONTATTO})`,
  logger,
});

const server = creaApp({ env, orm, redis, logger, provider }).listen(env.PORT, () => {
  logger.info({ port: env.PORT, versione: env.APP_VERSION }, "API in ascolto");
});

let inChiusura = false;
async function chiudi(segnale: string) {
  if (inChiusura) return;
  inChiusura = true;
  logger.info({ segnale }, "chiusura in corso");
  const timeout = setTimeout(() => {
    logger.error("chiusura non completata in 10s, uscita forzata");
    process.exit(1);
  }, 10_000).unref();

  server.close();
  server.closeIdleConnections();
  await Promise.allSettled([orm.close(), redis.quit()]);
  clearTimeout(timeout);
  logger.info("chiusura completata");
  process.exit(0);
}

process.on("SIGTERM", () => void chiudi("SIGTERM"));
process.on("SIGINT", () => void chiudi("SIGINT"));

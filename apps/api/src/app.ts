import { RequestContext, type MikroORM } from "@mikro-orm/postgresql";
import express, { type Express } from "express";
import helmet from "helmet";
import type { Redis } from "ioredis";
import type { Logger } from "pino";
import { pinoHttp } from "pino-http";
import type { Env } from "./config/env.js";
import { richiediAutenticazione } from "./middlewares/autenticazione.js";
import { corsConOrigini } from "./middlewares/cors.js";
import { gestoreErrori, rottaNonTrovata } from "./middlewares/errori.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { creaGestoreToken } from "./modules/auth/token.js";
import { catalogoRouter } from "./modules/catalogo/catalogo.routes.js";
import type { ProviderAlimenti } from "./modules/catalogo/provider.js";
import { healthRouter } from "./modules/health/health.routes.js";
import { pastiRouter } from "./modules/pasti/pasti.routes.js";

export interface DipendenzeApp {
  env: Env;
  orm: MikroORM;
  redis: Redis;
  logger: Logger;
  /** External food data source (Open Food Facts; a fake one in tests). */
  provider: ProviderAlimenti;
}

/** Builds the Express app without listening, so tests can use it with supertest. */
export function creaApp({ env, orm, redis, logger, provider }: DipendenzeApp): Express {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(corsConOrigini(env.CORS_ORIGINS));
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === "/health" } }));
  app.use(express.json({ limit: "1mb" }));

  app.use(healthRouter({ orm, redis, versione: env.APP_VERSION }));

  // One EntityManager fork per request: orm.em resolves to it inside the context.
  app.use((_req, _res, next) => RequestContext.create(orm.em, next));
  const gestore = creaGestoreToken(env.JWT_SECRET);
  const autenticazione = richiediAutenticazione(orm.em, gestore);
  app.use("/auth", authRouter({ em: orm.em, redis, logger, gestore, autenticazione }));
  app.use("/pasti", autenticazione, pastiRouter(orm.em));
  app.use("/catalogo", autenticazione, catalogoRouter({ em: orm.em, redis, logger, provider }));

  app.use(rottaNonTrovata);
  app.use(gestoreErrori);
  return app;
}

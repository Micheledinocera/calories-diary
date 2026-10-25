import type { MikroORM } from "@mikro-orm/postgresql";
import type { Health } from "@calories-diary/shared";
import { Router } from "express";
import type { Redis } from "ioredis";

/** Used by Docker HEALTHCHECK, Render and the deploy smoke test: 200 if DB and Redis answer, 503 otherwise. */
export function healthRouter(deps: { orm: MikroORM; redis: Redis; versione: string }): Router {
  const router = Router();

  router.get("/health", async (_req, res) => {
    const [db, redis] = await Promise.all([
      // A real query: MikroORM connects lazily, checkConnection() is false before the first query.
      deps.orm.em
        .getConnection()
        .execute("select 1")
        .then(
          () => true,
          () => false,
        ),
      deps.redis.ping().then(
        (r) => r === "PONG",
        () => false,
      ),
    ]);
    const body: Health = {
      stato: db && redis ? "ok" : "errore",
      db: db ? "ok" : "errore",
      redis: redis ? "ok" : "errore",
      versione: deps.versione,
    };
    res.status(body.stato === "ok" ? 200 : 503).json(body);
  });

  return router;
}

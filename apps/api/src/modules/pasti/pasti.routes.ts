import type { EntityManager } from "@mikro-orm/postgresql";
import { Router } from "express";
import { z } from "zod";
import { utenteCorrente } from "../../middlewares/autenticazione.js";
import { datiValidati, valida } from "../../middlewares/valida.js";
import { creaPastiService } from "./pasti.service.js";

const parametriPasto = z.object({ id: z.uuid() });

/** Mounted behind `richiediAutenticazione`: every route works on the current user's meals. */
export function pastiRouter(em: EntityManager): Router {
  const service = creaPastiService(em);
  const router = Router();

  router.get("/", async (_req, res) => {
    res.json(await service.elenca(utenteCorrente(res).id));
  });

  router.get("/:id", valida({ params: parametriPasto }), async (_req, res) => {
    const { id } = datiValidati<typeof parametriPasto>(res, "params");
    res.json(await service.trova(utenteCorrente(res).id, id));
  });

  return router;
}

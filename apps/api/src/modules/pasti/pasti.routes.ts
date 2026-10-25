import type { EntityManager } from "@mikro-orm/postgresql";
import { Router } from "express";
import { z } from "zod";
import { datiValidati, valida } from "../../middlewares/valida.js";
import { creaPastiService } from "./pasti.service.js";

const parametriPasto = z.object({ id: z.uuid() });

export function pastiRouter(em: EntityManager): Router {
  const service = creaPastiService(em);
  const router = Router();

  router.get("/", async (_req, res) => {
    res.json(await service.elenca());
  });

  router.get("/:id", valida({ params: parametriPasto }), async (_req, res) => {
    const { id } = datiValidati<typeof parametriPasto>(res, "params");
    res.json(await service.trova(id));
  });

  return router;
}

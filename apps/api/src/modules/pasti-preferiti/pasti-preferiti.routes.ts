import { filtriPastiPreferitiSchema, nuovoPastoPreferitoSchema } from "@calories-diary/shared";
import type { EntityManager } from "@mikro-orm/postgresql";
import { Router } from "express";
import { z } from "zod";
import { utenteCorrente } from "../../middlewares/autenticazione.js";
import { datiValidati, valida } from "../../middlewares/valida.js";
import { creaPastiPreferitiService } from "./pasti-preferiti.service.js";

const parametriId = z.object({ id: z.uuid() });

/** Mounted behind `richiediAutenticazione`. Shared among users: only the author writes. */
export function pastiPreferitiRouter(em: EntityManager): Router {
  const service = creaPastiPreferitiService(em);
  const router = Router();

  router.get("/", valida({ query: filtriPastiPreferitiSchema }), async (_req, res) => {
    const filtri = datiValidati<typeof filtriPastiPreferitiSchema>(res, "query");
    res.json(await service.elenca(utenteCorrente(res).id, filtri));
  });

  router.get("/:id", valida({ params: parametriId }), async (_req, res) => {
    const { id } = datiValidati<typeof parametriId>(res, "params");
    res.json(await service.trova(utenteCorrente(res).id, id));
  });

  router.post("/", valida({ body: nuovoPastoPreferitoSchema }), async (_req, res) => {
    const dati = datiValidati<typeof nuovoPastoPreferitoSchema>(res, "body");
    res.status(201).json(await service.crea(utenteCorrente(res).id, dati));
  });

  router.put(
    "/:id",
    valida({ params: parametriId, body: nuovoPastoPreferitoSchema }),
    async (_req, res) => {
      const { id } = datiValidati<typeof parametriId>(res, "params");
      const dati = datiValidati<typeof nuovoPastoPreferitoSchema>(res, "body");
      res.json(await service.modifica(utenteCorrente(res).id, id, dati));
    },
  );

  router.delete("/:id", valida({ params: parametriId }), async (_req, res) => {
    const { id } = datiValidati<typeof parametriId>(res, "params");
    await service.elimina(utenteCorrente(res).id, id);
    res.status(204).end();
  });

  return router;
}

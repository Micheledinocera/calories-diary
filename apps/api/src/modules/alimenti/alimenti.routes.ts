import {
  filtriAlimentiSchema,
  modificaAlimentoSchema,
  nuovoAlimentoSchema,
} from "@calories-diary/shared";
import type { EntityManager } from "@mikro-orm/postgresql";
import { Router } from "express";
import { z } from "zod";
import { utenteCorrente } from "../../middlewares/autenticazione.js";
import { datiValidati, valida } from "../../middlewares/valida.js";
import { creaAlimentiService } from "./alimenti.service.js";

const parametriAlimento = z.object({ id: z.uuid() });

/** Mounted behind `richiediAutenticazione`: the pool is shared, archive and use are per user. */
export function alimentiRouter(em: EntityManager): Router {
  const service = creaAlimentiService(em);
  const router = Router();

  router.get("/", valida({ query: filtriAlimentiSchema }), async (_req, res) => {
    const filtri = datiValidati<typeof filtriAlimentiSchema>(res, "query");
    res.json(await service.elenca(utenteCorrente(res).id, filtri));
  });

  router.post("/", valida({ body: nuovoAlimentoSchema }), async (_req, res) => {
    const dati = datiValidati<typeof nuovoAlimentoSchema>(res, "body");
    res.status(201).json(await service.crea(utenteCorrente(res).id, dati));
  });

  router.get("/:id", valida({ params: parametriAlimento }), async (_req, res) => {
    const { id } = datiValidati<typeof parametriAlimento>(res, "params");
    res.json(await service.trova(utenteCorrente(res).id, id));
  });

  router.patch(
    "/:id",
    valida({ params: parametriAlimento, body: modificaAlimentoSchema }),
    async (_req, res) => {
      const { id } = datiValidati<typeof parametriAlimento>(res, "params");
      const dati = datiValidati<typeof modificaAlimentoSchema>(res, "body");
      res.json(await service.modifica(utenteCorrente(res).id, id, dati));
    },
  );

  router.delete("/:id", valida({ params: parametriAlimento }), async (_req, res) => {
    const { id } = datiValidati<typeof parametriAlimento>(res, "params");
    await service.elimina(utenteCorrente(res).id, id);
    res.status(204).end();
  });

  return router;
}

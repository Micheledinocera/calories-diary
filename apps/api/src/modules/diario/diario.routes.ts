import {
  giornoSchema,
  intervalloGiorniSchema,
  modificaVoceSchema,
  nuovaVoceSchema,
  nuovoPastoSchema,
  ordinePastiSchema,
} from "@calories-diary/shared";
import type { EntityManager } from "@mikro-orm/postgresql";
import { Router } from "express";
import { z } from "zod";
import { utenteCorrente } from "../../middlewares/autenticazione.js";
import { datiValidati, valida } from "../../middlewares/valida.js";
import { creaDiarioService } from "./diario.service.js";

const parametriGiorno = z.object({ giorno: giornoSchema });
const parametriId = z.object({ id: z.uuid() });

/**
 * Mounted behind `richiediAutenticazione`: every route works on the current user's diary.
 * Every write answers with the whole updated day (`Giornata`), totals included.
 */
export function diarioRouter(em: EntityManager): Router {
  const service = creaDiarioService(em);
  const router = Router();

  router.get("/", valida({ query: intervalloGiorniSchema }), async (_req, res) => {
    const { da, a } = datiValidati<typeof intervalloGiorniSchema>(res, "query");
    res.json(await service.riepiloghi(utenteCorrente(res).id, da, a));
  });

  router.get("/:giorno", valida({ params: parametriGiorno }), async (_req, res) => {
    const { giorno } = datiValidati<typeof parametriGiorno>(res, "params");
    res.json(await service.giornata(utenteCorrente(res).id, giorno));
  });

  router.post(
    "/:giorno/pasti",
    valida({ params: parametriGiorno, body: nuovoPastoSchema }),
    async (_req, res) => {
      const { giorno } = datiValidati<typeof parametriGiorno>(res, "params");
      const { tipo, voci } = datiValidati<typeof nuovoPastoSchema>(res, "body");
      res.json(await service.aggiungiPasto(utenteCorrente(res).id, giorno, tipo, voci));
    },
  );

  router.put(
    "/:giorno/ordine",
    valida({ params: parametriGiorno, body: ordinePastiSchema }),
    async (_req, res) => {
      const { giorno } = datiValidati<typeof parametriGiorno>(res, "params");
      const { pasti } = datiValidati<typeof ordinePastiSchema>(res, "body");
      res.json(await service.ordina(utenteCorrente(res).id, giorno, pasti));
    },
  );

  router.delete("/pasti/:id", valida({ params: parametriId }), async (_req, res) => {
    const { id } = datiValidati<typeof parametriId>(res, "params");
    res.json(await service.eliminaPasto(utenteCorrente(res).id, id));
  });

  router.post(
    "/pasti/:id/voci",
    valida({ params: parametriId, body: nuovaVoceSchema }),
    async (_req, res) => {
      const { id } = datiValidati<typeof parametriId>(res, "params");
      const voce = datiValidati<typeof nuovaVoceSchema>(res, "body");
      res.json(await service.aggiungiVoce(utenteCorrente(res).id, id, voce));
    },
  );

  router.patch(
    "/voci/:id",
    valida({ params: parametriId, body: modificaVoceSchema }),
    async (_req, res) => {
      const { id } = datiValidati<typeof parametriId>(res, "params");
      const { quantita } = datiValidati<typeof modificaVoceSchema>(res, "body");
      res.json(await service.modificaVoce(utenteCorrente(res).id, id, quantita));
    },
  );

  router.delete("/voci/:id", valida({ params: parametriId }), async (_req, res) => {
    const { id } = datiValidati<typeof parametriId>(res, "params");
    res.json(await service.eliminaVoce(utenteCorrente(res).id, id));
  });

  return router;
}

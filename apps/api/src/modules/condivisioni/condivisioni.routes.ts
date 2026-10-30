import { nuovaCondivisioneSchema } from "@calories-diary/shared";
import type { EntityManager } from "@mikro-orm/postgresql";
import { Router } from "express";
import { z } from "zod";
import { utenteCorrente } from "../../middlewares/autenticazione.js";
import { datiValidati, valida } from "../../middlewares/valida.js";
import { creaCondivisioniService } from "./condivisioni.service.js";

const parametriId = z.object({ id: z.uuid() });
const parametriToken = z.object({ token: z.string().max(64) });

/** Mounted behind `richiediAutenticazione`: the links of the current user. */
export function condivisioniRouter(em: EntityManager): Router {
  const service = creaCondivisioniService(em);
  const router = Router();

  router.get("/", async (_req, res) => {
    res.json(await service.elenco(utenteCorrente(res).id));
  });

  router.post("/", valida({ body: nuovaCondivisioneSchema }), async (_req, res) => {
    const dati = datiValidati<typeof nuovaCondivisioneSchema>(res, "body");
    res.status(201).json(await service.crea(utenteCorrente(res).id, dati));
  });

  router.delete("/:id", valida({ params: parametriId }), async (_req, res) => {
    const { id } = datiValidati<typeof parametriId>(res, "params");
    await service.revoca(utenteCorrente(res).id, id);
    res.status(204).end();
  });

  return router;
}

/** Mounted without authentication: the token in the link is the only credential. */
export function pubblicoRouter(em: EntityManager): Router {
  const service = creaCondivisioniService(em);
  const router = Router();

  router.get("/:token", valida({ params: parametriToken }), async (_req, res) => {
    const { token } = datiValidati<typeof parametriToken>(res, "params");
    const vista = await service.vista(token);
    // A revoked link must stop working at once, also for those who already opened it.
    res.set("Cache-Control", "no-store").json(vista);
  });

  return router;
}

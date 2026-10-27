import { modificaUtenteSchema, nuovoUtenteSchema } from "@calories-diary/shared";
import type { EntityManager } from "@mikro-orm/postgresql";
import { Router } from "express";
import { z } from "zod";
import { utenteCorrente } from "../../middlewares/autenticazione.js";
import { datiValidati, valida } from "../../middlewares/valida.js";
import { creaUtentiService } from "./utenti.service.js";

const parametriUtente = z.object({ id: z.uuid() });

/**
 * Mounted behind `richiediAutenticazione` and `richiediAdmin`: user management.
 * The admin sees users, not their diaries.
 */
export function utentiRouter(em: EntityManager): Router {
  const router = Router();
  const utenti = creaUtentiService(em);

  router.get("/", async (_req, res) => {
    res.json(await utenti.lista());
  });

  router.post("/", valida({ body: nuovoUtenteSchema }), async (_req, res) => {
    const { username, password } = datiValidati<typeof nuovoUtenteSchema>(res, "body");
    res.status(201).json(await utenti.crea(username, password));
  });

  router.patch(
    "/:id",
    valida({ params: parametriUtente, body: modificaUtenteSchema }),
    async (_req, res) => {
      const { id } = datiValidati<typeof parametriUtente>(res, "params");
      res.json(await utenti.modifica(id, datiValidati<typeof modificaUtenteSchema>(res, "body")));
    },
  );

  router.delete("/:id", valida({ params: parametriUtente }), async (_req, res) => {
    const { id } = datiValidati<typeof parametriUtente>(res, "params");
    await utenti.elimina(id, utenteCorrente(res).id);
    res.status(204).end();
  });

  return router;
}

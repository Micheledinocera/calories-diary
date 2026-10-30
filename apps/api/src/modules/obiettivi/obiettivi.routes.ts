import { obiettiviSchema, type Obiettivi } from "@calories-diary/shared";
import type { EntityManager } from "@mikro-orm/postgresql";
import { Router } from "express";
import { utenteCorrente } from "../../middlewares/autenticazione.js";
import { datiValidati, valida } from "../../middlewares/valida.js";
import { Utente } from "../utenti/utente.entity.js";

export const versoDtoObiettivi = (u: Utente): Obiettivi => ({
  fabbisogno: u.fabbisogno ?? null,
  ripartizione: {
    carboidrati: u.quotaCarboidrati,
    grassi: u.quotaGrassi,
    proteine: u.quotaProteine,
  },
});

/**
 * Mounted behind `richiediAutenticazione`: the current user's goals, one value per user.
 * They apply to every day, past ones included (no history yet).
 */
export function obiettiviRouter(em: EntityManager): Router {
  const router = Router();
  const carica = (res: Parameters<typeof utenteCorrente>[0]) =>
    em.findOneOrFail(Utente, { id: utenteCorrente(res).id });

  router.get("/", async (_req, res) => {
    res.json(versoDtoObiettivi(await carica(res)));
  });

  router.put("/", valida({ body: obiettiviSchema }), async (_req, res) => {
    const { fabbisogno, ripartizione } = datiValidati<typeof obiettiviSchema>(res, "body");
    const utente = await carica(res);
    em.assign(utente, {
      fabbisogno,
      quotaCarboidrati: ripartizione.carboidrati,
      quotaGrassi: ripartizione.grassi,
      quotaProteine: ripartizione.proteine,
    });
    await em.flush();
    res.json(versoDtoObiettivi(utente));
  });

  return router;
}

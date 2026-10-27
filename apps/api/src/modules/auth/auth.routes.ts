import type { EntityManager } from "@mikro-orm/postgresql";
import {
  cambioPasswordSchema,
  credenzialiSchema,
  modificaProfiloSchema,
  type Sessione,
} from "@calories-diary/shared";
import { Router, type RequestHandler } from "express";
import type { Redis } from "ioredis";
import type { Logger } from "pino";
import { ErroreApp } from "../../lib/errori.js";
import { hashPassword, verificaPassword } from "../../lib/password.js";
import { utenteCorrente } from "../../middlewares/autenticazione.js";
import { datiValidati, valida } from "../../middlewares/valida.js";
import { chiaveUsername, Utente } from "../utenti/utente.entity.js";
import { creaUtentiService, versoDtoUtente } from "../utenti/utenti.service.js";
import { creaLimiteLogin } from "./limite-login.js";
import type { GestoreToken } from "./token.js";

// Compared when the username does not exist, so the response time does not reveal registered users.
const hashFittizio = hashPassword("password-fittizia");

export function authRouter(deps: {
  em: EntityManager;
  redis: Redis;
  logger: Logger;
  gestore: GestoreToken;
  autenticazione: RequestHandler;
}): Router {
  const { em, gestore, autenticazione } = deps;
  const limiteLogin = creaLimiteLogin(deps.redis, deps.logger);
  const limitePassword = creaLimiteLogin(deps.redis, deps.logger, "password");
  const utenti = creaUtentiService(em);
  const router = Router();

  async function sessione(utente: Utente): Promise<Sessione> {
    const { token, scadeIl } = await gestore.firma({
      utenteId: utente.id,
      versione: utente.versioneSessione,
    });
    return { token, scadeIl: scadeIl.toISOString(), utente: versoDtoUtente(utente) };
  }

  router.post("/login", valida({ body: credenzialiSchema }), async (req, res) => {
    const { username, password } = datiValidati<typeof credenzialiSchema>(res, "body");
    const chiave = chiaveUsername(username);
    await limiteLogin.registraTentativo(chiave, req.ip ?? "sconosciuto");

    const utente = await em.findOne(Utente, { chiaveUsername: chiave });
    const passwordCorretta = await verificaPassword(
      password,
      utente?.passwordHash ?? (await hashFittizio),
    );
    if (!utente || !passwordCorretta) {
      throw new ErroreApp(401, "CREDENZIALI_ERRATE", "Username o password errati");
    }
    await limiteLogin.azzera(chiave);
    res.json(await sessione(utente));
  });

  /** Sliding expiry: a valid token is exchanged for a new one-week token. */
  router.post("/rinnova", autenticazione, async (_req, res) => {
    res.json(await sessione(await em.findOneOrFail(Utente, { id: utenteCorrente(res).id })));
  });

  router.get("/io", autenticazione, (_req, res) => {
    res.json(utenteCorrente(res));
  });

  /** The user changes their own username (the email has no UI yet). */
  router.patch(
    "/io",
    autenticazione,
    valida({ body: modificaProfiloSchema }),
    async (_req, res) => {
      const { username } = datiValidati<typeof modificaProfiloSchema>(res, "body");
      res.json(await utenti.modifica(utenteCorrente(res).id, { username }));
    },
  );

  /**
   * The user changes their own password with the current one. The other devices are logged out;
   * this one gets a new session.
   */
  router.put(
    "/password",
    autenticazione,
    valida({ body: cambioPasswordSchema }),
    async (req, res) => {
      const { id } = utenteCorrente(res);
      const { passwordAttuale, nuovaPassword } = datiValidati<typeof cambioPasswordSchema>(
        res,
        "body",
      );
      await limitePassword.registraTentativo(id, req.ip ?? "sconosciuto");
      const utente = await utenti.cambiaPassword(id, passwordAttuale, nuovaPassword);
      await limitePassword.azzera(id);
      res.json(await sessione(utente));
    },
  );

  return router;
}

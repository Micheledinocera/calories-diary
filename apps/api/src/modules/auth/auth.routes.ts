import type { EntityManager } from "@mikro-orm/postgresql";
import { credenzialiSchema, type Sessione, type Utente as UtenteDto } from "@calories-diary/shared";
import { Router, type RequestHandler } from "express";
import type { Redis } from "ioredis";
import type { Logger } from "pino";
import { ErroreApp } from "../../lib/errori.js";
import { hashPassword, verificaPassword } from "../../lib/password.js";
import { utenteCorrente } from "../../middlewares/autenticazione.js";
import { datiValidati, valida } from "../../middlewares/valida.js";
import { Utente } from "../utenti/utente.entity.js";
import { versoDtoUtente } from "../utenti/utenti.service.js";
import { creaLimiteLogin } from "./limite-login.js";
import type { GestoreToken } from "./token.js";

// Compared when the email does not exist, so the response time does not reveal registered emails.
const hashFittizio = hashPassword("password-fittizia");

export function authRouter(deps: {
  em: EntityManager;
  redis: Redis;
  logger: Logger;
  gestore: GestoreToken;
  autenticazione: RequestHandler;
}): Router {
  const { em, gestore, autenticazione } = deps;
  const limite = creaLimiteLogin(deps.redis, deps.logger);
  const router = Router();

  async function sessione(utente: UtenteDto): Promise<Sessione> {
    const { token, scadeIl } = await gestore.firma(utente.id);
    return { token, scadeIl: scadeIl.toISOString(), utente };
  }

  router.post("/login", valida({ body: credenzialiSchema }), async (req, res) => {
    const { email, password } = datiValidati<typeof credenzialiSchema>(res, "body");
    await limite.registraTentativo(email, req.ip ?? "sconosciuto");

    const utente = await em.findOne(Utente, { email });
    const passwordCorretta = await verificaPassword(
      password,
      utente?.passwordHash ?? (await hashFittizio),
    );
    if (!utente || !passwordCorretta) {
      throw new ErroreApp(401, "CREDENZIALI_ERRATE", "Email o password errate");
    }
    await limite.azzera(email);
    res.json(await sessione(versoDtoUtente(utente)));
  });

  /** Sliding expiry: a valid token is exchanged for a new one-week token. */
  router.post("/rinnova", autenticazione, async (_req, res) => {
    res.json(await sessione(utenteCorrente(res)));
  });

  router.get("/io", autenticazione, (_req, res) => {
    res.json(utenteCorrente(res));
  });

  return router;
}

import type { EntityManager } from "@mikro-orm/postgresql";
import type { Utente as UtenteDto } from "@calories-diary/shared";
import type { RequestHandler, Response } from "express";
import { ErroreApp } from "../lib/errori.js";
import type { GestoreToken } from "../modules/auth/token.js";
import { Utente } from "../modules/utenti/utente.entity.js";
import { versoDtoUtente } from "../modules/utenti/utenti.service.js";

export const nonAutenticato = () =>
  new ErroreApp(401, "NON_AUTENTICATO", "Accesso richiesto o sessione scaduta");

/**
 * Requires `Authorization: Bearer <token>` with a valid token of an existing user.
 * The user goes to `res.locals.utente`; read it with `utenteCorrente`.
 */
export function richiediAutenticazione(em: EntityManager, gestore: GestoreToken): RequestHandler {
  return async (req, res, next) => {
    const [schema, token] = req.headers.authorization?.split(" ") ?? [];
    if (schema !== "Bearer" || !token) throw nonAutenticato();
    const id = await gestore.verifica(token);
    // A deleted user loses access even with a token not yet expired.
    const utente = id && (await em.findOne(Utente, { id }));
    if (!utente) throw nonAutenticato();
    res.locals.utente = versoDtoUtente(utente);
    next();
  };
}

export function utenteCorrente(res: Response): UtenteDto {
  return res.locals.utente as UtenteDto;
}

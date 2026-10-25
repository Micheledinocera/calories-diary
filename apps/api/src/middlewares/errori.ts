import type { ErroreApi } from "@calories-diary/shared";
import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { ErroreApp } from "../lib/errori.js";

export const rottaNonTrovata: RequestHandler = (req, _res, next) => {
  next(new ErroreApp(404, "NON_TROVATO", `Rotta non trovata: ${req.method} ${req.path}`));
};

/** Centralized error handler: every error becomes an `ErroreApi` JSON body. */
export const gestoreErrori: ErrorRequestHandler = (err, req, res, _next) => {
  let status = 500;
  let body: ErroreApi = { errore: { codice: "ERRORE_INTERNO", messaggio: "Errore interno" } };

  if (err instanceof ErroreApp) {
    status = err.status;
    body = { errore: { codice: err.codice, messaggio: err.message, dettagli: err.dettagli } };
  } else if (err instanceof ZodError) {
    status = 400;
    body = {
      errore: { codice: "VALIDAZIONE", messaggio: "Richiesta non valida", dettagli: err.issues },
    };
  } else if (err?.type === "entity.parse.failed") {
    status = 400;
    body = { errore: { codice: "JSON_NON_VALIDO", messaggio: "Body JSON non valido" } };
  }

  if (status >= 500) req.log.error({ err }, "errore non gestito");
  res.status(status).json(body);
};

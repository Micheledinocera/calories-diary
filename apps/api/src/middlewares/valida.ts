import type { RequestHandler, Response } from "express";
import type { z } from "zod";

type Parte = "body" | "query" | "params";
type Schemi = Partial<Record<Parte, z.ZodType>>;

/**
 * Validates request parts with zod. Parsed values go to `res.locals.validato`
 * (Express 5 `req.query` is read-only); read them with `datiValidati`.
 * A ZodError is turned into a 400 by the error handler.
 */
export function valida(schemi: Schemi): RequestHandler {
  return (req, res, next) => {
    const validato: Partial<Record<Parte, unknown>> = {};
    for (const parte of Object.keys(schemi) as Parte[]) {
      validato[parte] = schemi[parte]!.parse(req[parte]);
    }
    res.locals.validato = validato;
    next();
  };
}

export function datiValidati<S extends z.ZodType>(res: Response, parte: Parte): z.infer<S> {
  return res.locals.validato[parte] as z.infer<S>;
}

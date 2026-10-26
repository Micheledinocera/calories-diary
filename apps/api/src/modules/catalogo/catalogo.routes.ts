import { Router } from "express";
import { z } from "zod";
import { datiValidati, valida } from "../../middlewares/valida.js";
import { normalizzaBarcode } from "./barcode.js";
import { creaCatalogoService, type DipendenzeCatalogo } from "./catalogo.service.js";

// Leading zeros do not count: the limit applies to the normalized code (column length).
const parametriBarcode = z.object({
  codice: z
    .string()
    .regex(/^\d{1,20}$/, "solo cifre")
    .transform(normalizzaBarcode)
    .refine((c) => /[1-9]/.test(c) && c.length <= 14, "codice a barre non valido"),
});

/** Mounted behind `richiediAutenticazione`. The catalog is shared by every user. */
export function catalogoRouter(dipendenze: DipendenzeCatalogo): Router {
  const service = creaCatalogoService(dipendenze);
  const router = Router();

  router.get("/barcode/:codice", valida({ params: parametriBarcode }), async (_req, res) => {
    const { codice } = datiValidati<typeof parametriBarcode>(res, "params");
    res.json(await service.cercaBarcode(codice));
  });

  return router;
}

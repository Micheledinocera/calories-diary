import { UniqueConstraintViolationException, type FilterQuery } from "@mikro-orm/core";
import type { EntityManager } from "@mikro-orm/postgresql";
import type {
  Alimento as AlimentoDto,
  OrdineAlimenti,
  filtriAlimentiSchema,
  modificaAlimentoSchema,
  nuovoAlimentoSchema,
} from "@calories-diary/shared";
import type { z } from "zod";
import { ErroreApp, nonTrovato } from "../../lib/errori.js";
import { kcalIncoerenti } from "../catalogo/avvisi.js";
import { normalizzaBarcode } from "../catalogo/barcode.js";
import { ProdottoCatalogo } from "../catalogo/prodotto-catalogo.entity.js";
import { Alimento } from "./alimento.entity.js";
import { Porzione } from "./porzione.entity.js";

type DatiNuovoAlimento = z.output<typeof nuovoAlimentoSchema>;
type DatiModifica = z.output<typeof modificaAlimentoSchema>;
type Filtri = z.output<typeof filtriAlimentiSchema>;

const alimentoNonTrovato = () => nonTrovato("Alimento non trovato");

const versoDto = (a: Alimento): AlimentoDto => {
  const valoriPer100 = {
    kcal: a.kcal,
    proteine: a.proteine,
    carboidrati: a.carboidrati,
    grassi: a.grassi,
  };
  return {
    id: a.id,
    nome: a.nome,
    marca: a.marca ?? null,
    barcode: a.barcode ?? null,
    fonte: a.fonte,
    unitaBase: a.unitaBase,
    valoriPer100,
    porzioni: a.porzioni
      .getItems()
      .map(({ id, nome, quantita, predefinita }) => ({ id, nome, quantita, predefinita })),
    verificato: a.verificato,
    archiviato: a.archiviato,
    ultimoUso: a.ultimoUso?.toISOString() ?? null,
    utilizzi: a.utilizzi,
    avvisi: kcalIncoerenti(valoriPer100) ? ["KCAL_INCOERENTI"] : [],
    importatoIl: a.importatoIl?.toISOString() ?? null,
    aggiornatoIl: a.aggiornatoIl.toISOString(),
  };
};

const ordinamenti: Record<OrdineAlimenti, Record<string, "asc" | "desc" | "desc nulls last">> = {
  uso: { utilizzi: "desc", ultimoUso: "desc nulls last", nome: "asc" },
  recenti: { ultimoUso: "desc nulls last", nome: "asc" },
  nome: { nome: "asc" },
};

/** `%` and `_` typed by the user are literal characters in the search. */
const escapeLike = (testo: string) => testo.replace(/[\\%_]/g, (c) => `\\${c}`);

export function creaAlimentiService(em: EntityManager) {
  async function carica(utenteId: string, id: string): Promise<Alimento> {
    const alimento = await em.findOne(
      Alimento,
      { id, utente: utenteId },
      { populate: ["porzioni"] },
    );
    // Another user's food is "not found", to avoid revealing that it exists.
    if (!alimento) throw alimentoNonTrovato();
    return alimento;
  }

  function impostaPorzioni(alimento: Alimento, porzioni: DatiNuovoAlimento["porzioni"]) {
    alimento.porzioni.set(porzioni.map((dati) => em.create(Porzione, { ...dati, alimento })));
  }

  /** The barcode is unique per user: a second food with the same code is a 409 with its id. */
  async function salva(utenteId: string, alimento: Alimento) {
    try {
      await em.flush();
    } catch (err) {
      if (!(err instanceof UniqueConstraintViolationException)) throw err;
      em.clear();
      const esistente = await em.findOne(Alimento, {
        utente: utenteId,
        barcode: alimento.barcode,
      });
      throw new ErroreApp(
        409,
        "ALIMENTO_ESISTENTE",
        "Hai già un alimento con questo codice a barre",
        {
          id: esistente?.id,
        },
      );
    }
  }

  return {
    async elenca(utenteId: string, { q, ordine, archiviati, limite }: Filtri) {
      const filtro: FilterQuery<Alimento> = { utente: utenteId, archiviato: archiviati };
      if (q) {
        const testo = `%${escapeLike(q)}%`;
        filtro.$or = [{ nome: { $ilike: testo } }, { marca: { $ilike: testo } }];
        if (/^\d{1,20}$/.test(q)) filtro.$or.push({ barcode: normalizzaBarcode(q) });
      }
      if (ordine === "recenti") filtro.ultimoUso = { $ne: null };
      const alimenti = await em.find(Alimento, filtro, {
        populate: ["porzioni"],
        orderBy: ordinamenti[ordine],
        limit: limite,
      });
      return alimenti.map(versoDto);
    },

    async trova(utenteId: string, id: string): Promise<AlimentoDto> {
      return versoDto(await carica(utenteId, id));
    },

    /** A barcode found in the catalog links the food to that product (fonte "off"). */
    async crea(
      utenteId: string,
      { valoriPer100, porzioni, barcode, ...dati }: DatiNuovoAlimento,
    ): Promise<AlimentoDto> {
      const normalizzato = barcode ? normalizzaBarcode(barcode) : null;
      const prodotto = normalizzato
        ? await em.findOne(ProdottoCatalogo, { barcode: normalizzato })
        : null;
      const alimento = em.create(Alimento, {
        ...dati,
        ...valoriPer100,
        utente: utenteId,
        barcode: normalizzato,
        fonte: prodotto ? "off" : "manuale",
        prodottoCatalogo: prodotto,
        importatoIl: prodotto ? new Date() : null,
      });
      impostaPorzioni(alimento, porzioni);
      await salva(utenteId, alimento);
      return versoDto(alimento);
    },

    async modifica(
      utenteId: string,
      id: string,
      { valoriPer100, porzioni, ...dati }: DatiModifica,
    ): Promise<AlimentoDto> {
      const alimento = await carica(utenteId, id);
      em.assign(alimento, { ...dati, ...valoriPer100 });
      if (porzioni) impostaPorzioni(alimento, porzioni);
      await salva(utenteId, alimento);
      return versoDto(alimento);
    },

    /** Foods used in the diary are archived, not deleted: their history must stay. */
    async elimina(utenteId: string, id: string): Promise<void> {
      const alimento = await carica(utenteId, id);
      if (alimento.utilizzi > 0) {
        throw new ErroreApp(409, "ALIMENTO_IN_USO", "Alimento già usato nel diario: archivialo");
      }
      await em.remove(alimento).flush();
    },
  };
}

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
import { escapeLike } from "../../lib/testo.js";
import { kcalIncoerenti } from "../catalogo/avvisi.js";
import { normalizzaBarcode } from "../catalogo/barcode.js";
import { ProdottoCatalogo } from "../catalogo/prodotto-catalogo.entity.js";
import { Alimento } from "./alimento.entity.js";
import { Porzione } from "./porzione.entity.js";
import { inUso, usoDi, usoPer } from "./uso.js";
import type { UsoAlimento } from "./uso-alimento.entity.js";

type DatiNuovoAlimento = z.output<typeof nuovoAlimentoSchema>;
type DatiModifica = z.output<typeof modificaAlimentoSchema>;
type Filtri = z.output<typeof filtriAlimentiSchema>;

const alimentoNonTrovato = () => nonTrovato("Alimento non trovato");

const populate = ["porzioni", "usi", "vociPreferite"] as const;

/** The food as `utenteId` sees it: archive and use are theirs. `usi` must be populated. */
const versoDto = (a: Alimento, utenteId: string): AlimentoDto => {
  const uso = usoDi(a, utenteId);
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
    archiviato: uso?.archiviato ?? false,
    ultimoUso: uso?.ultimoUso?.toISOString() ?? null,
    utilizzi: uso?.utilizzi ?? 0,
    eliminabile: a.autore?.id === utenteId && !inUso(a),
    avvisi: kcalIncoerenti(valoriPer100) ? ["KCAL_INCOERENTI"] : [],
    importatoIl: a.importatoIl?.toISOString() ?? null,
    aggiornatoIl: a.aggiornatoIl.toISOString(),
  };
};

interface Riga {
  alimento: Alimento;
  uso: UsoAlimento | undefined;
}

const perNome = (x: Riga, y: Riga) => x.alimento.nome.localeCompare(y.alimento.nome, "it");
// Never used sorts last; two unused foods give NaN, which `||` skips like a tie.
const tempo = (r: Riga) => r.uso?.ultimoUso?.getTime() ?? -Infinity;

const ordinamenti: Record<OrdineAlimenti, (x: Riga, y: Riga) => number> = {
  uso: (x, y) =>
    (y.uso?.utilizzi ?? 0) - (x.uso?.utilizzi ?? 0) || tempo(y) - tempo(x) || perNome(x, y),
  recenti: (x, y) => tempo(y) - tempo(x) || perNome(x, y),
  nome: perNome,
};

export function creaAlimentiService(em: EntityManager) {
  async function carica(id: string): Promise<Alimento> {
    const alimento = await em.findOne(Alimento, { id }, { populate });
    if (!alimento) throw alimentoNonTrovato();
    return alimento;
  }

  function impostaPorzioni(alimento: Alimento, porzioni: DatiNuovoAlimento["porzioni"]) {
    alimento.porzioni.set(porzioni.map((dati) => em.create(Porzione, { ...dati, alimento })));
  }

  /** The barcode is unique in the pool: a second food with the same code is a 409 with its id. */
  async function salva(alimento: Alimento) {
    try {
      await em.flush();
    } catch (err) {
      if (!(err instanceof UniqueConstraintViolationException)) throw err;
      em.clear();
      const esistente = await em.findOne(Alimento, { barcode: alimento.barcode });
      throw new ErroreApp(
        409,
        "ALIMENTO_ESISTENTE",
        "Esiste già un alimento con questo codice a barre",
        { id: esistente?.id },
      );
    }
  }

  return {
    /**
     * Archive and use are per user, so they are filtered and sorted here, not in SQL:
     * the pool holds one household's foods, a few hundred at most.
     */
    async elenca(utenteId: string, { q, ordine, archiviati, limite }: Filtri) {
      const filtro: FilterQuery<Alimento> = {};
      if (q) {
        const testo = `%${escapeLike(q)}%`;
        filtro.$or = [{ nome: { $ilike: testo } }, { marca: { $ilike: testo } }];
        if (/^\d{1,20}$/.test(q)) filtro.$or.push({ barcode: normalizzaBarcode(q) });
      }
      const alimenti = await em.find(Alimento, filtro, { populate });
      return alimenti
        .map((alimento): Riga => ({ alimento, uso: usoDi(alimento, utenteId) }))
        .filter(({ uso }) => (uso?.archiviato ?? false) === archiviati)
        .filter(({ uso }) => ordine !== "recenti" || uso?.ultimoUso)
        .sort(ordinamenti[ordine])
        .slice(0, limite)
        .map(({ alimento }) => versoDto(alimento, utenteId));
    },

    async trova(utenteId: string, id: string): Promise<AlimentoDto> {
      return versoDto(await carica(id), utenteId);
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
        autore: utenteId,
        barcode: normalizzato,
        fonte: prodotto ? "off" : "manuale",
        prodottoCatalogo: prodotto,
        importatoIl: prodotto ? new Date() : null,
      });
      impostaPorzioni(alimento, porzioni);
      await salva(alimento);
      return versoDto(alimento, utenteId);
    },

    /** Any user can correct a food, for everyone; `archiviato` hides it only for `utenteId`. */
    async modifica(
      utenteId: string,
      id: string,
      { valoriPer100, porzioni, archiviato, ...dati }: DatiModifica,
    ): Promise<AlimentoDto> {
      const alimento = await carica(id);
      em.assign(alimento, { ...dati, ...valoriPer100 });
      if (porzioni) impostaPorzioni(alimento, porzioni);
      if (archiviato !== undefined) usoPer(em, alimento, utenteId).archiviato = archiviato;
      await salva(alimento);
      return versoDto(alimento, utenteId);
    },

    /**
     * Only the author deletes a food. A food used in any diary or favorite meal is archived
     * instead: the history must stay.
     */
    async elimina(utenteId: string, id: string): Promise<void> {
      const alimento = await carica(id);
      if (alimento.autore?.id !== utenteId) {
        throw new ErroreApp(403, "ALIMENTO_NON_TUO", "Solo chi l'ha creato può eliminarlo");
      }
      if (inUso(alimento)) {
        throw new ErroreApp(409, "ALIMENTO_IN_USO", "Alimento già in uso: archivialo");
      }
      await em.remove(alimento).flush();
    },
  };
}

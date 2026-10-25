import { UniqueConstraintViolationException } from "@mikro-orm/core";
import type { EntityManager } from "@mikro-orm/postgresql";
import type { LookupBarcode, ProdottoCatalogo as ProdottoDto } from "@calories-diary/shared";
import type { Redis } from "ioredis";
import type { Logger } from "pino";
import { ErroreApp } from "../../lib/errori.js";
import { calcolaAvvisi } from "./avvisi.js";
import { normalizzaBarcode } from "./barcode.js";
import { creaLimiteProvider } from "./limite-provider.js";
import { ProdottoCatalogo } from "./prodotto-catalogo.entity.js";
import type { ProdottoProvider, ProviderAlimenti } from "./provider.js";

// An unknown barcode scanned again does not cost another provider call for a day.
const NON_TROVATO_TTL_S = 24 * 60 * 60;

const prodottoNonTrovato = () =>
  new ErroreApp(404, "PRODOTTO_NON_TROVATO", "Nessun prodotto con questo codice a barre");

const versoDto = (p: ProdottoCatalogo): ProdottoDto => ({
  barcode: p.barcode,
  fonte: p.fonte,
  nome: p.nome ?? null,
  marca: p.marca ?? null,
  unitaBase: p.unitaBase,
  valoriPer100: {
    kcal: p.kcal ?? null,
    proteine: p.proteine ?? null,
    carboidrati: p.carboidrati ?? null,
    grassi: p.grassi ?? null,
    zuccheri: p.zuccheri ?? null,
    grassiSaturi: p.grassiSaturi ?? null,
    fibre: p.fibre ?? null,
    sale: p.sale ?? null,
  },
  porzione:
    p.porzioneQuantita == null
      ? null
      : { descrizione: p.porzioneDescrizione ?? null, quantita: p.porzioneQuantita },
  immagineUrl: p.immagineUrl ?? null,
  aggiornatoIl: p.aggiornatoIl.toISOString(),
});

const versoEntita = ({ valoriPer100, porzione, ...prodotto }: ProdottoProvider) => ({
  ...prodotto,
  ...valoriPer100,
  porzioneDescrizione: porzione?.descrizione ?? null,
  porzioneQuantita: porzione?.quantita ?? null,
});

const risposta = (prodotto: ProdottoDto, origine: LookupBarcode["origine"]): LookupBarcode => ({
  prodotto,
  origine,
  avvisi: calcolaAvvisi(prodotto.valoriPer100),
});

export interface DipendenzeCatalogo {
  em: EntityManager;
  redis: Redis;
  logger: Logger;
  provider: ProviderAlimenti;
}

export function creaCatalogoService({ em, redis, logger, provider }: DipendenzeCatalogo) {
  const limite = creaLimiteProvider(redis, logger);
  const chiaveNonTrovato = (barcode: string) => `catalogo:non-trovato:${barcode}`;

  async function giaNonTrovato(barcode: string): Promise<boolean> {
    return (await redis.exists(chiaveNonTrovato(barcode)).catch(() => 0)) === 1;
  }

  /** Saves the provider product; on a concurrent import of the same barcode, returns that one. */
  async function salva(prodotto: ProdottoProvider): Promise<ProdottoCatalogo> {
    const entita = em.create(ProdottoCatalogo, versoEntita(prodotto));
    try {
      await em.flush();
      return entita;
    } catch (err) {
      if (!(err instanceof UniqueConstraintViolationException)) throw err;
      em.clear();
      return em.findOneOrFail(ProdottoCatalogo, { barcode: prodotto.barcode });
    }
  }

  return {
    /** Our catalog first, then the provider: a product found there is saved in the catalog. */
    async cercaBarcode(codice: string): Promise<LookupBarcode> {
      const barcode = normalizzaBarcode(codice);
      const esistente = await em.findOne(ProdottoCatalogo, { barcode });
      if (esistente) return risposta(versoDto(esistente), "catalogo");
      if (await giaNonTrovato(barcode)) throw prodottoNonTrovato();

      await limite.registraChiamata();
      const trovato = await provider.cercaBarcode(barcode);
      if (!trovato) {
        await redis
          .set(chiaveNonTrovato(barcode), "1", "EX", NON_TROVATO_TTL_S)
          .catch((err) => logger.warn({ err }, "cache dei prodotti non trovati non disponibile"));
        throw prodottoNonTrovato();
      }
      return risposta(versoDto(await salva(trovato)), "provider");
    },
  };
}

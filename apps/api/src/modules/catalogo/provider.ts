import type { ProdottoCatalogo } from "@calories-diary/shared";
import { ErroreApp } from "../../lib/errori.js";

/** A provider product, already normalized: the catalog stores it as is. */
export type ProdottoProvider = Omit<ProdottoCatalogo, "aggiornatoIl"> & { idFonte: string };

/** Adapter of an external food data source. Only the back-end talks to providers. */
export interface ProviderAlimenti {
  /** null if the provider does not know the barcode; throws `ErroreApp` if it cannot answer. */
  cercaBarcode(barcode: string): Promise<ProdottoProvider | null>;
}

export const providerNonDisponibile = () =>
  new ErroreApp(503, "PROVIDER_NON_DISPONIBILE", "Il servizio dei prodotti non è raggiungibile");

export const providerOccupato = (riprovaTraS: number) =>
  new ErroreApp(429, "PROVIDER_OCCUPATO", "Troppe ricerche di prodotti, riprova tra poco", {
    riprovaTraS,
  });

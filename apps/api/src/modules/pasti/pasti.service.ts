import type { EntityManager as EntityManagerBase } from "@mikro-orm/core";
import type { EntityManager } from "@mikro-orm/postgresql";
import type { Pasto as PastoDto } from "@calories-diary/shared";
import { nonTrovato } from "../../lib/errori.js";
import type { Utente } from "../utenti/utente.entity.js";
import { Pasto } from "./pasto.entity.js";

export const pastiPredefiniti = ["Colazione", "Pranzo", "Cena", "Spuntino"];

const versoDto = ({ id, nome, ordine }: Pasto): PastoDto => ({ id, nome, ordine });

/** Persists the default meals missing for the user (flush is up to the caller). */
export function creaPastiPredefiniti(
  em: EntityManagerBase,
  utente: Utente,
  esistenti = new Set<string>(),
) {
  pastiPredefiniti.forEach((nome, ordine) => {
    if (!esistenti.has(nome)) em.create(Pasto, { utente, nome, ordine });
  });
}

export function creaPastiService(em: EntityManager) {
  return {
    async elenca(utenteId: string): Promise<PastoDto[]> {
      const pasti = await em.find(Pasto, { utente: utenteId }, { orderBy: { ordine: "asc" } });
      return pasti.map(versoDto);
    },

    /** Another user's meal is "not found", to avoid revealing that it exists. */
    async trova(utenteId: string, id: string): Promise<PastoDto> {
      const pasto = await em.findOne(Pasto, { id, utente: utenteId });
      if (!pasto) throw nonTrovato("Pasto non trovato");
      return versoDto(pasto);
    },
  };
}

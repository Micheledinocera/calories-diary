import type { EntityManager } from "@mikro-orm/postgresql";
import type { Pasto as PastoDto } from "@calories-diary/shared";
import { nonTrovato } from "../../lib/errori.js";
import { Pasto } from "./pasto.entity.js";

const versoDto = ({ id, nome, ordine }: Pasto): PastoDto => ({ id, nome, ordine });

export function creaPastiService(em: EntityManager) {
  return {
    async elenca(): Promise<PastoDto[]> {
      const pasti = await em.findAll(Pasto, { orderBy: { ordine: "asc" } });
      return pasti.map(versoDto);
    },

    async trova(id: string): Promise<PastoDto> {
      const pasto = await em.findOne(Pasto, { id });
      if (!pasto) throw nonTrovato("Pasto non trovato");
      return versoDto(pasto);
    },
  };
}

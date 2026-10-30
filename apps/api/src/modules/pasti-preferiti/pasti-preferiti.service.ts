import type { FilterQuery } from "@mikro-orm/core";
import type { EntityManager } from "@mikro-orm/postgresql";
import type {
  NuovoPastoPreferito,
  PastoPreferito as PastoPreferitoDto,
  filtriPastiPreferitiSchema,
} from "@calories-diary/shared";
import type { z } from "zod";
import { ErroreApp, nonTrovato } from "../../lib/errori.js";
import { escapeLike } from "../../lib/testo.js";
import { Alimento } from "../alimenti/alimento.entity.js";
import { Pasto } from "../diario/pasto.entity.js";
import { somma, versoDtoVoce } from "../diario/valori.js";
import { PastoPreferito } from "./pasto-preferito.entity.js";
import { VocePreferita } from "./voce-preferita.entity.js";

type Filtri = z.output<typeof filtriPastiPreferitiSchema>;

const populate = ["autore", "voci.alimento.usi"] as const;

const versoDto = (pasto: PastoPreferito, utenteId: string): PastoPreferitoDto => {
  const voci = pasto.voci.getItems().map((v) => versoDtoVoce(v.alimento, v.quantita, utenteId));
  return {
    id: pasto.id,
    nome: pasto.nome,
    autore: pasto.autore.username,
    mio: pasto.autore.id === utenteId,
    voci,
    totali: somma(voci.map((v) => v.valori)),
    aggiornatoIl: pasto.aggiornatoIl.toISOString(),
  };
};

export function creaPastiPreferitiService(em: EntityManager) {
  async function carica(id: string) {
    const pasto = await em.findOne(PastoPreferito, { id }, { populate });
    if (!pasto) throw nonTrovato("Pasto preferito non trovato");
    return pasto;
  }

  /** Only the author changes a favorite meal; the others see it and use it. */
  async function caricaMio(utenteId: string, id: string) {
    const pasto = await carica(id);
    if (pasto.autore.id !== utenteId) {
      throw new ErroreApp(
        403,
        "PASTO_PREFERITO_NON_TUO",
        "Solo chi l'ha creato può cambiare questo pasto",
      );
    }
    return pasto;
  }

  async function creaVoci(pasto: PastoPreferito, voci: NuovoPastoPreferito["voci"]) {
    const ids = [...new Set(voci.map((v) => v.alimento))];
    if ((await em.count(Alimento, { id: { $in: ids } })) !== ids.length) {
      throw nonTrovato("Alimento non trovato");
    }
    voci.forEach(({ alimento, quantita }, ordine) =>
      em.create(VocePreferita, { pastoPreferito: pasto, alimento, quantita, ordine }),
    );
  }

  /** The entries just written, with their foods. */
  async function rileggi(id: string, utenteId: string) {
    em.clear();
    return versoDto(await carica(id), utenteId);
  }

  return {
    async elenca(utenteId: string, { q, autore }: Filtri): Promise<PastoPreferitoDto[]> {
      const filtro: FilterQuery<PastoPreferito> = {};
      if (q) filtro.nome = { $ilike: `%${escapeLike(q)}%` };
      if (autore === "miei") filtro.autore = utenteId;
      const pasti = await em.find(PastoPreferito, filtro, { populate });
      return pasti
        .sort((x, y) => x.nome.localeCompare(y.nome, "it"))
        .map((pasto) => versoDto(pasto, utenteId));
    },

    async trova(utenteId: string, id: string): Promise<PastoPreferitoDto> {
      return versoDto(await carica(id), utenteId);
    },

    async crea(utenteId: string, { nome, voci }: NuovoPastoPreferito) {
      const pasto = em.create(PastoPreferito, { autore: utenteId, nome });
      await creaVoci(pasto, voci);
      await em.flush();
      return rileggi(pasto.id, utenteId);
    },

    async modifica(utenteId: string, id: string, { nome, voci }: NuovoPastoPreferito) {
      const pasto = await caricaMio(utenteId, id);
      const firma = (righe: { alimento: string; quantita: number }[]) =>
        JSON.stringify(righe.map((v) => [v.alimento, v.quantita]));
      const prima = pasto.voci
        .getItems()
        .map((v) => ({ alimento: v.alimento.id, quantita: v.quantita }));
      // Meals of the diary stay linked only while they are identical: a new name is not a change.
      if (firma(prima) !== firma(voci)) {
        await em.nativeUpdate(Pasto, { preferito: id }, { preferito: null });
      }
      pasto.nome = nome;
      pasto.aggiornatoIl = new Date();
      pasto.voci.removeAll();
      await creaVoci(pasto, voci);
      await em.flush();
      return rileggi(id, utenteId);
    },

    async elimina(utenteId: string, id: string): Promise<void> {
      await em.remove(await caricaMio(utenteId, id)).flush();
    },
  };
}

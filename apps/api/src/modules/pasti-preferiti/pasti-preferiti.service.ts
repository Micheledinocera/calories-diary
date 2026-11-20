import type { FilterQuery } from "@mikro-orm/core";
import type { EntityManager } from "@mikro-orm/postgresql";
import type {
  OrdinePastiPreferiti,
  PastoPreferito as PastoPreferitoDto,
  TagUsato,
  filtriPastiPreferitiSchema,
  nuovoPastoPreferitoSchema,
} from "@calories-diary/shared";
import type { z } from "zod";
import { ErroreApp, nonTrovato } from "../../lib/errori.js";
import { paginata } from "../../lib/paginazione.js";
import { escapeLike } from "../../lib/testo.js";
import { Alimento } from "../alimenti/alimento.entity.js";
import { Pasto } from "../diario/pasto.entity.js";
import { somma, versoDtoVoce } from "../diario/valori.js";
import { PastoPreferito } from "./pasto-preferito.entity.js";
import { Tag } from "./tag.entity.js";
import { VocePreferita } from "./voce-preferita.entity.js";

type Filtri = z.output<typeof filtriPastiPreferitiSchema>;
type Dati = z.output<typeof nuovoPastoPreferitoSchema>;

const populate = ["autore", "voci.alimento.usi", "tags"] as const;

const perNomeTag = (x: string, y: string) => x.localeCompare(y, "it");

const versoDto = (pasto: PastoPreferito, utenteId: string): PastoPreferitoDto => {
  const voci = pasto.voci.getItems().map((v) => versoDtoVoce(v.alimento, v.quantita, utenteId));
  return {
    id: pasto.id,
    nome: pasto.nome,
    autore: pasto.autore.username,
    mio: pasto.autore.id === utenteId,
    voci,
    tags: pasto.tags
      .getItems()
      .map((t) => t.nome)
      .sort(perNomeTag),
    totali: somma(voci.map((v) => v.valori)),
    aggiornatoIl: pasto.aggiornatoIl.toISOString(),
  };
};

const perNome = (x: PastoPreferito, y: PastoPreferito) => x.nome.localeCompare(y.nome, "it");
const inserito = (p: PastoPreferito) => p.creatoIl.getTime();

const ordinamenti: Record<OrdinePastiPreferiti, (x: PastoPreferito, y: PastoPreferito) => number> =
  {
    nome: perNome,
    nomeDesc: (x, y) => perNome(y, x),
    inseritiRecenti: (x, y) => inserito(y) - inserito(x) || perNome(x, y),
    inseritiLontani: (x, y) => inserito(x) - inserito(y) || perNome(x, y),
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

  async function creaVoci(pasto: PastoPreferito, voci: Dati["voci"]) {
    const ids = [...new Set(voci.map((v) => v.alimento))];
    if ((await em.count(Alimento, { id: { $in: ids } })) !== ids.length) {
      throw nonTrovato("Alimento non trovato");
    }
    voci.forEach(({ alimento, quantita }, ordine) =>
      em.create(VocePreferita, { pastoPreferito: pasto, alimento, quantita, ordine }),
    );
  }

  /** The tags with these (normalized) names: the missing ones join the shared vocabulary. */
  async function trovaTag(nomi: string[]) {
    const esistenti = await em.find(Tag, { nome: { $in: nomi } });
    return nomi.map((nome) => esistenti.find((t) => t.nome === nome) ?? em.create(Tag, { nome }));
  }

  /** The entries just written, with their foods. */
  async function rileggi(id: string, utenteId: string) {
    em.clear();
    return versoDto(await carica(id), utenteId);
  }

  return {
    async elenca(utenteId: string, { q, autore, ordine, tag, ...paginazione }: Filtri) {
      const filtro: FilterQuery<PastoPreferito> = {};
      if (q) filtro.nome = { $ilike: `%${escapeLike(q)}%` };
      if (autore === "miei") filtro.autore = utenteId;
      // All the chosen tags (AND): checked on the loaded meals, like sorting and paging.
      const pasti = (await em.find(PastoPreferito, filtro, { populate })).filter((pasto) => {
        const nomi = new Set(pasto.tags.getItems().map((t) => t.nome));
        return tag.every((t) => nomi.has(t));
      });
      return paginata(pasti.sort(ordinamenti[ordine]), paginazione, (pasto) =>
        versoDto(pasto, utenteId),
      );
    },

    /** The tags some meal has, most used first (on every user's meals), then A-Z. */
    async tagUsati(): Promise<TagUsato[]> {
      const pasti = await em.find(PastoPreferito, {}, { populate: ["tags"], fields: ["id"] });
      const conteggi = new Map<string, number>();
      for (const pasto of pasti) {
        for (const { nome } of pasto.tags) conteggi.set(nome, (conteggi.get(nome) ?? 0) + 1);
      }
      return [...conteggi]
        .map(([nome, n]) => ({ nome, pasti: n }))
        .sort((x, y) => y.pasti - x.pasti || perNomeTag(x.nome, y.nome));
    },

    async trova(utenteId: string, id: string): Promise<PastoPreferitoDto> {
      return versoDto(await carica(id), utenteId);
    },

    async crea(utenteId: string, { nome, voci, tags }: Dati) {
      const pasto = em.create(PastoPreferito, { autore: utenteId, nome });
      await creaVoci(pasto, voci);
      pasto.tags.set(await trovaTag(tags));
      await em.flush();
      return rileggi(pasto.id, utenteId);
    },

    async modifica(utenteId: string, id: string, { nome, voci, tags }: Dati) {
      const pasto = await caricaMio(utenteId, id);
      const firma = (righe: { alimento: string; quantita: number }[]) =>
        JSON.stringify(righe.map((v) => [v.alimento, v.quantita]));
      const prima = pasto.voci
        .getItems()
        .map((v) => ({ alimento: v.alimento.id, quantita: v.quantita }));
      // Meals of the diary stay linked only while they are identical: a new name or new tags are
      // not a change.
      if (firma(prima) !== firma(voci)) {
        await em.nativeUpdate(Pasto, { preferito: id }, { preferito: null });
      }
      pasto.nome = nome;
      pasto.aggiornatoIl = new Date();
      pasto.voci.removeAll();
      await creaVoci(pasto, voci);
      pasto.tags.set(await trovaTag(tags));
      await em.flush();
      return rileggi(id, utenteId);
    },

    async elimina(utenteId: string, id: string): Promise<void> {
      await em.remove(await caricaMio(utenteId, id)).flush();
    },
  };
}

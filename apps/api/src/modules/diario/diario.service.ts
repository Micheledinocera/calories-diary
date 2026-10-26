import { UniqueConstraintViolationException } from "@mikro-orm/core";
import type { EntityManager } from "@mikro-orm/postgresql";
import {
  tipiPasto,
  tipiPastoPrincipali,
  type Giornata,
  type NuovaVoce,
  type Pasto as PastoDto,
  type RiepilogoGiorno,
  type TipoPasto,
  type Valori,
  type Voce as VoceDto,
  type VoceSuggerita,
} from "@calories-diary/shared";
import { ErroreApp, nonTrovato } from "../../lib/errori.js";
import { Alimento } from "../alimenti/alimento.entity.js";
import { Pasto } from "./pasto.entity.js";
import { Voce } from "./voce.entity.js";

const zero = (): Valori => ({ kcal: 0, proteine: 0, carboidrati: 0, grassi: 0 });

const somma = (valori: Valori[]): Valori =>
  valori.reduce(
    (tot, v) => ({
      kcal: tot.kcal + v.kcal,
      proteine: tot.proteine + v.proteine,
      carboidrati: tot.carboidrati + v.carboidrati,
      grassi: tot.grassi + v.grassi,
    }),
    zero(),
  );

/** `valore_per_100 × quantità / 100`, from the food's current values. Rounded only when shown. */
const valoriVoce = (a: Alimento, quantita: number): Valori => ({
  kcal: (a.kcal * quantita) / 100,
  proteine: (a.proteine * quantita) / 100,
  carboidrati: (a.carboidrati * quantita) / 100,
  grassi: (a.grassi * quantita) / 100,
});

const versoDtoVoce = (a: Alimento, quantita: number): VoceSuggerita => ({
  alimento: {
    id: a.id,
    nome: a.nome,
    marca: a.marca ?? null,
    unitaBase: a.unitaBase,
    archiviato: a.archiviato,
  },
  quantita,
  valori: valoriVoce(a, quantita),
});

const principale = (tipo: TipoPasto) => tipo !== "spuntino";

/** Position of a main meal among the main meals (colazione 0, pranzo 1, cena 2). */
const rango = (tipo: TipoPasto) => tipiPasto.indexOf(tipo);

/** `YYYY-MM-DD` of the day before, computed in UTC to avoid DST surprises. */
function giornoPrima(giorno: string): string {
  const data = new Date(`${giorno}T00:00:00Z`);
  data.setUTCDate(data.getUTCDate() - 1);
  return data.toISOString().slice(0, 10);
}

const pastoNonTrovato = () => nonTrovato("Pasto non trovato");
const voceNonTrovata = () => nonTrovato("Voce non trovata");

export function creaDiarioService(em: EntityManager) {
  const pastiDelGiorno = (utenteId: string, giorno: string) =>
    em.find(
      Pasto,
      { utente: utenteId, giorno },
      { populate: ["voci.alimento"], orderBy: { ordine: "asc", creatoIl: "asc" } },
    );

  /** The day as the client shows it: main meals not yet saved are added empty, in their place. */
  async function giornata(utenteId: string, giorno: string): Promise<Giornata> {
    const salvati = await pastiDelGiorno(utenteId, giorno);
    const pasti: PastoDto[] = salvati.map((pasto) => {
      const voci: VoceDto[] = pasto.voci
        .getItems()
        .map((v) => ({ id: v.id, ...versoDtoVoce(v.alimento, v.quantita) }));
      return {
        id: pasto.id,
        tipo: pasto.tipo,
        voci,
        totali: somma(voci.map((v) => v.valori)),
        suggerite: [],
      };
    });

    for (const tipo of tipiPastoPrincipali) {
      if (pasti.some((p) => p.tipo === tipo)) continue;
      const vuoto: PastoDto = { id: null, tipo, voci: [], totali: zero(), suggerite: [] };
      const dopo = pasti.findIndex((p) => principale(p.tipo) && rango(p.tipo) > rango(tipo));
      pasti.splice(dopo === -1 ? pasti.length : dopo, 0, vuoto);
    }

    // An empty main meal proposes what the same meal had the day before (archived foods excluded).
    const vuoti = pasti.filter((p) => principale(p.tipo) && !p.voci.length);
    if (vuoti.length) {
      const ieri = await pastiDelGiorno(utenteId, giornoPrima(giorno));
      for (const pasto of vuoti) {
        const stesso = ieri.find((p) => p.tipo === pasto.tipo);
        pasto.suggerite = (stesso?.voci.getItems() ?? [])
          .filter((v) => !v.alimento.archiviato)
          .map((v) => versoDtoVoce(v.alimento, v.quantita));
      }
    }

    return { giorno, pasti, totali: somma(pasti.map((p) => p.totali)) };
  }

  /** Foods of the user, by id: a missing or foreign one is "not found". */
  async function alimentiDellUtente(utenteId: string, voci: NuovaVoce[]) {
    const ids = [...new Set(voci.map((v) => v.alimento))];
    if (!ids.length) return new Map<string, Alimento>();
    const alimenti = await em.find(Alimento, { id: { $in: ids }, utente: utenteId });
    if (alimenti.length !== ids.length) throw nonTrovato("Alimento non trovato");
    return new Map(alimenti.map((a) => [a.id, a]));
  }

  /** Adds the entries and updates "Recenti" and "Più usati" of their foods (flush is up to the caller). */
  async function aggiungiVoci(utenteId: string, pasto: Pasto, voci: NuovaVoce[]) {
    const alimenti = await alimentiDellUtente(utenteId, voci);
    const adesso = new Date();
    voci.forEach(({ alimento: id, quantita }, i) => {
      const alimento = alimenti.get(id)!;
      // Entries are listed by creation time: 1 ms apart, those added together keep their order.
      em.create(Voce, { pasto, alimento, quantita, creatoIl: new Date(adesso.getTime() + i) });
      alimento.utilizzi += 1;
      alimento.ultimoUso = adesso;
    });
  }

  /** The use count goes back down, so a food no longer in the diary can be deleted again. */
  function togliUtilizzo(alimento: Alimento) {
    alimento.utilizzi = Math.max(0, alimento.utilizzi - 1);
  }

  /** Two concurrent first writes of the same day would both create the main meals. */
  async function salva() {
    try {
      await em.flush();
    } catch (err) {
      if (!(err instanceof UniqueConstraintViolationException)) throw err;
      throw new ErroreApp(409, "CONFLITTO", "Il giorno è stato modificato nel frattempo: riprova");
    }
  }

  async function caricaPasto(utenteId: string, id: string) {
    const pasto = await em.findOne(
      Pasto,
      { id, utente: utenteId },
      { populate: ["voci.alimento"] },
    );
    // Another user's meal is "not found", to avoid revealing that it exists.
    if (!pasto) throw pastoNonTrovato();
    return pasto;
  }

  async function caricaVoce(utenteId: string, id: string) {
    const voce = await em.findOne(
      Voce,
      { id, pasto: { utente: utenteId } },
      { populate: ["pasto", "alimento"] },
    );
    if (!voce) throw voceNonTrovata();
    return voce;
  }

  return {
    giornata,

    /** Days with at least one entry in the interval, with their totals (for the calendar). */
    async riepiloghi(utenteId: string, da: string, a: string): Promise<RiepilogoGiorno[]> {
      const voci = await em.find(
        Voce,
        { pasto: { utente: utenteId, giorno: { $gte: da, $lte: a } } },
        { populate: ["pasto", "alimento"] },
      );
      const perGiorno = new Map<string, Valori[]>();
      for (const v of voci) {
        const lista = perGiorno.get(v.pasto.giorno) ?? [];
        lista.push(valoriVoce(v.alimento, v.quantita));
        perGiorno.set(v.pasto.giorno, lista);
      }
      return [...perGiorno]
        .sort(([g1], [g2]) => g1.localeCompare(g2))
        .map(([giorno, valori]) => ({ giorno, totali: somma(valori) }));
    },

    /**
     * Saves a meal with its entries. The first write of a day saves colazione, pranzo and cena
     * too, so every meal has an id before snacks are moved among them. A main meal already
     * saved is reused; a snack is always new, at the end of the day.
     */
    async aggiungiPasto(
      utenteId: string,
      giorno: string,
      tipo: TipoPasto,
      voci: NuovaVoce[],
    ): Promise<Giornata> {
      const pasti: Pasto[] = await pastiDelGiorno(utenteId, giorno);
      let ordine = pasti.reduce((max, p) => Math.max(max, p.ordine + 1), 0);
      for (const t of tipiPastoPrincipali) {
        if (!pasti.some((p) => p.tipo === t)) {
          pasti.push(em.create(Pasto, { utente: utenteId, giorno, tipo: t, ordine: ordine++ }));
        }
      }
      const pasto =
        tipo === "spuntino"
          ? em.create(Pasto, { utente: utenteId, giorno, tipo, ordine })
          : pasti.find((p) => p.tipo === tipo)!;
      await aggiungiVoci(utenteId, pasto, voci);
      await salva();
      em.clear();
      return giornata(utenteId, giorno);
    },

    /** Only snacks can be removed: main meals are always in the day (emptied, at most). */
    async eliminaPasto(utenteId: string, id: string): Promise<Giornata> {
      const pasto = await caricaPasto(utenteId, id);
      if (principale(pasto.tipo)) {
        throw new ErroreApp(409, "PASTO_NON_ELIMINABILE", "Si possono eliminare solo gli spuntini");
      }
      pasto.voci.getItems().forEach((v) => togliUtilizzo(v.alimento));
      em.remove(pasto);
      await em.flush();
      em.clear();
      return giornata(utenteId, pasto.giorno);
    },

    /** `ids` must be every saved meal of the day, with colazione, pranzo and cena in order. */
    async ordina(utenteId: string, giorno: string, ids: string[]): Promise<Giornata> {
      const pasti = await pastiDelGiorno(utenteId, giorno);
      const perId = new Map(pasti.map((p) => [p.id, p]));
      const ordinati = ids.map((id) => perId.get(id));
      const principali = ordinati.filter((p) => p && principale(p.tipo)).map((p) => rango(p!.tipo));
      if (
        ids.length !== pasti.length ||
        ordinati.some((p) => !p) ||
        principali.some((r, i) => i > 0 && r < principali[i - 1]!)
      ) {
        throw new ErroreApp(
          400,
          "ORDINE_NON_VALIDO",
          "Servono tutti i pasti del giorno, con colazione, pranzo e cena nel loro ordine",
        );
      }
      ordinati.forEach((p, i) => (p!.ordine = i));
      await em.flush();
      em.clear();
      return giornata(utenteId, giorno);
    },

    async aggiungiVoce(utenteId: string, pastoId: string, voce: NuovaVoce): Promise<Giornata> {
      const pasto = await caricaPasto(utenteId, pastoId);
      await aggiungiVoci(utenteId, pasto, [voce]);
      await em.flush();
      em.clear();
      return giornata(utenteId, pasto.giorno);
    },

    async modificaVoce(utenteId: string, id: string, quantita: number): Promise<Giornata> {
      const voce = await caricaVoce(utenteId, id);
      voce.quantita = quantita;
      await em.flush();
      em.clear();
      return giornata(utenteId, voce.pasto.giorno);
    },

    async eliminaVoce(utenteId: string, id: string): Promise<Giornata> {
      const voce = await caricaVoce(utenteId, id);
      togliUtilizzo(voce.alimento);
      em.remove(voce);
      await em.flush();
      em.clear();
      return giornata(utenteId, voce.pasto.giorno);
    },
  };
}

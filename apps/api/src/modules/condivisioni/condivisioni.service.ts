import type { EntityManager } from "@mikro-orm/postgresql";
import type {
  Condivisione as CondivisioneDto,
  DurataCondivisione,
  Giornata,
  GiornoCondiviso,
  NuovaCondivisione,
  VistaCondivisa,
} from "@calories-diary/shared";
import { nonTrovato } from "../../lib/errori.js";
import { creaDiarioService } from "../diario/diario.service.js";
import { versoDtoObiettivi } from "../obiettivi/obiettivi.routes.js";
import { Utente } from "../utenti/utente.entity.js";
import { Condivisione } from "./condivisione.entity.js";

const GIORNI_VALIDITA: Record<DurataCondivisione, number | null> = {
  giorno: 1,
  settimana: 7,
  mese: 30,
  sempre: null,
};

const MS_AL_GIORNO = 86_400_000;

function scadenza(durata: DurataCondivisione): Date | null {
  const giorni = GIORNI_VALIDITA[durata];
  return giorni === null ? null : new Date(Date.now() + giorni * MS_AL_GIORNO);
}

/** Every day from `da` to `a`, both included, computed in UTC to avoid DST surprises. */
function giorniTra(da: string, a: string): string[] {
  const inizio = Date.parse(da);
  const quanti = (Date.parse(a) - inizio) / MS_AL_GIORNO + 1;
  return Array.from({ length: quanti }, (_, i) =>
    new Date(inizio + i * MS_AL_GIORNO).toISOString().slice(0, 10),
  );
}

/** Keeps only what the public page shows: never the ids, the archive state or the suggestions. */
const versoGiornoCondiviso = ({ giorno, pasti, totali }: Giornata): GiornoCondiviso => ({
  giorno,
  totali,
  pasti: pasti
    .filter((p) => p.voci.length)
    .map(({ tipo, voci, totali }) => ({
      tipo,
      totali,
      voci: voci.map(({ alimento, quantita, valori }) => ({
        nome: alimento.nome,
        marca: alimento.marca,
        unitaBase: alimento.unitaBase,
        quantita,
        valori,
      })),
    })),
});

const versoDto = (c: Condivisione): CondivisioneDto => ({
  id: c.id,
  token: c.token,
  da: c.da,
  a: c.a,
  scadeIl: c.scadeIl?.toISOString() ?? null,
});

const linkNonValido = () => nonTrovato("Link scaduto o revocato");

export function creaCondivisioniService(em: EntityManager) {
  const diario = creaDiarioService(em);

  return {
    async elenco(utenteId: string): Promise<CondivisioneDto[]> {
      await em.nativeDelete(Condivisione, { utente: utenteId, scadeIl: { $lte: new Date() } });
      const condivisioni = await em.find(
        Condivisione,
        { utente: utenteId },
        { orderBy: { creatoIl: "desc" } },
      );
      return condivisioni.map(versoDto);
    },

    async crea(
      utenteId: string,
      { da, a, durata, mostraFabbisogno }: NuovaCondivisione,
    ): Promise<CondivisioneDto> {
      const utente = await em.findOneOrFail(Utente, { id: utenteId });
      const giorni: GiornoCondiviso[] = [];
      for (const giorno of giorniTra(da, a)) {
        giorni.push(versoGiornoCondiviso(await diario.giornata(utenteId, giorno)));
      }
      const obiettivi = mostraFabbisogno && utente.fabbisogno ? versoDtoObiettivi(utente) : null;
      const condivisione = em.create(Condivisione, {
        utente,
        da,
        a,
        scadeIl: scadenza(durata),
        dati: { obiettivi, giorni },
      });
      await em.flush();
      return versoDto(condivisione);
    },

    async revoca(utenteId: string, id: string): Promise<void> {
      // Another user's link is "not found", to avoid revealing that it exists.
      const condivisione = await em.findOne(Condivisione, { id, utente: utenteId });
      if (!condivisione) throw linkNonValido();
      em.remove(condivisione);
      await em.flush();
    },

    /** Public: an expired link and a revoked one answer the same. */
    async vista(token: string): Promise<VistaCondivisa> {
      const condivisione = await em.findOne(Condivisione, {
        token,
        $or: [{ scadeIl: null }, { scadeIl: { $gt: new Date() } }],
      });
      if (!condivisione) throw linkNonValido();
      const { da, a, scadeIl, dati } = condivisione;
      return { ...dati, da, a, scadeIl: scadeIl?.toISOString() ?? null };
    },
  };
}

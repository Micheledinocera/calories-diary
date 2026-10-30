import type { EntityManager } from "@mikro-orm/postgresql";
import type { ModificaUtente, Ruolo, Utente as UtenteDto } from "@calories-diary/shared";
import { ErroreApp, nonTrovato } from "../../lib/errori.js";
import { hashPassword, verificaPassword } from "../../lib/password.js";
import { Pasto } from "../diario/pasto.entity.js";
import { PastoPreferito } from "../pasti-preferiti/pasto-preferito.entity.js";
import { chiaveUsername, Utente } from "./utente.entity.js";

export const versoDtoUtente = ({ id, username, ruolo }: Utente): UtenteDto => ({
  id,
  username,
  ruolo,
});

const usernameInUso = (username: string) =>
  new ErroreApp(409, "USERNAME_IN_USO", `Esiste già un utente con username ${username}`);

export function creaUtentiService(em: EntityManager) {
  async function verificaUsernameLibero(username: string, escludiId?: string) {
    const altro = await em.findOne(
      Utente,
      { chiaveUsername: chiaveUsername(username) },
      { fields: ["id"] },
    );
    if (altro && altro.id !== escludiId) throw usernameInUso(username);
  }

  async function carica(id: string): Promise<Utente> {
    const utente = await em.findOne(Utente, { id });
    if (!utente) throw nonTrovato("Utente non trovato");
    return utente;
  }

  /** New password: the session version goes up, so every token already issued stops working. */
  async function impostaPassword(utente: Utente, password: string) {
    utente.passwordHash = await hashPassword(password);
    utente.versioneSessione += 1;
  }

  return {
    /** Admins are created only here, from the CLI; the admin page creates normal users. */
    async crea(username: string, password: string, ruolo: Ruolo = "utente"): Promise<UtenteDto> {
      await verificaUsernameLibero(username);
      const utente = em.create(Utente, {
        username,
        passwordHash: await hashPassword(password),
        ruolo,
      });
      await em.flush();
      return versoDtoUtente(utente);
    },

    /** CLI only: there is no role change from the app. */
    async promuoviAdmin(username: string): Promise<UtenteDto> {
      const utente = await em.findOne(Utente, { chiaveUsername: chiaveUsername(username) });
      if (!utente) throw nonTrovato(`Utente ${username} non trovato`);
      utente.ruolo = "admin";
      await em.flush();
      return versoDtoUtente(utente);
    },

    async lista(): Promise<UtenteDto[]> {
      const utenti = await em.find(Utente, {}, { orderBy: { chiaveUsername: "asc" } });
      return utenti.map(versoDtoUtente);
    },

    /** Admin: username and/or password of any user. The user's own profile changes only the username. */
    async modifica(id: string, { username, password }: ModificaUtente): Promise<UtenteDto> {
      const utente = await carica(id);
      if (username !== undefined) {
        await verificaUsernameLibero(username, id);
        utente.username = username;
      }
      if (password !== undefined) await impostaPassword(utente, password);
      await em.flush();
      return versoDtoUtente(utente);
    },

    /**
     * The user changes their own password, proving they know the current one.
     * Returns the updated user, so the caller can issue a token with the new version.
     */
    async cambiaPassword(id: string, passwordAttuale: string, nuova: string): Promise<Utente> {
      const utente = await carica(id);
      if (!(await verificaPassword(passwordAttuale, utente.passwordHash))) {
        throw new ErroreApp(400, "PASSWORD_ERRATA", "La password attuale non è corretta");
      }
      await impostaPassword(utente, nuova);
      await em.flush();
      return utente;
    },

    /**
     * Admin: deletes a user for good. Their diary (meals, entries) and food uses go with them.
     * The foods they created are deleted unless they appear in another user's diary: those stay
     * in the shared pool, without author.
     */
    async elimina(id: string, richiedenteId: string): Promise<void> {
      if (id === richiedenteId) {
        throw new ErroreApp(400, "AUTO_ELIMINAZIONE", "Non puoi eliminare il tuo utente");
      }
      await carica(id);
      await em.transactional(async (tem) => {
        // Meals first (entries go in cascade): then any entry left is another user's.
        await tem.nativeDelete(Pasto, { utente: id });
        await tem.nativeDelete(PastoPreferito, { autore: id });
        await tem.execute(
          `delete from "alimento" as "a" where "a"."autore_id" = ? and not exists (select 1 from "voce" as "v" where "v"."alimento_id" = "a"."id") and not exists (select 1 from "voce_preferita" as "vp" where "vp"."alimento_id" = "a"."id")`,
          [id],
        );
        await tem.nativeDelete(Utente, { id });
      });
      em.clear();
    },
  };
}

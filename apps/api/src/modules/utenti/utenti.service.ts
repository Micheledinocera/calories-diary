import type { EntityManager } from "@mikro-orm/postgresql";
import type { Utente as UtenteDto } from "@calories-diary/shared";
import { ErroreApp } from "../../lib/errori.js";
import { hashPassword } from "../../lib/password.js";
import { Utente } from "./utente.entity.js";

export const versoDtoUtente = ({ id, email }: Utente): UtenteDto => ({ id, email });

export function creaUtentiService(em: EntityManager) {
  return {
    /** Creates the user. Used by the CLI: there is no public sign-up. */
    async crea(email: string, password: string): Promise<UtenteDto> {
      if (await em.count(Utente, { email })) {
        throw new ErroreApp(409, "EMAIL_IN_USO", `Esiste già un utente con email ${email}`);
      }
      const utente = em.create(Utente, { email, passwordHash: await hashPassword(password) });
      await em.flush();
      return versoDtoUtente(utente);
    },
  };
}

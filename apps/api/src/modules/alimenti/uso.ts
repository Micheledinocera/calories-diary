import type { EntityManager } from "@mikro-orm/postgresql";
import type { Alimento } from "./alimento.entity.js";
import { UsoAlimento } from "./uso-alimento.entity.js";

/** The user's use of the food, if any. `alimento.usi` must be populated. */
export const usoDi = (alimento: Alimento, utenteId: string): UsoAlimento | undefined =>
  alimento.usi.getItems().find((uso) => uso.utente.id === utenteId);

/** The user's use of the food, created on first use or archive. */
export const usoPer = (em: EntityManager, alimento: Alimento, utenteId: string): UsoAlimento =>
  usoDi(alimento, utenteId) ?? em.create(UsoAlimento, { utente: utenteId, alimento });

/** Some diary, of any user, uses the food: it can no longer be deleted. */
export const inUso = (alimento: Alimento): boolean =>
  alimento.usi.getItems().some((uso) => uso.utilizzi > 0);

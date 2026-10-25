import { ProdottoCatalogo } from "../modules/catalogo/prodotto-catalogo.entity.js";
import { Pasto } from "../modules/pasti/pasto.entity.js";
import { Utente } from "../modules/utenti/utente.entity.js";

/** Every entity of the app, one import per module. */
export const entita = [Utente, Pasto, ProdottoCatalogo];

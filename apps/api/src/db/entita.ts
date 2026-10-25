import { Alimento } from "../modules/alimenti/alimento.entity.js";
import { Porzione } from "../modules/alimenti/porzione.entity.js";
import { ProdottoCatalogo } from "../modules/catalogo/prodotto-catalogo.entity.js";
import { Pasto } from "../modules/diario/pasto.entity.js";
import { Voce } from "../modules/diario/voce.entity.js";
import { Utente } from "../modules/utenti/utente.entity.js";

/** Every entity of the app, one import per module. */
export const entita = [Utente, Pasto, Voce, ProdottoCatalogo, Alimento, Porzione];

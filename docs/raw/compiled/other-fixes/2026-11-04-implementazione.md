# Implementazione — other-fixes

## Input numerici uniformi

- Tutti i campi numerici usano `InputDecimale` (via `UInputNumber` da diario, pasti preferiti e obiettivi): con `locale="it-IT"` il punto veniva letto come separatore delle migliaia e il valore si aggiornava solo al blur.
- Regola unica: virgola o punto sono **sempre** il separatore decimale, mai delle migliaia ("2.000" nel fabbisogno vale 2).
- `InputDecimale` ha nuove prop: `decimali` (default 3, come il DB; 0 per kcal e percentuali, arrotonda), `min` (default 0), `max`, `passo` (mostra i pulsanti − e +). Il valore viene limitato a min/max al blur e con i pulsanti.
- Quantità (diario, scelta alimento, pasto preferito): passo 10, fino a 3 decimali (prima 1). Fabbisogno: intero, passo 50. Ripartizione macro: intero, max 100, senza pulsanti.
- `utils/alimenti.ts`: `leggiDecimale(testo, decimali)`, `formattaDecimale(v, decimali)`, nuova `arrotonda(v, decimali)`.

## Svuota pasto

- Nuovo endpoint `DELETE /diario/pasti/:id/voci` (`svuotaPasto`): toglie tutte le voci, il pasto resta nel giorno (anche uno spuntino), perde il collegamento al preferito (il preferito non viene eliminato) e gli utilizzi degli alimenti scendono come per `eliminaVoce`.
- In `DiarioPasto` una scopa (`i-lucide-brush-cleaning`) accanto alla stella, visibile solo se il pasto è modificabile e ha voci; chiede conferma con `confirm()` come l'eliminazione dello spuntino.

## Conferme sempre con la modale in app

- Regola: nessun `confirm()`/`alert()`/`prompt()` del browser; ogni conferma usa la modale dell'app.
- `components/ModaleConferma.vue` + `composables/useConferma.ts` (su `useOverlay` di Nuxt UI): `await conferma({ titolo, descrizione?, azione?, icona? })` risolve `true` solo con il pulsante di conferma; Annulla, Esc o clic fuori valgono "no". Pulsante di conferma rosso, "Elimina" e cestino di default.
- Sostituiti tutti i `confirm()`: svuota pasto, elimina spuntino, revoca link (export), elimina alimento, elimina utente, elimina pasto preferito. Anche la conferma della stella (togli dai preferiti) passa da qui: `ModaleTogliPreferito.vue` è stato eliminato.

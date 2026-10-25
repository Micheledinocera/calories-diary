# Implementazione — export

- Pagina `/diario/export` (`apps/web/app/pages/diario/export.vue`), raggiungibile dal bottone "Esporta" del calendario. `UCalendar` in modalità `range` con `maximum-days` = `MAX_GIORNI_EXPORT` (7) e `max-value` oggi: niente giorni futuri. Intervallo iniziale: gli ultimi 7 giorni fino a oggi.
- "Genera" chiama in parallelo `GET /obiettivi` e `GET /diario/:giorno` per ogni giorno (al massimo 7 chiamate, nessun endpoint nuovo) e mostra l'anteprima del markdown. Cambiare intervallo svuota l'anteprima.
- Azioni: "Condividi" (Web Share API con file `.md`, solo se `navigator.canShare` accetta file, cioè in pratica su Android), "Scarica .md" (Blob + link `download`), "Copia" (appunti). Nome del file `diario-<da>_<a>.md`, o `diario-<giorno>.md` per un giorno solo.
- `apps/web/app/utils/export.ts`: `markdownDiario(giornate, obiettivi)`, funzione pura testata in `test/export.test.ts`. Struttura del file:
  - titolo, periodo, obiettivi (fabbisogno o "non impostato", ripartizione dei macro);
  - tabella "Riepilogo" con kcal e macro di ogni giorno, solo se i giorni sono più di uno;
  - per ogni giorno, in ordine di data: totale kcal rispetto al fabbisogno (quante in più o in meno), grammi e quota di ogni macro rispetto alla ripartizione obiettivo, poi una tabella per pasto (alimento con marca, quantità in g/ml, kcal, carboidrati, grassi, proteine e riga di totale). I pasti vuoti si saltano; un giorno senza voci riporta "Nessun alimento registrato.".
  - Numeri formattati come nell'app (`formattaValore`, it-IT, una cifra decimale; kcal arrotondate). I caratteri markdown nei nomi (`|`, `*`, `_`…) sono escapati per non rompere le tabelle.

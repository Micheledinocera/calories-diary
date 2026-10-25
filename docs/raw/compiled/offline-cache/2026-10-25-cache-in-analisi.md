# Rinomina e cache offline in analisi

- La feature `sync` è rinominata in `offline-cache` (branch e cartella dei raw), dopo la decisione di abbandonare la sync (vedi `2026-10-25-decisione-niente-sync.md`). L'obiettivo resta continuare l'MVP; questa feature si occupa della cache offline in sola lettura.
- Proposta sul contenuto della cache, accettata dall'utente come direzione ma **lasciata in analisi**: cosa tenere in locale si decide anche in base a come sarà fatta la UI (feature `foods`, `diary`).
  - Diario degli ultimi giorni aperti.
  - Alimenti usati (recenti e più usati).
  - Offline: pulsanti di inserimento disattivati, con un avviso "sei offline".
  - Implementazione: probabilmente basta il caching del service worker sulle risposte GET dell'API, senza Dexie.

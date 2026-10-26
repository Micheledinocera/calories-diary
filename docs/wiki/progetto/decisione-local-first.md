---
tipo: decisione
stato: superata
sostituita_da: ./decisione-server-fonte-di-verita.md
aggiornato: 2026-10-25
fonti:
  - raw/compiled/first-develop/analisi-iniziale-calorie-tracker.md
  - raw/compiled/first-develop/setup-progetto.md
  - raw/compiled/first-develop/2026-10-25-decisioni-e-piano.md
  - raw/compiled/offline-cache/2026-10-25-decisione-niente-sync.md
---

# Local-first, con le fonti esterne dietro il back-end

> **Superata** da [Server come fonte di verità](./decisione-server-fonte-di-verita.md): niente sync, il server è l'unica fonte di verità e offline c'è solo una cache in sola lettura. La parte sulle fonti esterne dietro il back-end resta valida ed è riportata lì.

## Decisione

- La PWA lavora su uno **store locale** (IndexedDB) e funziona offline; si sincronizza con l'API quando c'è rete.
- Il front-end **non chiama mai servizi esterni**: parla solo con la nostra API.
- La logica di scelta del prodotto sta tutta nel back-end: prima il nostro DB, poi il provider esterno (oggi Open Food Facts). I dati del provider vengono normalizzati nel nostro modello e salvati.
- Ogni provider è un **adapter** verso il nostro modello: cambiare provider significa scrivere un nuovo adapter, il front-end non cambia.
- Sync: id UUID generati dal client, data di aggiornamento e cancellazione logica su ogni tabella sincronizzata, push/pull incrementale, in caso di conflitto vince l'ultima scrittura.

## Perché

- L'analisi chiede un'app offline-first con privacy (dati solo locali o su storage personale); il setup prevede un back-end con PostgreSQL. Local-first con sync tiene insieme le due cose.
- Il back-end come unico gateway verso i provider rende il front-end indipendente dal provider, permette di impostare lo User-Agent richiesto da OFF e di usare Redis per cache e rate limit.
- Con un solo utente i conflitti di sync sono rari: "vince l'ultima scrittura" basta.

## Alternative scartate

- **Server come unica fonte di verità**, con cache offline in sola lettura: più semplice, ma non permette di registrare il diario offline.
- **Chiamate a OFF direttamente dal browser**: il browser non può impostare lo User-Agent, e il front-end dipenderebbe dal provider.

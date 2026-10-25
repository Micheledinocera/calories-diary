---
tipo: decisione
stato: presa
aggiornato: 2026-10-25
fonti:
  - raw/compiled/first-develop/analisi-iniziale-calorie-tracker.md
  - raw/compiled/first-develop/2026-10-25-decisioni-e-piano.md
  - raw/compiled/offline-cache/2026-10-25-decisione-niente-sync.md
  - raw/compiled/offline-cache/2026-10-25-cache-in-analisi.md
---

# Server come fonte di verità, con le fonti esterne dietro il back-end

Sostituisce la decisione [Local-first](./decisione-local-first.md).

## Decisione

- Il **server è l'unica fonte di verità**: la PWA legge e scrive tramite l'API.
- Offline la PWA mostra i dati già scaricati da una **cache locale in sola lettura**, ma non permette di registrare né modificare. Cosa mettere in cache e come è in [Cache offline in sola lettura](./decisione-cache-offline.md).
- Nessuna sync tra client e server: niente push/pull, niente gestione dei conflitti.
- Il front-end **non chiama mai servizi esterni**: parla solo con la nostra API.
- La logica di scelta del prodotto sta tutta nel back-end: prima il nostro DB, poi il provider esterno (oggi Open Food Facts). I dati del provider vengono normalizzati nel nostro modello e salvati.
- Ogni provider è un **adapter** verso il nostro modello: cambiare provider significa scrivere un nuovo adapter, il front-end non cambia.

## Perché

- La sync local-first (store locale, push/pull incrementale, conflitti, cancellazione logica) era la parte più complessa dell'MVP. L'utente ha scelto di rinunciarvi: consultare i dati offline basta, registrare offline non è necessario.
- Il back-end come unico gateway verso i provider rende il front-end indipendente dal provider, permette di impostare lo User-Agent richiesto da OFF e di usare Redis per cache e rate limit.

## Alternative scartate

- **Local-first con sync** (la decisione precedente): permette di registrare il diario offline, ma richiede store locale come fonte della UI, protocollo di sync e gestione dei conflitti.
- **Chiamate a OFF direttamente dal browser**: il browser non può impostare lo User-Agent, e il front-end dipenderebbe dal provider.

---
tipo: decisione
stato: in analisi
aggiornato: 2026-10-25
fonti:
  - raw/compiled/offline-cache/2026-10-25-decisione-niente-sync.md
  - raw/compiled/offline-cache/2026-10-25-cache-in-analisi.md
  - raw/compiled/foods/2026-10-25-implementazione.md
---

# Cache offline in sola lettura

Offline la PWA mostra i dati già scaricati, senza permettere di registrare né modificare (vedi [Server come fonte di verità](./decisione-server-fonte-di-verita.md)). Cosa tenere in locale si decide anche in base a come sarà fatta la UI, nelle feature `foods` e `diary`.

## Proposta

Accettata come direzione, non ancora decisa:

- **Contenuto**: il diario degli ultimi giorni aperti; gli alimenti usati (recenti e più usati).
- **Offline**: i pulsanti di inserimento sono disattivati e un avviso dice "sei offline".
- **Alimenti** (da `foods`): servirebbe offline la lista degli alimenti in sola lettura; creazione e modifica richiedono la rete.
- **Implementazione**: probabilmente basta il caching del service worker sulle risposte GET dell'API (Vite PWA, https://vite-pwa-org.netlify.app/frameworks/nuxt), senza uno store IndexedDB (Dexie).

## Domande aperte

- Quali dati del diario servono offline, una volta definite le schermate di `diary`.
- Service worker o store IndexedDB, e per quanto tempo tenere i dati in cache.

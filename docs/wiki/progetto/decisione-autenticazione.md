---
tipo: decisione
stato: presa
aggiornato: 2026-10-25
fonti:
  - raw/compiled/first-develop/2026-10-25-decisioni-e-piano.md
  - raw/compiled/auth/2026-10-25-obiettivo.md
  - raw/compiled/auth/2026-10-25-decisioni-utente.md
  - raw/compiled/auth/2026-10-25-implementazione.md
---

# Autenticazione multiutente

## Decisione

- **Più utenti**, ognuno con i propri dati: oggi solo il proprietario, in futuro qualche amico. Tabella `utente` con email e hash della password.
- **Nessuna registrazione pubblica**: gli utenti si creano con un comando CLI dell'API (`pnpm utente:crea <email>`).
- Login con **email e password**; restituisce un token (JWT) che il client invia come `Authorization: Bearer`.
- Il token dura **una settimana**, con **rinnovo scorrevole**: quando l'app parla con l'API riceve un token nuovo di 7 giorni. Chi resta offline più di 7 giorni rifà il login alla riconnessione; i dati locali restano.
- Rate limit sul login con Redis.
- I **pasti sono per utente** (i predefiniti si creano insieme all'utente). Scelta conservativa: più avanti si valuterà se renderli comuni.

Dettagli di implementazione: [Autenticazione e utenti](../tecnico/api/auth.md) (API) e [App web](../tecnico/web/app.md#sessione-e-login) (PWA).

## Perché

- L'API è esposta pubblicamente e contiene dati personali: va protetta.
- L'app potrebbe essere usata anche da qualche amico: prevedere più utenti subito costa poco, aggiungerli dopo vorrebbe dire migrare ogni tabella.
- Il front-end (Vercel) e l'API (Render) sono su domini diversi: i cookie sarebbero cross-site, un header `Authorization` evita il problema.
- Con pochi utenti noti la registrazione aperta servirebbe solo agli sconosciuti: la CLI basta.
- Una settimana con rinnovo scorrevole: chi usa l'app almeno una volta a settimana non rifà mai il login, e resta comunque un margine ampio per l'uso offline.
- Pasti per utente: ogni riga ha un solo proprietario, nessun dato condiviso tra utenti da gestire.

## Alternative scartate

- **Utente singolo con le credenziali nelle variabili d'ambiente** (la prima versione di questa decisione): niente tabella utenti, ma nessuna possibilità di aggiungere altre persone.
- **Registrazione aperta o con codice d'invito**: più lavoro (pagine, abusi) senza un bisogno reale oggi.
- **Token a scadenza fissa**: costringerebbe al login ogni settimana anche chi usa l'app tutti i giorni.
- **Pasti comuni a tutti gli utenti**: più semplici, ma ogni modifica toccherebbe tutti; rinviata.

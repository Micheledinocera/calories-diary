---
tipo: decisione
stato: presa
aggiornato: 2026-10-25
fonti:
  - raw/compiled/first-develop/2026-10-25-decisioni-e-piano.md
---

# Autenticazione a utente singolo

## Decisione

- Un solo utente. Le credenziali stanno nelle variabili d'ambiente dell'API (hash della password, mai in chiaro).
- Il login restituisce un token (JWT), che il client invia come `Authorization: Bearer`.
- Rate limit sul login con Redis.
- Da implementare nella feature `auth`.

## Perché

- Né l'analisi né il setup prevedevano un'autenticazione, ma l'API è esposta pubblicamente e contiene dati personali: va protetta.
- Il front-end (Vercel) e l'API (Render) sono su domini diversi: i cookie sarebbero cross-site, un header `Authorization` evita il problema.
- Un solo utente non giustifica una tabella utenti né un provider di identità.

## Domande aperte

- Durata del token e rinnovo, compatibili con l'uso offline prolungato: da definire in `auth`.

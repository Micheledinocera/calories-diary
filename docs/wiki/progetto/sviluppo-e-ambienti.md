---
tipo: info
aggiornato: 2026-10-25
fonti:
  - raw/compiled/first-develop/setup-progetto.md
  - raw/compiled/first-develop/2026-10-25-decisioni-e-piano.md
  - raw/compiled/first-develop/2026-10-25-scaffolding.md
  - raw/compiled/auth/2026-10-25-bun-dev-ctrlc.md
---

# Sviluppo, CI e ambienti

## Priorità: prima lo sviluppo locale

Ogni funzionalità si realizza e si verifica prima in locale con Docker. Il deploy è in secondo piano: arriva con una feature dedicata (`deploy`). Comandi di avvio nel `README.md` della root.

## Sviluppo locale

- `docker-compose.yml`: PostgreSQL e Redis. Con il profilo `api` avvia anche l'API dalla stessa immagine Docker della produzione.
- Lo script di init di Postgres crea anche il database dei test (`calories_diary_test`).
- `pnpm dev` avvia API, web e `packages/shared` in watch. Va lanciato con pnpm: con un altro gestore (es. `bun dev`) lo script si ferma subito (`scripts/solo-pnpm.mjs`), perché sotto Git Bash bun non esce con Ctrl+C e lascia il terminale bloccato.
- Gli utenti si creano con `pnpm utente:crea <email>`; l'API richiede `JWT_SECRET` nel `.env` (vedi `apps/api/.env.example`).

## Test e CI

- I test dell'API girano su PostgreSQL e Redis reali (in CI: service container), sul database di test ricreato dalle migrazioni a ogni esecuzione.
- `ci.yml` (su ogni PR e sui push a `main` e `develop`): lint, typecheck, test e build di tutti i pacchetti, più la build dell'immagine Docker dell'API senza push.
- Check da lanciare prima di ogni PR: sezione *Comandi di check* di `CONTRIBUTING.md`.

## Ambienti previsti

Hosting interamente gratuito (senza carta di credito né crediti a scadenza); cold start e sospensione per inattività sono accettati. Tutto ciò che gira lato server è containerizzato, per poterlo spostare (es. su AWS) cambiando solo il target di deploy.

| Ambiente | Branch | Web | API | DB | Redis |
|---|---|---|---|---|---|
| Locale | — | localhost:3000 | localhost:3001 | Docker | Docker |
| Preview | PR | Vercel preview | API di produzione (o staging) | — | — |
| Production | `main` | Vercel | Render (immagine da GHCR) | Neon | Upstash |

- Staging facoltativo (branch `develop`, secondo servizio Render, branch Neon dedicato): da predisporre nei workflow ma lasciare spento finché non serve.
- Pipeline di deploy dell'API prevista: build e push su GHCR, migrazioni verso Neon con la connessione diretta, deploy hook di Render, smoke test su `/health` con attesa lunga.
- Le migrazioni non girano mai all'avvio del container.

## Identità git

I commit di questo repo usano l'email noreply dell'account GitHub `Micheledinocera` (`user.email` locale al repo).

## Domande aperte

- Dettagli del deploy (come passare a Render l'immagine appena pubblicata, accesso di Render al pacchetto GHCR, quote gratuite aggiornate): da verificare nella feature `deploy`.

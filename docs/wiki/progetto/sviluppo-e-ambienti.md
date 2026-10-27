---
tipo: info
aggiornato: 2026-10-27
fonti:
  - raw/compiled/first-develop/setup-progetto.md
  - raw/compiled/first-develop/2026-10-25-decisioni-e-piano.md
  - raw/compiled/first-develop/2026-10-25-scaffolding.md
  - raw/compiled/auth/2026-10-25-bun-dev-ctrlc.md
  - raw/compiled/barcode-scan/2026-10-25-sviluppo-da-telefono.md
  - raw/compiled/deploy/2026-10-26-roadmap.md
  - raw/compiled/ui-tweaks/2026-10-27-decisioni.md
---

# Sviluppo, CI e ambienti

## Priorità: prima lo sviluppo locale

Ogni funzionalità si realizza e si verifica prima in locale con Docker. Il deploy è descritto in [Deploy](./deploy.md). Comandi di avvio nel `README.md` della root.

## Sviluppo locale

- `docker-compose.yml`: PostgreSQL e Redis. Con il profilo `api` avvia anche l'API dalla stessa immagine Docker della produzione.
- Lo script di init di Postgres crea anche il database dei test (`calories_diary_test`).
- `pnpm dev` avvia API, web e `packages/shared` in watch con Turborepo (`turbo.json`, `ui: "tui"`): un pannello di log per processo, Ctrl+C chiude tutto. Turborepo serve solo per `dev`; gli altri script restano `pnpm -r`.
- `scripts/dev.mjs` lancia turbo con Node, non con `turbo` nello script: su Windows pnpm esegue gli script con `cmd /c`, `turbo` diventerebbe `node_modules/.bin/turbo.cmd` e a Ctrl+C cmd chiederebbe "Terminare il processo batch (S/N)?", lasciando il terminale appeso.
- Prima di partire chiude i processi di sviluppo del repo rimasti vivi (`scripts/ferma-dev.mjs`, anche da solo con `pnpm dev:stop`): un terminale chiuso senza Ctrl+C lascia vivi turbo, nuxt, tsx e tsc, che tengono occupate le porte.
- Va lanciato con pnpm: con un altro gestore (es. `bun dev`) lo script si ferma subito (`scripts/solo-pnpm.mjs`), perché sotto Git Bash bun non esce con Ctrl+C e lascia il terminale bloccato.
- **Da telefono** (stessa rete): il web ascolta su `0.0.0.0`, quindi si apre `http://<ip-del-pc>:3000`; l'API passa dal proxy di Nuxt (vedi [App web](../tecnico/web/app.md)). La fotocamera richiede HTTPS: `pnpm dev:https` (task turbo `@calories-diary/web#dev:https`, con API e shared via `with`) usa un certificato autofirmato da accettare sul telefono. Il dev server è raggiungibile da chiunque sia sulla stessa rete: va bene a casa, non su reti pubbliche.
- Gli utenti si creano con `pnpm utente:crea <email>`; l'API richiede `JWT_SECRET` nel `.env` (vedi `apps/api/.env.example`).

## Test e CI

- I test dell'API girano su PostgreSQL e Redis reali (in CI: service container), sul database di test ricreato dalle migrazioni a ogni esecuzione.
- `ci.yml` (su ogni PR e sui push a `main` e `develop`): lint, typecheck, test e build di tutti i pacchetti, più la build dell'immagine Docker dell'API senza push.
- Check da lanciare prima di ogni PR: sezione *Comandi di check* di `CONTRIBUTING.md`.

## Ambienti

Hosting interamente gratuito (senza carta di credito né crediti a scadenza); cold start e sospensione per inattività sono accettati. Tutto ciò che gira lato server è containerizzato, per poterlo spostare (es. su AWS) cambiando solo il target di deploy.

| Ambiente | Branch | Web | API | DB | Redis |
|---|---|---|---|---|---|
| Locale | — | localhost:3000 (anche dalla rete locale) | localhost:3001 (dal web: `/api`) | Docker | Docker |
| Production | `main` | Vercel | Render (immagine da GHCR) | Neon | Upstash |

- Staging facoltativo (branch `develop`, secondo servizio Render, branch Neon dedicato): predisposto nel workflow di deploy, spento.
- Niente preview: Vercel fa il deploy solo da `main` (vedi [Deploy](./deploy.md#configurazione)); feature e PR si provano in locale.
- Pipeline di deploy dell'API, configurazione e backup: [Deploy](./deploy.md).
- Le migrazioni non girano mai all'avvio del container: le lancia la pipeline di deploy.

## Identità git

I commit di questo repo usano l'email noreply dell'account GitHub `Micheledinocera` (`user.email` locale al repo).


# Calories Diary — istruzioni per gli agenti

PWA personale (singolo utente) per il tracciamento giornaliero di calorie e macronutrienti.
Monorepo pnpm: `apps/api` (Express + MikroORM + PostgreSQL + Redis), `apps/web` (Nuxt PWA), `packages/shared` (tipi e schemi zod).

## Principi del progetto

- **Local-first**: il front-end lavora su uno store locale (IndexedDB) e si sincronizza con l'API.
- **Tutte le fonti esterne passano dal back-end**: il front-end parla solo con la nostra API. La scelta del prodotto (DB nostro, poi provider esterno come Open Food Facts) e la normalizzazione dei dati stanno nel back-end, dietro un adapter per provider.
- **Lingua**: italiano ovunque possibile (UI, wiki, nomi di dominio nel codice, descrizioni dei commit). Dettagli in `docs/CLAUDE.md`, sezione *Language*.
- **Prima lo sviluppo locale con Docker**, il deploy viene dopo.
- Ultime versioni stabili delle dipendenze, verificate sulla documentazione ufficiale.

## Project wiki and workflow

- **Conventions** (branches, commits, PRs, check commands): `CONTRIBUTING.md`.
- **Project wiki** (business rules, decisions, custom code): `docs/wiki/`, starting from `docs/wiki/index.md`. Rules for reading and writing it: `docs/CLAUDE.md`.
- **Order of sources when coding**: this file and the `CLAUDE.md` of the folder you work in (framework docs), then `docs/wiki/tecnico/` for custom code, then the business and decision pages before implementing a business rule. If a rule is missing, ask instead of inventing it.
- **Task workflow**: `/start <name>` opens a feature, notes go in `docs/raw/<name>/`, `/report <topic>` writes a dated document for people in `docs/output/`, `/close` updates the wiki (`/ingest`), runs the checks and opens the PR toward `develop`. Analysis-only features are named `study-<topic>`.
- **Study features touch no code**: on a `feature/study-*` branch, change only `docs/`, `.claude/` and `*.md` files. If asked to implement something, don't: propose to close the study (`/close`) and open a new feature (`/start <name>`).

## Framework docs

- Nuxt: server MCP `Nuxt` (documentazione, moduli) e https://nuxt.com/docs
- Vite PWA per Nuxt: https://vite-pwa-org.netlify.app/frameworks/nuxt
- Express: https://expressjs.com/
- MikroORM: https://mikro-orm.io/docs
- ioredis: https://github.com/redis/ioredis
- zod: https://zod.dev
- Dexie (IndexedDB): https://dexie.org/docs
- Open Food Facts API: https://openfoodfacts.github.io/openfoodfacts-server/api/
- Vitest: https://vitest.dev · pino: https://getpino.io

# Calories Diary

PWA personale per il tracciamento giornaliero di calorie e macronutrienti: diario per pasti, alimenti locali consolidati nel tempo, lookup dei prodotti per codice a barre (tramite il back-end, con Open Food Facts come primo provider). Local-first: l'app funziona offline e si sincronizza con l'API.

## Stack

| Livello   | Tecnologia                                      |
| --------- | ----------------------------------------------- |
| Front-end | Nuxt 4 (SPA) + Nuxt UI + Vite PWA, TypeScript   |
| Back-end  | Node.js 24 LTS + Express 5, TypeScript          |
| ORM e DB  | MikroORM 7 + PostgreSQL 18                      |
| Cache     | Redis 8 (`ioredis`)                             |
| Condiviso | `packages/shared`: tipi e schemi zod            |
| Qualità   | ESLint, Prettier, Vitest, Supertest, commitlint |
| Monorepo  | pnpm workspaces                                 |

## Requisiti

- Node.js 24 (`.nvmrc`) e pnpm 12 (`packageManager` in `package.json`)
- Docker (per Postgres e Redis)

## Avvio locale

```bash
pnpm install
docker compose up -d
cp apps/api/.env.example apps/api/.env && cp apps/web/.env.example apps/web/.env
pnpm db:migrate && pnpm db:seed
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:3001 (stato: `/health`)

Per provare l'API dalla stessa immagine Docker della produzione: `docker compose --profile api up -d --build` (prima ferma `pnpm dev`, usa la porta 3001).

## Script principali (dalla root)

| Script                                                      | Cosa fa                                                            |
| ----------------------------------------------------------- | ------------------------------------------------------------------ |
| `pnpm dev`                                                  | API (tsx watch), web (Nuxt) e `shared` in watch, in parallelo      |
| `pnpm build`                                                | Build di tutti i pacchetti (web: sito statico in `.output/public`) |
| `pnpm typecheck` · `pnpm lint` · `pnpm test`                | Controlli; i test dell'API richiedono `docker compose up -d`       |
| `pnpm format`                                               | Prettier su tutto il repo                                          |
| `pnpm db:migrate` · `pnpm db:seed`                          | Migrazioni e dati iniziali (pasti predefiniti)                     |
| `pnpm --filter @calories-diary/api migration:create <nome>` | Nuova migrazione dalle differenze tra entità e schema              |
| `pnpm --filter @calories-diary/api migration:down`          | Annulla l'ultima migrazione                                        |

## Struttura

```
apps/api         Express + MikroORM: src/modules/<dominio>/ (entity, service, routes), migrations/
apps/web         Nuxt SPA + PWA: app/pages, app/composables/useApi.ts
packages/shared  schemi zod e tipi condivisi
docker/          script di init di Postgres (database di test)
docs/            wiki di progetto e note (regole in docs/CLAUDE.md)
```

## Documentazione

- [AGENTS.md](AGENTS.md): principi del progetto e istruzioni per gli agenti AI.
- [CONTRIBUTING.md](CONTRIBUTING.md): rami (git-flow), commit, check, PR.
- [docs/wiki/index.md](docs/wiki/index.md): wiki di progetto.

## Dati

Parte dei dati sugli alimenti proviene da [Open Food Facts](https://world.openfoodfacts.org), disponibile con licenza [ODbL](https://opendatacommons.org/licenses/odbl/1-0/).

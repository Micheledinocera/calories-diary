# Scaffolding — scelte tecniche

Note dallo scaffolding del monorepo (2026-10-25).

## Versioni (ultime stabili verificate su npm il 2026-10-25)

- Node 24 LTS (`.nvmrc`), pnpm 12.15 (`packageManager`).
- Nuxt 4.6, Nuxt UI 4.12, @vite-pwa/nuxt 1.1 (vite-plugin-pwa 1.3, supporta Vite 8), Tailwind 4.
- Express 5.3, MikroORM 7.2, ioredis 6, zod 4, pino 10, Vitest 5, ESLint 10.
- PostgreSQL 18 e Redis 8 (immagini Docker alpine) in locale e in CI.
- **TypeScript 6.0, non 7**: TypeScript 7 (port nativo) non espone ancora l'API JS usata da typescript-eslint (peer `<6.1`) e vue-tsc. Dependabot ignora i major di TypeScript finché non sono supportati.

## Scelte

- **MikroORM 7**: entità con `defineEntity` (niente decorator né reflect-metadata). Le connessioni sono lazy: l'health check usa `select 1`, perché `checkConnection()` risponde "non connesso" prima della prima query.
- **Migrazioni e seed** con uno script nostro (`src/db/cli.ts`) invece della CLI di MikroORM: stesso comando in sviluppo (tsx) e in produzione (node da `dist`), così la pipeline potrà lanciare le migrazioni con l'immagine compilata. Usano `DATABASE_URL_DIRECT` se presente.
- **Seed** idempotente: i quattro pasti predefiniti (Colazione, Pranzo, Cena, Spuntino). L'entità `Pasto` con `GET /pasti` e `GET /pasti/:id` è l'esempio del pattern a moduli.
- **`/health`**: 200 se DB e Redis rispondono, 503 altrimenti (body `{ stato, db, redis, versione }`); la versione è lo sha git passato in build all'immagine Docker.
- **`packages/shared`** compilato in `dist` (postinstall della root, watch in `pnpm dev`): API e web importano il JS compilato, senza alias o condizioni custom.
- **Web**: SPA (`ssr: false`) generata come sito statico (`nuxt generate`); icone PWA generate da `public/logo.svg`; `useApi` con timeout di 90 s sulla prima chiamata (cold start del server) e 15 s dopo; errori normalizzati in `{ codice, messaggio }`.
- **pnpm 12** blocca gli script di install delle dipendenze: quelli ammessi sono elencati in `allowBuilds` di `pnpm-workspace.yaml`. `vite-plugin-pwa` è dipendenza diretta del web perché i tipi che il modulo Nuxt referenzia siano risolvibili senza hoisting.
- **Docker**: immagine multi-stage, `pnpm deploy --legacy` per avere solo le dipendenze di produzione, utente `node`, HEALTHCHECK su `/health`. `docker compose --profile api` avvia l'API dall'immagine.
- **Test dell'API** su un database dedicato (`calories_diary_test`, creato dallo script di init di Postgres); il setup globale ricrea lo schema dalle migrazioni e lancia il seed.
- **Prettier** non formatta `.claude/` e `docs/` (file del kit e note raw).

## Identità git

- Commit di questo repo con `user.email` locale `7524351+Micheledinocera@users.noreply.github.com` (account GitHub Micheledinocera). L'email globale è collegata a un altro account GitHub (`mdinocera`): i primi due commit restano attribuiti a quello, per scelta.

## MCP

- Progetto (`.mcp.json`): `nuxt-ui`, `context7` (documentazione delle librerie), `playwright` (prova della PWA nel browser).
- Livello utente: `Nuxt` (documentazione Nuxt), non duplicato nel progetto.
- Da valutare con la feature `deploy`: MCP ufficiali di Neon, Render, Vercel e Upstash.

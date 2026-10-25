# Setup progetto — istruzioni per lo scaffolding

Questo documento descrive stack, architettura, struttura del repository e pipeline di deploy.
Le **specifiche funzionali** del progetto ti verranno fornite a parte: unisci le due cose e crea lo scaffolding iniziale.

## Obiettivo

- Progetto full stack di studio, con stack simile a **Medusa v2 / Mercur** (Node + Express, MikroORM, Postgres, Redis).
- Deploy **interamente gratuito** (nessun servizio che richieda carta di credito o con crediti a scadenza).
- Imparare a gestire in autonomia la parte DevOps: Docker, GitHub Actions, migrazioni, ambienti, secret.
- Cold start e servizi che si sospendono per inattività **non sono un problema**.
- Tutto ciò che gira lato server deve essere containerizzato, così in futuro si potrà spostare su AWS cambiando solo il target di deploy.

## Regole per Claude Code

1. Usa sempre le **ultime versioni stabili** di ogni dipendenza; verifica nella documentazione ufficiale invece di affidarti alla memoria.
2. Se le specifiche del progetto entrano in conflitto con questo documento, **chiedimi** prima di decidere.
3. Non implementare funzionalità non presenti nelle specifiche: lo scaffolding deve essere pulito e minimale, con al massimo un esempio di entità/endpoint per mostrare il pattern.
4. Nessun secret nel repository: solo file `.env.example` documentati.
5. Alla fine elenca i **passaggi manuali** che devo fare io (creazione account, secret, collegamenti) in `docs/deploy.md`.

## Stack

| Livello | Tecnologia | Hosting gratuito |
|---|---|---|
| Front-end | Nuxt (Vue 3) + TypeScript | Vercel (piano Hobby) |
| Back-end | Node.js LTS + Express + TypeScript | Render (web service Free, da Docker) |
| ORM | MikroORM (driver PostgreSQL) | — |
| Database | PostgreSQL | Neon (piano Free) |
| Cache / code | Redis (client `ioredis`) | Upstash (piano Free) |
| Registry immagini | GitHub Container Registry (GHCR) | gratuito |
| CI/CD | GitHub Actions | gratuito |

Scelte di contorno:
- Package manager: **pnpm** con workspaces.
- Validazione: **zod** (schemi condivisi tra front-end e back-end dove ha senso).
- Logging API: **pino**.
- Test: **Vitest** (API e web), **Supertest** per gli endpoint.
- Qualità: ESLint (flat config) + Prettier, `tsc --noEmit` per il typecheck.
- Commit: Conventional Commits (commitlint + husky + lint-staged).
- Dipendenze: Dependabot (npm, GitHub Actions, Docker).
- Versione Node fissata in `.nvmrc` e nel campo `engines`.

## Struttura del repository

```
.
├── apps/
│   ├── api/                  # Express + MikroORM
│   │   ├── src/
│   │   │   ├── config/       # lettura e validazione env con zod
│   │   │   ├── modules/      # un modulo per dominio (route, service, entity)
│   │   │   ├── middlewares/  # error handler, request logger, validation
│   │   │   ├── db/           # mikro-orm.config.ts, seeders
│   │   │   ├── lib/          # redis client, logger
│   │   │   ├── app.ts        # crea l'app Express (testabile senza listen)
│   │   │   └── server.ts     # entrypoint: listen + graceful shutdown
│   │   ├── migrations/
│   │   ├── test/
│   │   ├── Dockerfile
│   │   └── .env.example
│   └── web/                  # Nuxt
│       ├── app/ (o struttura standard Nuxt)
│       ├── composables/useApi.ts
│       └── .env.example
├── packages/
│   └── shared/               # tipi e schemi zod condivisi
├── docker-compose.yml        # Postgres + Redis per lo sviluppo locale
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   └── deploy-api.yml
│   └── dependabot.yml
├── docs/
│   ├── architecture.md
│   └── deploy.md
├── .nvmrc
├── pnpm-workspace.yaml
└── README.md
```

## Back-end (apps/api)

- Pattern modulare ispirato a Medusa: ogni dominio in `src/modules/<nome>/` con entity, service, route.
- `GET /health`: risponde 200 con stato di DB e Redis (usato da Render e dallo smoke test).
- Config validata con zod all'avvio: se manca una variabile, il processo termina con un messaggio chiaro.
- Error handler centralizzato con risposte JSON coerenti.
- CORS limitato alle origini in `CORS_ORIGINS` (lista separata da virgole, include gli URL di preview Vercel tramite pattern).
- Graceful shutdown su SIGTERM (chiusura ORM e Redis).
- MikroORM:
  - migrazioni versionate in `migrations/`, script `migration:create`, `migration:up`, `migration:down`;
  - le migrazioni **non** girano all'avvio del container, ma nella pipeline (vedi sotto);
  - usa la connection string **pooled** di Neon per l'app e quella **diretta** per le migrazioni.
- Redis: client unico in `src/lib/redis.ts`, supporto a `rediss://` (TLS, richiesto da Upstash). Prefisso chiavi per ambiente (`REDIS_PREFIX`). Il piano Free di Upstash ha un limite di comandi: evita polling continuo; se servono code, documenta il compromesso.

### Variabili d'ambiente API

```
NODE_ENV=
PORT=
DATABASE_URL=            # Neon pooled
DATABASE_URL_DIRECT=     # Neon diretta, solo migrazioni
REDIS_URL=
REDIS_PREFIX=
CORS_ORIGINS=
LOG_LEVEL=
```

### Dockerfile

- Multi-stage (deps → build → runtime) basato su immagine Node LTS slim.
- Utente non root, solo dipendenze di produzione nell'immagine finale.
- `HEALTHCHECK` sull'endpoint `/health`.
- Build contestualizzata alla root del monorepo (serve `packages/shared`), con `.dockerignore` adeguato.

## Front-end (apps/web)

- Nuxt con TypeScript strict.
- URL dell'API tramite `runtimeConfig.public.apiBase` (env `NUXT_PUBLIC_API_BASE`).
- Composable `useApi` che incapsula `$fetch` con base URL e gestione errori.
- Gestisci il cold start dell'API: stato di caricamento esplicito e timeout generoso sulle prime chiamate.
- Deploy tramite **integrazione Git di Vercel** (preview automatica per ogni PR, produzione su `main`); root directory `apps/web`.

## Sviluppo locale

- `docker compose up -d` avvia Postgres e Redis.
- `pnpm dev` avvia API e web in parallelo.
- `pnpm db:migrate` e `pnpm db:seed` dalla root.
- Il README deve permettere di partire da zero in meno di 5 comandi.

## Ambienti

| Ambiente | Branch | Web | API | DB |
|---|---|---|---|---|
| Locale | — | localhost | localhost | Docker |
| Preview | PR | Vercel preview | API di produzione (o staging se presente) | — |
| Production | `main` | Vercel | Render | Neon branch `main` |

Uno **staging** opzionale (branch `develop`, secondo servizio Render, branch Neon dedicato) va predisposto nei workflow ma lasciato disattivato finché non lo chiedo. Il limite di 750 ore/mese di Render è condiviso tra i servizi free, ma con lo sleep per inattività non è un problema.

## CI/CD (GitHub Actions)

### `ci.yml` — su ogni PR e push
1. Setup pnpm + Node da `.nvmrc`, con cache.
2. Lint, typecheck, test per tutti i workspace.
3. I test dell'API usano **service container** Postgres e Redis.
4. Build dell'immagine Docker dell'API (senza push) per verificare che compili.

### `deploy-api.yml` — su push a `main` (solo se cambiano `apps/api` o `packages/shared`)
1. Build dell'immagine e push su **GHCR** con tag `sha` e `latest`.
2. Esecuzione delle migrazioni MikroORM verso Neon (`DATABASE_URL_DIRECT`).
3. Deploy su Render tramite **deploy hook** (verifica nella documentazione Render come passare l'immagine appena pubblicata a un servizio basato su immagine).
4. Smoke test su `/health` con retry e attesa lunga (fino a ~3 minuti) per tollerare il cold start.
5. Usa `environment: production` di GitHub per i secret e `concurrency` per evitare deploy sovrapposti.

### Secret richiesti su GitHub
```
DATABASE_URL_DIRECT
RENDER_DEPLOY_HOOK_URL
API_HEALTH_URL
```
(GHCR usa il `GITHUB_TOKEN`; le altre variabili runtime vanno impostate direttamente su Render e Vercel.)

## Documentazione da generare

- `README.md`: cos'è il progetto, requisiti, avvio locale, script principali.
- `docs/architecture.md`: schema dei componenti (diagramma Mermaid) e flusso delle richieste.
- `docs/deploy.md`: checklist dei passaggi manuali — creazione progetto Neon, database Upstash, servizio Render da immagine GHCR (con pacchetto GHCR reso accessibile a Render), progetto Vercel con root `apps/web`, variabili d'ambiente per ciascun servizio, secret GitHub.

## Specifiche del progetto

> Verranno fornite separatamente. Usale per definire moduli, entità, endpoint e pagine.

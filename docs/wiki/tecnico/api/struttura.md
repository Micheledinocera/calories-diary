---
tipo: info
aggiornato: 2026-10-25
fonti:
  - raw/compiled/first-develop/2026-10-25-scaffolding.md
  - raw/compiled/auth/2026-10-25-implementazione.md
---

# Struttura dell'API

`apps/api`: Express 5 + MikroORM 7 + ioredis, ESM, TypeScript compilato con `tsc` in `dist/`.

## Cartelle

| Percorso | Contenuto |
|---|---|
| `src/app.ts` | `creaApp(deps)`: costruisce l'app Express senza `listen`, usata anche dai test |
| `src/server.ts` | Entrypoint: carica env, inizializza ORM e Redis, `listen`, chiusura pulita su SIGTERM/SIGINT (timeout 10 s) |
| `src/config/env.ts` | `caricaEnv()`: variabili d'ambiente validate con zod; se mancano o non sono valide il processo termina con l'elenco degli errori |
| `src/modules/<dominio>/` | Un modulo per dominio: `*.entity.ts`, `*.service.ts`, `*.routes.ts` |
| `src/middlewares/` | `valida` (zod), `autenticazione` (Bearer), `errori` (404 e gestore centrale), `cors` |
| `src/lib/` | `logger` (pino), `redis` (client unico), `errori` (`ErroreApp`), `password` (scrypt) |
| `src/db/` | Configurazione ORM, elenco entità, CLI di migrazioni, seed e creazione utenti, seeder — vedi [Database](./database.md) |
| `migrations/` | Migrazioni versionate |
| `test/` | Test di integrazione con Supertest |

## Pattern di un modulo

- **Entity** con `defineEntity` di MikroORM, registrata in `src/db/entita.ts`.
- **Service** creato da una funzione che riceve l'`EntityManager` (`creaXService(em)`), restituisce DTO tipizzati con i tipi di `@calories-diary/shared`, mai entità.
- **Router** creato da una funzione (`xRouter(em)`), montato in `app.ts`. Ogni richiesta ha il proprio fork dell'EntityManager tramite `RequestContext`.
- Validazione con il middleware `valida({ params, query, body })`: i valori validati si leggono con `datiValidati(res, parte)`, perché in Express 5 `req.query` è in sola lettura.

Esempio: [Pasti](./pasti.md). Le rotte protette leggono l'utente con `utenteCorrente(res)` (vedi [Autenticazione e utenti](./auth.md)).

## Middleware, in ordine

1. `helmet`; CORS limitato a `CORS_ORIGINS` (lista separata da virgole, `*` vale qualsiasi sequenza: es. `https://calories-diary-*.vercel.app`; le richieste senza `Origin` passano).
2. `pino-http` (escluso `/health` dai log di accesso), `express.json` (max 1 MB).
3. `GET /health`, fuori dal `RequestContext`.
4. `RequestContext` di MikroORM, poi le rotte dei moduli: `/auth` e, dietro `richiediAutenticazione`, `/pasti`.
5. 404 JSON per le rotte sconosciute, gestore centrale degli errori.

## Formato degli errori

Ogni errore è un JSON `{ errore: { codice, messaggio, dettagli? } }` (schema `erroreApiSchema` in shared):

| Caso | Status | `codice` |
|---|---|---|
| `ErroreApp` lanciato dal codice | il suo | il suo (es. `NON_TROVATO`) |
| Validazione zod | 400 | `VALIDAZIONE` (`dettagli` = issue di zod) |
| JSON del body non valido | 400 | `JSON_NON_VALIDO` |
| Token mancante, non valido o scaduto | 401 | `NON_AUTENTICATO` |
| Login con credenziali errate | 401 | `CREDENZIALI_ERRATE` |
| Troppi tentativi di login | 429 | `TROPPI_TENTATIVI` (`dettagli.riprovaTraS`) |
| Rotta sconosciuta | 404 | `NON_TROVATO` |
| Altro | 500 | `ERRORE_INTERNO` (loggato) |

## Health check

`GET /health` risponde `{ stato, db, redis, versione }`: 200 se DB e Redis rispondono, 503 altrimenti. Il DB si verifica con `select 1`, perché MikroORM 7 si connette in modo lazy. `versione` è `APP_VERSION` (sha git passato all'immagine Docker, `dev` in locale). È usato dall'HEALTHCHECK Docker e servirà a Render e allo smoke test del deploy.

## Redis

Client unico (`creaRedis`), connessione lazy, prefisso chiavi `REDIS_PREFIX` per ambiente; `rediss://` attiva TLS (Upstash). Upstash Free ha una quota mensile di comandi: niente polling né comandi bloccanti. Oggi è usato dall'health check e dal [rate limit del login](./auth.md#rate-limit-del-login); servirà per la cache dei provider.

## Variabili d'ambiente

Documentate in `apps/api/.env.example`: `NODE_ENV`, `PORT`, `DATABASE_URL` (Neon pooled), `DATABASE_URL_DIRECT` (Neon diretta, solo migrazioni), `REDIS_URL`, `REDIS_PREFIX`, `CORS_ORIGINS`, `LOG_LEVEL`, `JWT_SECRET` (chiave dei token, almeno 32 caratteri), `APP_VERSION`.

## Immagine Docker

`apps/api/Dockerfile`, build dalla root del monorepo: stadi deps → build → runtime su `node:24-slim`, solo dipendenze di produzione (`pnpm deploy --prod --legacy`), utente `node`, HEALTHCHECK su `/health`, `CMD node dist/src/server.js`.

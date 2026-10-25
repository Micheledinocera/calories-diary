---
tipo: info
aggiornato: 2026-10-25
fonti:
  - raw/compiled/first-develop/2026-10-25-scaffolding.md
  - raw/compiled/auth/2026-10-25-implementazione.md
  - raw/compiled/food-catalog/2026-10-25-open-food-facts-e-perimetro.md
  - raw/compiled/diary/2026-10-25-decisioni-diario.md
---

# Database, migrazioni e seed

Documentazione di MikroORM: https://mikro-orm.io/docs (qui solo le scelte del progetto).

## Configurazione

`src/db/mikro-orm.config.ts`, funzione `creaConfigOrm(env, { diretta })`:
- driver PostgreSQL, `clientUrl` da `DATABASE_URL`, oppure da `DATABASE_URL_DIRECT` con `diretta: true` (migrazioni);
- entità elencate in `src/db/entita.ts`;
- estensioni `Migrator` e `SeedManager`;
- naming di default: proprietà camelCase → colonne snake_case (`creatoIl` → `creato_il`).

## Migrazioni e seed

Si usa uno script nostro, `src/db/cli.ts`, non la CLI di MikroORM: lo stesso comando funziona in sviluppo (tsx, con `.env`) e in produzione dall'immagine compilata (`node dist/src/db/cli.js migration:up`).

| Comando (in `apps/api`) | Cosa fa |
|---|---|
| `pnpm migration:create <nome>` | Genera una migrazione TS dalle differenze tra entità e snapshot |
| `pnpm migration:up` | Applica le migrazioni pendenti (anche `pnpm db:migrate` dalla root) |
| `pnpm migration:down` | Annulla l'ultima migrazione |
| `pnpm seed` | Lancia `DatabaseSeeder` (anche `pnpm db:seed` dalla root) |
| `pnpm utente:crea <email>` | Crea un utente (anche dalla root) — vedi [Autenticazione e utenti](./auth.md#creazione-degli-utenti) |

- Le migrazioni stanno in `apps/api/migrations/` con lo snapshot dello schema (`.snapshot-*.json`, aggiornato solo da `migration:create`); vengono compilate in `dist/migrations/`.
- Le migrazioni **non** girano all'avvio del container: le lancerà la pipeline di deploy.
- `DatabaseSeeder` oggi non inserisce nulla: i tipi di pasto sono fissi nel codice e gli utenti si creano con `utente:crea`. Resta come posto per dati futuri.
- La migrazione `diario` ha trasformato `pasto` da lista dei tipi di pasto per utente a pasti di un giorno, cancellando le righe esistenti (non avevano un giorno).

## Test

Il `globalSetup` di Vitest ricrea il database `calories_diary_test` (drop, migrazioni, utenti di test, seed) e azzera su Redis le chiavi che sopravvivono tra un'esecuzione e l'altra (`login:*`, `provider:*`, `catalogo:*`). I test dell'API usano un provider finto: Open Food Facts non viene mai chiamato. Le variabili di test sono in `vitest.config.ts`; in CI gli URL si possono cambiare con `DATABASE_URL_TEST` e `REDIS_URL_TEST`.

---
tipo: info
aggiornato: 2026-10-25
fonti:
  - raw/compiled/first-develop/2026-10-25-scaffolding.md
---

# App web

`apps/web`: Nuxt 4 con struttura `app/`. Documentazione: Nuxt (MCP `Nuxt`, https://nuxt.com/docs), Nuxt UI (MCP `nuxt-ui`), Vite PWA (https://vite-pwa-org.netlify.app/frameworks/nuxt).

## Configurazione (`nuxt.config.ts`)

- `ssr: false`: SPA generata come sito statico con `pnpm build` (`nuxt generate`, output in `.output/public`).
- Moduli: `@nuxt/ui` (tema in `app/app.config.ts`: primary `green`, neutral `zinc`), `@nuxt/eslint`, `@vite-pwa/nuxt`.
- `runtimeConfig.public.apiBase`: URL dell'API, da `NUXT_PUBLIC_API_BASE` (default `http://localhost:3001`).
- `lang="it"`.

## PWA

- Manifest "Calories Diary" / "Calorie", `display: standalone`, colore `#16a34a`.
- Icone generate in build da `public/logo.svg` (`pwa-assets.config.ts`, preset `minimal2023`) e inserite nel manifest; `<NuxtPwaAssets />` in `app.vue`.
- Service worker `generateSW` con aggiornamento automatico, fallback di navigazione su `/`, precache di JS, CSS, HTML, immagini e font.
- PWA disattivata in `nuxt dev` (`devOptions.enabled: false`): per provarla serve una build.
- `vite-plugin-pwa` è dipendenza diretta perché i tipi referenziati dal modulo siano risolvibili con pnpm.

## Chiamate all'API

- `app/composables/useApi.ts`: `api<T>(path, opzioni)` è `$fetch` con `baseURL` dell'API, un retry, timeout di **90 s** finché il server non ha risposto almeno una volta nella sessione (avvio a freddo dell'hosting gratuito), poi 15 s. Espone `sveglia` (il server ha già risposto).
- `app/utils/errori-api.ts`: `normalizzaErrore(err)` trasforma ogni errore in `{ codice, messaggio, status? }`: body di errore dell'API, `TIMEOUT`, `HTTP` o `RETE`.

## Pagine

- `pages/index.vue`: pagina provvisoria dello scaffolding. Mostra lo stato di `/health` e i pasti; dopo 3 s di attesa avvisa che il server si sta risvegliando.

## Test

Vitest in ambiente node per il codice puro (`test/`). Per testare i componenti servirà `@nuxt/test-utils`.

## Domande aperte

- Lo store locale (Dexie su IndexedDB) e la sync arriveranno con la feature `sync`.

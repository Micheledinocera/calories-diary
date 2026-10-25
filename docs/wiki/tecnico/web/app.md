---
tipo: info
aggiornato: 2026-10-25
fonti:
  - raw/compiled/first-develop/2026-10-25-scaffolding.md
  - raw/compiled/auth/2026-10-25-implementazione.md
  - raw/compiled/offline-cache/2026-10-25-cache-in-analisi.md
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

- `app/composables/useApi.ts`: `api<T>(path, opzioni)` è `$fetch` con `baseURL` dell'API e il token della sessione come `Authorization: Bearer`, un retry, timeout di **90 s** finché il server non ha risposto almeno una volta nella sessione (avvio a freddo dell'hosting gratuito), poi 15 s. Espone `sveglia` (il server ha già risposto).
- Un 401 `NON_AUTENTICATO` su una chiamata con token chiude la sessione e porta a `/login`.
- `app/utils/errori-api.ts`: `normalizzaErrore(err)` trasforma ogni errore in `{ codice, messaggio, status? }`: body di errore dell'API, `TIMEOUT`, `HTTP` o `RETE`.

## Sessione e login

Regole nella decisione [Autenticazione multiutente](../../progetto/decisione-autenticazione.md).

- `app/composables/useSessione.ts`: `sessione`, `accedi(credenziali)`, `rinnova()`, `esci()`. La sessione (`Sessione` di shared) sta in `localStorage` (`calories-diary:sessione`) e viene validata con `sessioneSchema` alla lettura (`app/utils/sessione.ts`). Il login non fa retry: ogni tentativo conta nel rate limit.
- `app/middleware/autenticazione.global.ts`: senza sessione ogni pagina porta a `/login`; con sessione `/login` porta alla home. Un token scaduto localmente non blocca l'app (uso offline): se ne accorge l'API alla prima chiamata.
- `app/plugins/rinnovo-sessione.client.ts`: rinnovo scorrevole. Chiama `POST /auth/rinnova` all'avvio, al ritorno online e quando l'app torna in primo piano, ma solo se il token ha più di un giorno (`daRinnovare`): resta sempre circa una settimana di margine offline senza chiamare l'API a ogni apertura. Gli errori di rete si ignorano.

## Pagine

- `pages/login.vue`: `UAuthForm` di Nuxt UI con email e password, validato con `credenzialiSchema`; mostra il messaggio d'errore dell'API.
- `pages/index.vue`: pagina provvisoria dello scaffolding. Mostra email dell'utente e pulsante "Esci", lo stato di `/health` e i pasti dell'utente; dopo 3 s di attesa avvisa che il server si sta risvegliando.

## Test

Vitest in ambiente node per il codice puro (`test/`). Per testare i componenti servirà `@nuxt/test-utils`.

## Domande aperte

- Cache offline in sola lettura: contenuto e implementazione in analisi (vedi [Cache offline](../../progetto/decisione-cache-offline.md)).

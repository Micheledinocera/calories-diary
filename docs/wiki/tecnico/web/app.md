---
tipo: info
aggiornato: 2026-10-25
fonti:
  - raw/compiled/first-develop/2026-10-25-scaffolding.md
  - raw/compiled/auth/2026-10-25-implementazione.md
  - raw/compiled/offline-cache/2026-10-25-cache-in-analisi.md
  - raw/compiled/foods/2026-10-25-implementazione.md
  - raw/compiled/diary/2026-10-25-decisioni-diario.md
  - raw/compiled/diary/2026-10-25-obiettivo.md
  - raw/compiled/barcode-scan/2026-10-25-libreria-scansione.md
  - raw/compiled/barcode-scan/2026-10-25-sviluppo-da-telefono.md
---

# App web

`apps/web`: Nuxt 4 con struttura `app/`. Documentazione: Nuxt (MCP `Nuxt`, https://nuxt.com/docs), Nuxt UI (MCP `nuxt-ui`), Vite PWA (https://vite-pwa-org.netlify.app/frameworks/nuxt).

## Configurazione (`nuxt.config.ts`)

- `ssr: false`: SPA generata come sito statico con `pnpm build` (`nuxt generate`, output in `.output/public`).
- Moduli: `@nuxt/ui` (tema in `app/app.config.ts`: primary `green`, neutral `zinc`), `@nuxt/eslint`, `@vite-pwa/nuxt`.
- `runtimeConfig.public.apiBase`: URL dell'API, da `NUXT_PUBLIC_API_BASE` (default `http://localhost:3001`), usato dalla build.
- In sviluppo (`$development`) `apiBase` è `/api` e `nitro.devProxy` inoltra `/api/*` a `http://localhost:3001`, togliendo il prefisso: il web chiama la propria origine, senza CORS, e dal telefono l'API si raggiunge attraverso Nuxt. Per questo nel `.env` del web `NUXT_PUBLIC_API_BASE` resta commentato in sviluppo.
- `lang="it"`; in `app.vue` `UApp` usa la locale italiana di Nuxt UI (etichette dei componenti e date del calendario).

## PWA

- Manifest "Calories Diary" / "Calorie", `display: standalone`, colore `#16a34a`.
- Icone generate in build da `public/logo.svg` (`pwa-assets.config.ts`, preset `minimal2023`) e inserite nel manifest; `<NuxtPwaAssets />` in `app.vue`.
- Service worker `generateSW` con aggiornamento automatico, fallback di navigazione su `/`, precache di JS, CSS, HTML, immagini e font (non del `.wasm` del lettore di barcode, che serve solo online).
- PWA disattivata in `nuxt dev` (`devOptions.enabled: false`): per provarla serve una build.
- `vite-plugin-pwa` è dipendenza diretta perché i tipi referenziati dal modulo siano risolvibili con pnpm.

## Chiamate all'API

- `app/composables/useApi.ts`: `api<T>(path, opzioni)` è `$fetch` con `baseURL` dell'API e il token della sessione come `Authorization: Bearer`, un retry, timeout di **90 s** finché il server non ha risposto almeno una volta nella sessione (avvio a freddo dell'hosting gratuito), poi 15 s. Espone `sveglia` (il server ha già risposto).
- Un 401 `NON_AUTENTICATO` su una chiamata con token chiude la sessione e porta a `/login`.
- `app/composables/useAlimenti.ts`: chiamate di `/alimenti` e del lookup per barcode. `app/composables/useDiario.ts`: chiamate di `/diario` e `/obiettivi`. Le scritture (POST, PATCH, DELETE) non fanno retry: una richiesta scaduta lato client potrebbe essere già stata applicata.
- `app/utils/errori-api.ts`: `normalizzaErrore(err)` trasforma ogni errore in `{ codice, messaggio, status? }`: body di errore dell'API, `TIMEOUT`, `HTTP` o `RETE`.

## Sessione e login

Regole nella decisione [Autenticazione multiutente](../../progetto/decisione-autenticazione.md).

- `app/composables/useSessione.ts`: `sessione`, `accedi(credenziali)`, `rinnova()`, `esci()`. La sessione (`Sessione` di shared) sta in `localStorage` (`calories-diary:sessione`) e viene validata con `sessioneSchema` alla lettura (`app/utils/sessione.ts`). Il login non fa retry: ogni tentativo conta nel rate limit.
- `app/middleware/autenticazione.global.ts`: senza sessione ogni pagina porta a `/login`; con sessione `/login` porta alla home. Un token scaduto localmente non blocca l'app (uso offline): se ne accorge l'API alla prima chiamata.
- `app/plugins/rinnovo-sessione.client.ts`: rinnovo scorrevole. Chiama `POST /auth/rinnova` all'avvio, al ritorno online e quando l'app torna in primo piano, ma solo se il token ha più di un giorno (`daRinnovare`): resta sempre circa una settimana di margine offline senza chiamare l'API a ogni apertura. Gli errori di rete si ignorano.

## Pagine

La UI è provvisoria: flussi ed esperienza si validano con un giro di design a fine MVP.

- `layouts/default.vue`: barra in alto con "Oggi", "Calendario" e "Alimenti" e menu account con "Profilo" ed "Esci". `login.vue` è senza layout.
- `pages/login.vue`: `UAuthForm` di Nuxt UI con email e password, validato con `credenzialiSchema`; mostra il messaggio d'errore dell'API.
- `pages/index.vue` ("Oggi"): `DiarioGiornata` del giorno locale, sempre modificabile; il giorno si aggiorna quando l'app torna in primo piano (aperta a cavallo della mezzanotte).
- `pages/diario/index.vue`: calendario (`UCalendar`) con un pallino sui giorni con voci: verde entro il fabbisogno, arancione oltre (`primary` se il fabbisogno non c'è). Carica i riepiloghi del mese mostrato più le settimane vicine; un giorno apre `/diario/<giorno>` (oggi apre `/`).
- `pages/diario/[giorno].vue`: stessa `DiarioGiornata`, in sola lettura finché non si preme "Modifica"; frecce per il giorno prima e dopo.
- `pages/profilo.vue`: email, fabbisogno e ripartizione dei macro (validati con `obiettiviSchema`, con il totale delle quote e il ritorno a 50/30/20).
- `pages/alimenti/index.vue`: ricerca (300 ms dopo l'ultimo tasto), sezioni "Recenti" e "Più usati" (solo se non vuote), "Tutti"; interruttore per gli archiviati.
- `pages/alimenti/nuovo.vue`: ricerca per codice a barre, inserito a mano o letto con la fotocamera (icona accanto al campo, apre `ScansioneBarcode`; il codice letto va nel campo e avvia la ricerca). Se il prodotto c'è, precompila il form con kcal, macro e la porzione del provider come predefinita, e mostra avvisi e attribuzione a Open Food Facts; se non c'è, il barcode resta nel form per l'inserimento manuale. Su 409 `ALIMENTO_ESISTENTE` propone di aprire l'alimento esistente.
- `pages/alimenti/[id].vue`: modifica, verifica, archivia/ripristina, elimina (solo se mai usato).
- `components/AlimentoForm.vue`: form condiviso (validato con `nuovoAlimentoSchema`), con valori per 100, porzioni e flag verificato. Lo stato è `StatoFormAlimento` (`app/utils/alimenti.ts`), con valori vuoti mentre si compila; lì anche `statoDaProdotto`, `statoDaAlimento` e `formattaValore` (arrotondamento solo in visualizzazione).
- `components/ScansioneBarcode.vue`: modale (`v-model:open`, evento `letto`) con la fotocamera posteriore (`getUserMedia`, `facingMode: "environment"`) e una lettura ogni 200 ms; al primo codice valido ferma la fotocamera e si chiude. Lettore: ponyfill `BarcodeDetector` di `barcode-detector` (ZXing-C++ in WebAssembly, via `zxing-wasm`), uguale su tutti i browser (iOS Safari e Firefox non hanno l'API nativa). Ponyfill e `.wasm` (~950 KB) si caricano con `import()` solo all'apertura; il `.wasm` è servito dal nostro bundle (`prepareZXingModule` con `locateFile`), non dal CDN jsDelivr predefinito. Gli errori della fotocamera si mostrano con "Riprova". `getUserMedia` richiede un contesto sicuro: localhost o HTTPS.
- `app/utils/barcode.ts`: `FORMATI_BARCODE` (`ean_13`, `ean_8`, `upc_a`, `upc_e`), `codiceLetto` (primo valore di sole cifre, come la ricerca a mano), `messaggioErroreFotocamera` (errori di `getUserMedia` in italiano).
- `components/AlimentoRiga.vue`: riga della lista con kcal e macro per 100.
- `components/DiarioGiornata.vue`: riepilogo (kcal rispetto al fabbisogno, grammi e quota di ogni macro rispetto alla ripartizione) e pasti del giorno. Ogni scrittura sostituisce la giornata con quella restituita dall'API; gli errori vanno in un toast. Un alimento in un pasto principale si aggiunge con `POST /diario/:giorno/pasti` (il pasto può non avere ancora un id), in uno spuntino con `POST /diario/pasti/:id/voci`.
- Drag and drop degli spuntini: `useSortable` di `@vueuse/integrations` (con `sortablejs`, che gestisce anche il touch), solo dalla maniglia degli spuntini. `onUpdate` rimette il nodo dov'era (il DOM resta a Vue), calcola il nuovo ordine con `nuovoOrdine` (`app/utils/diario.ts`, rifiuta gli spostamenti che cambiano l'ordine dei principali) e lo invia con `PUT /diario/:giorno/ordine`.
- `components/DiarioPasto.vue`: un pasto con voci e totale; in modifica, tocco su una voce per cambiare la quantità o rimuoverla, "Aggiungi alimento", proposta "Come ieri" per un principale vuoto, eliminazione dello spuntino.
- `components/SceltaAlimento.vue`: modale di scelta di un alimento (più usati, o ricerca) e della quantità in g o ml, con anteprima delle kcal. Una per pasto, con chiave propria, carica i dati solo all'apertura.
- `app/utils/diario.ts`: nomi dei pasti, `giornoLocale`, `spostaGiorno`, `formattaGiorno`, `ripartizioneGiorno` (quota delle kcal da ogni macro: 4 kcal/g carboidrati e proteine, 9 kcal/g grassi), `nuovoOrdine`.

## Test

Vitest in ambiente node per il codice puro (`test/`). Per testare i componenti servirà `@nuxt/test-utils`.

## Domande aperte

- Cache offline in sola lettura: contenuto e implementazione in analisi (vedi [Cache offline](../../progetto/decisione-cache-offline.md)).

---
tipo: info
aggiornato: 2026-10-27
fonti:
  - raw/compiled/first-develop/2026-10-25-scaffolding.md
  - raw/compiled/auth/2026-10-25-implementazione.md
  - raw/compiled/offline-cache/2026-10-25-cache-in-analisi.md
  - raw/compiled/foods/2026-10-25-implementazione.md
  - raw/compiled/diary/2026-10-25-decisioni-diario.md
  - raw/compiled/diary/2026-10-25-obiettivo.md
  - raw/compiled/barcode-scan/2026-10-25-libreria-scansione.md
  - raw/compiled/barcode-scan/2026-10-25-sviluppo-da-telefono.md
  - raw/compiled/export/2026-10-25-implementazione.md
  - raw/compiled/pre-deploy/2026-10-25-implementazione.md
  - raw/compiled/ui-tweaks/2026-10-27-task.md
  - raw/compiled/ui-tweaks/2026-10-27-task2.md
  - raw/compiled/ui-tweaks/2026-10-27-decisioni.md
  - raw/compiled/user-login/2026-10-27-implementazione.md
---

# App web

`apps/web`: Nuxt 4 con struttura `app/`. Documentazione: Nuxt (MCP `Nuxt`, https://nuxt.com/docs), Nuxt UI (MCP `nuxt-ui`), Vite PWA (https://vite-pwa-org.netlify.app/frameworks/nuxt).

## Configurazione (`nuxt.config.ts`)

- `ssr: false`: SPA generata come sito statico con `pnpm build` (`nuxt generate`, output in `.output/public`).
- Moduli: `@nuxt/ui` (tema: vedi [Tema](#tema)), `@nuxt/eslint`, `@vite-pwa/nuxt`.
- `runtimeConfig.public.apiBase`: URL dell'API, da `NUXT_PUBLIC_API_BASE` (default `http://localhost:3001`), usato dalla build.
- In sviluppo (`$development`) `apiBase` è `/api` e `nitro.devProxy` inoltra `/api/*` a `http://localhost:3001`, togliendo il prefisso: il web chiama la propria origine, senza CORS, e dal telefono l'API si raggiunge attraverso Nuxt. Per questo nel `.env` del web `NUXT_PUBLIC_API_BASE` resta commentato in sviluppo.
- `lang="it"`; in `app.vue` `UApp` usa la locale italiana di Nuxt UI (etichette dei componenti e date del calendario).

## Tema

Linee guida e design system in [Design](../../progetto/design.md).

- `app/app.config.ts`: `primary: "sky"`, `neutral: "slate"`, `success`/`warning`/`error` green/yellow/red. Card con ombra leggera in chiaro e bordo in scuro; overlay di `UDrawer` e `UModal` col colore `velo`; pulsanti disattivati al 50% di opacità (il 75% predefinito si distingueva poco da quelli attivi).
- `app/assets/css/main.css`: i token del design system come variabili `--cd-*` (chiaro su `:root`, scuro su `.dark`), esposti a Tailwind come colori con `@theme inline` (`bg-sfondo`, `bg-traccia`, `bg-ok`, `bg-ok-tenue`, `bg-attenzione`, `bg-oltre`, `bg-carboidrati`, `stroke-proteine`, `shadow-card`…). `--ui-primary` è sky-700 in chiaro e sky-400 in scuro; il testo di stato usa i 700 in chiaro per il contrasto; `--ui-radius` 0.5rem (card da 16px). Il fondo della pagina è `sfondo`, le card `bg-default`.
- Font Figtree in `@theme` (`--font-sans`): `@nuxt/fonts`, incluso in Nuxt UI, lo scarica in build e lo serve dall'app (funziona offline).
- Chiaro/scuro/sistema con il color mode di Nuxt UI (`useColorMode().preference`), salvato sul dispositivo. Componente `SelettoreTema` (usa `ControlloSegmentato`, controllo segmentato generico con `v-model`, compatto: testo 12 px e icona 14 px, così tre opzioni stanno nel menu account anche a 320 px).

## PWA

- Manifest "Calories Diary" / "Calorie", `display: standalone`, `theme_color` `#0369a1` (il primario), `background_color` `#f1f5f9`.
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

Regole nelle decisioni [Autenticazione multiutente](../../progetto/decisione-autenticazione.md) e [Gestione delle utenze in app](../../progetto/decisione-gestione-utenze.md).

- `app/composables/useSessione.ts`: `sessione`, `accedi(credenziali)`, `rinnova()`, `cambiaUsername(username)` (aggiorna l'utente della sessione, stesso token), `cambiaPassword(dati)` (salva la nuova sessione restituita dall'API), `esci()`. La sessione (`Sessione` di shared) sta in `localStorage` (`calories-diary:sessione`) e viene validata con `sessioneSchema` alla lettura (`app/utils/sessione.ts`): una sessione salvata col vecchio formato (utente con `email`) viene scartata e si rifà il login. Login e scritture non fanno retry: ogni tentativo conta nel rate limit.
- `app/composables/useUtenti.ts`: chiamate di `/utenti` (admin): `elenca`, `crea`, `modifica`, `elimina`.
- `app/middleware/autenticazione.global.ts`: senza sessione ogni pagina porta a `/login`; con sessione `/login` porta alla home; `/utenti` porta alla home chi non è admin (l'API lo verifica comunque). Un token scaduto localmente non blocca l'app (uso offline): se ne accorge l'API alla prima chiamata.
- `app/plugins/rinnovo-sessione.client.ts`: rinnovo scorrevole. Chiama `POST /auth/rinnova` all'avvio, al ritorno online e quando l'app torna in primo piano, ma solo se il token ha più di un giorno (`daRinnovare`): resta sempre circa una settimana di margine offline senza chiamare l'API a ogni apertura. Gli errori di rete si ignorano.

## Pagine

- `layouts/default.vue`: barra in alto con le tab "Oggi", "Calendario" e "Alimenti" (link a pillola fatti a mano; "Oggi" attiva solo sulla home, le altre anche sulle sotto-pagine; sotto i 380 px le tab perdono l'icona, così tab e account stanno nello schermo senza scroll orizzontale) e menu account in un `UPopover` con username, "Obiettivi", "Profilo", "Gestione utenti" (solo admin), `SelettoreTema` ed "Esci"; il pulsante account è evidenziato su queste pagine. In fondo un footer con la versione dell'app (vedi [Versione](#versione)). `login.vue` è senza layout.
- `pages/login.vue`: logo, titolo e `UAuthForm` di Nuxt UI in una card, con username e password, validato con `credenzialiSchema`; mostra il messaggio d'errore dell'API.
- `pages/index.vue` ("Oggi"): `DiarioGiornata` del giorno locale, sempre modificabile; il giorno si aggiorna quando l'app torna in primo piano (aperta a cavallo della mezzanotte).
- `pages/diario/index.vue`: calendario (`UCalendar`) in una card, con un pallino sui giorni con voci nel colore di `statoGiornata` (verde, giallo, rosso; 12 px, anche nella legenda) e la legenda; senza fabbisogno nessun pallino e un invito a impostarlo. Carica i riepiloghi del mese mostrato più le settimane vicine; un giorno apre `/diario/<giorno>` (oggi apre `/`). Il bottone "Esporta" apre `/diario/export`.
- `pages/diario/[giorno].vue`: stessa `DiarioGiornata`, in sola lettura finché non si preme "Modifica"; frecce per il giorno prima e dopo.
- `pages/diario/export.vue`: export di condivisione in markdown. `UCalendar` con `range`, `maximum-days` = `MAX_GIORNI_EXPORT` (7) e `max-value` oggi; parte dagli ultimi 7 giorni. "Genera" chiama in parallelo `GET /obiettivi` e `GET /diario/:giorno` per ogni giorno (nessun endpoint dedicato) e mostra l'anteprima; cambiare intervallo la svuota. Azioni: "Condividi" (Web Share API con il file, solo se `navigator.canShare` accetta file), "Scarica .md" (Blob e link `download`), "Copia" (appunti). File `diario-<da>_<a>.md` (`diario-<giorno>.md` per un giorno).
- `app/utils/export.ts`: `markdownDiario(giornate, obiettivi)`, funzione pura. Titolo, periodo, obiettivi; tabella "Riepilogo" (kcal e macro per giorno) solo con più giorni; per ogni giorno, in ordine di data, kcal rispetto al fabbisogno e grammi e quota di ogni macro rispetto alla ripartizione, poi una tabella per pasto (alimento e marca, quantità, kcal, macro, totale). Pasti vuoti saltati, giorno vuoto con "Nessun alimento registrato.". Numeri con `formattaValore`; i caratteri markdown dei nomi sono escapati per non rompere le tabelle.
- `pages/obiettivi.vue`: fabbisogno e ripartizione dei macro (validati con `obiettiviSchema`), con i grammi obiettivo sotto ogni quota, una barra della ripartizione, il totale delle quote e "Valori consigliati" (50/30/20). Qui portano gli inviti a impostare il fabbisogno.
- `pages/profilo.vue`: username (salva solo se valido e diverso dall'attuale), cambio password (attuale, nuova, ripeti; il pulsante si attiva solo quando i tre campi sono validi) e tema.
- `pages/utenti/index.vue` (solo admin): elenco degli utenti con badge "Admin"; "Nuovo" e la matita aprono lo stesso modale (username, password; in modifica la password vuota resta invariata) con "Elimina" e conferma. Il proprio utente rimanda al profilo.
- `components/InputPassword.vue`: `UInput` con il pulsante a occhio per mostrare la password.
- `pages/alimenti/index.vue`: ricerca (300 ms dopo l'ultimo tasto) con il pulsante di scansione (codice di un alimento salvato: lo apre; altrimenti `/alimenti/nuovo?barcode=…`), filtro "Attivi" / "Archiviati" a chip, sezioni "Recenti" e "Più usati" (solo se non vuote) e "Tutti", ognuna in una card.
- `pages/alimenti/nuovo.vue`: ricerca per codice a barre, inserito a mano o letto con la fotocamera (`ScansioneBarcode`; il codice letto va nel campo e avvia la ricerca). Con `?barcode=` nella query la ricerca parte all'apertura. Se il prodotto c'è, precompila il form con kcal, macro e la porzione del provider come predefinita, e mostra avvisi e attribuzione a Open Food Facts; se non c'è, il barcode resta nel form per l'inserimento manuale. Su 409 `ALIMENTO_ESISTENTE` propone di aprire l'alimento esistente. Dopo il salvataggio torna alla pagina da cui si era arrivati (Alimenti o il diario, via `router.back()`; senza storia `/alimenti`) con un toast; lo stesso fa la freccia indietro.
- `pages/alimenti/[id].vue`: in **sola lettura** per default: in cima kcal e macro per 100, barra della ripartizione, badge (verificato, archiviato, codice, Open Food Facts) e "usato N volte" (dall'utente), poi avvisi, porzioni e "Modifica". "Modifica" apre `AlimentoForm` con "Annulla"; salvando si torna alla lettura. In lettura anche archivia/ripristina (solo per sé, spiegato sotto il pulsante) ed elimina (solo se `eliminabile`).
- `components/AlimentoForm.vue`: form condiviso (validato con `nuovoAlimentoSchema`) a card: Prodotto, Valori ("per 100 g / per 100 ml" con `ControlloSegmentato`, kcal e macro col loro colore, barra della ripartizione delle kcal), Porzioni, flag verificato. Lo stato è `StatoFormAlimento` (`app/utils/alimenti.ts`), con valori vuoti mentre si compila; lì anche `statoDaProdotto`, `statoDaAlimento` e `formattaValore` (arrotondamento solo in visualizzazione).
- `components/ScansioneBarcode.vue`: modale a schermo pieno su fondo nero (`v-model:open`, evento `letto`) con la fotocamera posteriore (`getUserMedia`, `facingMode: "environment"`), riquadro di mira e "Scrivi il codice a mano" (chiude); una lettura ogni 200 ms, al primo codice valido ferma la fotocamera e si chiude. Lettore: ponyfill `BarcodeDetector` di `barcode-detector` (ZXing-C++ in WebAssembly, via `zxing-wasm`), uguale su tutti i browser (iOS Safari e Firefox non hanno l'API nativa). Ponyfill e `.wasm` (~950 KB) si caricano con `import()` solo all'apertura; il `.wasm` è servito dal nostro bundle (`prepareZXingModule` con `locateFile`), non dal CDN jsDelivr predefinito. Gli errori della fotocamera si mostrano con "Riprova". `getUserMedia` richiede un contesto sicuro: localhost o HTTPS.
- `app/utils/barcode.ts`: `FORMATI_BARCODE` (`ean_13`, `ean_8`, `upc_a`, `upc_e`), `codiceLetto` (primo valore di sole cifre, come la ricerca a mano), `messaggioErroreFotocamera` (errori di `getUserMedia` in italiano).
- `components/AlimentoRiga.vue`: riga di un alimento con marca, macro e kcal per 100; con `to` è un link (lista Alimenti), senza è un pulsante (scelta dell'alimento).
- `components/DiarioGiornata.vue`: `RiepilogoGiornata` e pasti del giorno. Ogni scrittura sostituisce la giornata con quella restituita dall'API; gli errori vanno in un toast. Un alimento in un pasto principale si aggiunge con `POST /diario/:giorno/pasti` (il pasto può non avere ancora un id), in uno spuntino con `POST /diario/pasti/:id/voci`. Ogni pasto ha l'ancora `pasto-<id>`.
- Drag and drop degli spuntini: `useSortable` di `@vueuse/integrations` (con `sortablejs`, che gestisce anche il touch), solo dalla maniglia degli spuntini. `onUpdate` rimette il nodo dov'era (il DOM resta a Vue), calcola il nuovo ordine con `nuovoOrdine` (`app/utils/diario.ts`, rifiuta gli spostamenti che cambiano l'ordine dei principali) e lo invia con `PUT /diario/:giorno/ordine`.
- `components/DiarioPasto.vue`: un pasto con voci e totale (kcal arrotondate); etichetta "Più pesante" e kcal in rosso sul pasto più pesante di una giornata oltre il fabbisogno; in modifica, tocco su una voce per cambiare la quantità o rimuoverla, "Aggiungi alimento", proposta "Come ieri" per un principale vuoto, eliminazione dello spuntino.
- `components/SceltaAlimento.vue`: foglio dal basso (`UDrawer`), uno per pasto, con chiave propria, carica i dati solo all'apertura. Passo 1: ricerca con pulsante di scansione (codice di un alimento salvato: passa alla quantità; altrimenti `/alimenti/nuovo?barcode=…`), "Più usati" o risultati con `AlimentoRiga`, "Nuovo alimento". Passo 2: chip delle porzioni (predefinita già scelta, più "100 g"; una chip è scelta quando la quantità coincide), `UInputNumber` a passi di 10, kcal e macro di quella quantità e come cambia la giornata (rosso se supera il fabbisogno), "Aggiungi a <pasto>".
- `components/RiepilogoGiornata.vue`: card in cima alla giornata con kcal rimaste (o "Oltre il fabbisogno", o "Imposta il fabbisogno"), `StatoGiornata`, `AnelloMacro`, legenda (grammi rispetto all'obiettivo, in giallo se oltre; sugli schermi stretti il valore va a capo sotto il nome del macro; senza obiettivi le barre mostrano la quota di kcal) e, se la giornata è oltre, la riga "Ha pesato di più…" che porta al pasto.
- `components/AnelloMacro.vue`: anello SVG (raggio 56, tratto 14) con gli spicchi di `anelloMacro`, 3 px di stacco tra uno e l'altro, giro esterno sottile per l'eccesso; al centro kcal e fabbisogno.
- `components/StatoGiornata.vue`: badge con icona e parola per `ok`, `attenzione` (nomina i macro sforati) e `oltre` (kcal in più).
- `app/utils/diario.ts`: nomi e articoli dei pasti, `giornoLocale`, `spostaGiorno`, `formattaGiorno`, `nuovoOrdine`, e la logica del riepilogo: `macro` (ordine carboidrati, proteine, grassi) e `kcalPerGrammo` (4, 4, 9), `ripartizioneGiorno` (quota delle kcal da ogni macro), `obiettiviGrammi`, `statoGiornata` (regola in [Prodotto](../../business/prodotto.md)), `pastoPiuPesante` (più kcal, il primo a parità), `anelloMacro` (spicchi come frazioni di giro ed eccesso).

## Versione

`nuxt.config.ts` calcola al build `runtimeConfig.public.versione`: `v<version di apps/web/package.json> · <commit corto>`. Il commit viene da `VERCEL_GIT_COMMIT_SHA` su Vercel (al build non c'è `.git`), da `git rev-parse` in locale. La versione cambia solo con una release, il commit a ogni deploy: dal footer si capisce se la PWA si è aggiornata.

## Test

Vitest in ambiente node per il codice puro (`test/`). Per testare i componenti servirà `@nuxt/test-utils`.

## Domande aperte

- Cache offline in sola lettura: contenuto e implementazione in analisi (vedi [Cache offline](../../progetto/decisione-cache-offline.md)).

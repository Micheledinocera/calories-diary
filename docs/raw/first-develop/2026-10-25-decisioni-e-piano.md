# Decisioni iniziali e piano di sviluppo

Decisioni prese con l'utente il 2026-10-25, che sciolgono i conflitti tra l'analisi funzionale e il documento di setup.

## Decisioni

### Architettura: local-first, con tutte le fonti esterne dietro il back-end
- Il front-end (PWA) lavora su uno store locale (IndexedDB) e funziona offline; si sincronizza con l'API quando c'è rete.
- Il front-end **non chiama mai servizi esterni**: parla solo con la nostra API.
- La logica di scelta del prodotto sta tutta nel back-end: cerca prima nel nostro DB, se non c'è interroga il provider esterno (Open Food Facts), normalizza i dati nel nostro modello, li salva e li restituisce.
- Ogni provider esterno è un adapter verso il nostro modello: cambiare provider significa scrivere un nuovo adapter, il front-end non cambia.
- Conseguenze tecniche: chiamate a OFF con User-Agent identificativo dal server; Redis per cache delle risposte dei provider e rate limit.
- Sync: id UUID generati dal client, `aggiornato_il` e cancellazione logica su ogni tabella sincronizzata, push/pull incrementale, vince l'ultima scrittura (un solo utente, conflitti rari). Da dettagliare nella feature dedicata.

### Autenticazione
- Un solo utente. L'API è esposta pubblicamente, quindi va protetta.
- Proposta accettata: credenziali in variabili d'ambiente (hash della password), login che restituisce un token (JWT) inviato come `Authorization: Bearer`; rate limit sul login con Redis.

### Scansione barcode
- Nell'MVP, con la fotocamera. Uso principale su Android (Chrome espone `BarcodeDetector`); polyfill come fallback per gli altri browser.
- Resta anche l'inserimento manuale del codice.

### Lingua
- Italiano ovunque possibile: UI, wiki (anche `tecnico/`), nomi di dominio nel codice (entità, campi, rotte), descrizioni dei commit e delle PR.
- Restano come da standard: tipi/ambiti dei Conventional Commits, nomi dei rami (inglese, kebab-case), codice di infrastruttura dei framework.

### Priorità: prima lo sviluppo locale
- Tutto va prima realizzato e verificato in locale con Docker. Il deploy (Render, Neon, Upstash, Vercel, GHCR, workflow `deploy-api.yml`) è in secondo piano e diventa una feature separata.
- La CI (lint, typecheck, test, build dell'immagine) resta nello scaffolding.

### Repository
- GitHub pubblico: https://github.com/Micheledinocera/calories-diary, ramo di default `develop`.

### Default per i punti [DA DEFINIRE] dell'analisi
- Pasti: tabella con colazione, pranzo, cena, spuntino precaricati; nessuna schermata di configurazione nell'MVP.
- Soglia del controllo di coerenza kcal/macro: 20%.
- Nome prodotto: `product_name_it`, fallback su `product_name`.
- Nessun precaricamento di tabelle generiche (CIQUAL, USDA, BDA) nell'MVP.
- Rendering Nuxt: SPA (`ssr: false`) con modulo PWA, adatta a un'app privata e offline.

### Documentazione del setup
- Il setup chiede `docs/deploy.md` e `docs/architecture.md`; secondo le regole del wiki, le procedure di deploy vanno in `docs/setup/deploy.md` e l'architettura nel wiki (`progetto/`).

## Piano di sviluppo

| # | Feature | Contenuto |
|---|---|---|
| 1 | `first-develop` | Scaffolding: monorepo pnpm, API Express + MikroORM + Redis con `/health`, Nuxt SPA + PWA, `packages/shared`, docker-compose per lo sviluppo, Dockerfile dell'API, qualità (ESLint, Prettier, commitlint, husky), CI |
| 2 | `auth` | Login utente singolo, JWT, middleware, schermata di login |
| 3 | `food-catalog` | Back-end: entità alimento e porzione, adapter Open Food Facts, risoluzione barcode (DB → provider → salvataggio), cache Redis, gestione dei casi limite |
| 4 | `sync` | Store locale (Dexie), endpoint push/pull, motore di sync, coda delle modifiche offline |
| 5 | `foods` | UI alimenti: ricerca locale, creazione manuale, anteprima e correzione dell'import, flag verificato, controllo di coerenza, porzioni, archiviazione |
| 6 | `diary` | Pasti, voci con valori congelati, totali per pasto e giorno, navigazione tra i giorni, Recenti e Più usati |
| 7 | `barcode-scan` | Scansione con fotocamera |
| 8 | `backup` | Export e import JSON/CSV |
| 9 | `deploy` | Neon, Upstash, Render da immagine GHCR, Vercel, `deploy-api.yml`, `docs/setup/deploy.md` |
| → | release `v0.1.0` | |

Fase 2: ricette, obiettivi, storico e grafici, ricerca testuale sul provider.
Fase 3: import di tabelle generiche, ri-sincronizzazione di un alimento dal provider con diff.

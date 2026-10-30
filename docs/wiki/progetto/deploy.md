---
tipo: info
aggiornato: 2026-10-30
fonti:
  - raw/compiled/deploy/2026-10-26-obiettivo.md
  - raw/compiled/deploy/2026-10-26-roadmap.md
  - raw/compiled/deploy/2026-10-26-checklist-manuale.md
  - raw/compiled/ui-tweaks/2026-10-27-decisioni.md
  - raw/compiled/ui-tweaks/2026-10-27-task.md
  - raw/compiled/user-login/2026-10-27-implementazione.md
  - raw/compiled/skill-release/2026-10-30-obiettivo.md
  - raw/compiled/skill-release/2026-10-30-decisioni.md
---

# Deploy

Dove gira l'app in produzione, come ci arriva il codice e come si protegge il database. Il perché delle scelte è in [Scelte di deploy](./decisione-deploy.md); gli ambienti in [Sviluppo, CI e ambienti](./sviluppo-e-ambienti.md).

## Mappa

Tutto su piani gratuiti, in Europa e nella stessa zona (Francoforte), così l'API non attraversa l'oceano a ogni query.

| Pezzo | Dove | Come arriva lì |
|---|---|---|
| Web (PWA statica, `nuxt generate`) | Vercel Hobby, root `apps/web`, dominio `*.vercel.app` | Integrazione git di Vercel, **solo da `main`** (`apps/web/vercel.json`) |
| API (immagine Docker) | Render, web service Free da immagine esistente, Frankfurt, health check `/health` | Workflow `deploy-api.yml` |
| Immagine dell'API | GHCR, `ghcr.io/micheledinocera/calories-diary-api`, pacchetto **pubblico** | Push dal workflow con `GITHUB_TOKEN` |
| PostgreSQL | Neon Free, `aws-eu-central-1` | Connessione **pooled** per l'API, **diretta** per migrazioni e backup |
| Redis | Upstash Free, `eu-central-1` | URL `rediss://` (TLS), prefisso `calories-diary:prod:` |

Il web chiama l'API direttamente (dominio diverso, CORS con `CORS_ORIGINS`; la wildcard per le preview Vercel resta possibile, ma le preview sono spente). L'indirizzo dell'API entra nel bundle alla build (`NUXT_PUBLIC_API_BASE`): se cambia, va rifatta la build su Vercel.

## Pipeline dell'API

`.github/workflows/deploy-api.yml`, su push a `main` (environment GitHub `production`):

1. build dell'immagine `linux/amd64` con `APP_VERSION` = sha del commit, push su GHCR con i tag sha e `latest`;
2. migrazioni su Neon lanciate dall'immagine appena pubblicata (`node dist/src/db/cli.js migration:up`), così corrispondono al codice. La CLI valida tutto l'env: le variabili che le migrazioni non usano ricevono segnaposto;
3. deploy hook di Render con `imgURL=<immagine>:<sha>`: Render non ridistribuisce da solo le immagini al push;
4. smoke test: chiama `/health` fino a 10 minuti (cold start compreso) finché risponde `ok` con la versione del commit.

Lo staging (push a `develop`, environment `staging`) è predisposto ma spento: parte solo con la variabile di repo `STAGING_ENABLED=true`, e richiederebbe un secondo servizio Render e un branch Neon.

## Configurazione

Nomi delle variabili; i valori stanno solo nei pannelli dei servizi e nei secret di GitHub.

- **GitHub**, environment `production` (branch ammessi `main` e `develop`: il backup schedulato gira sul branch di default): secret `DATABASE_URL_DIRECT`, `RENDER_DEPLOY_HOOK`; variabili `API_URL`, `BACKUP_AGE_RECIPIENT`.
- **Render**: `NODE_ENV`, `DATABASE_URL` (pooled), `REDIS_URL`, `REDIS_PREFIX`, `CORS_ORIGINS`, `JWT_SECRET`, `LOG_LEVEL`, `OFF_BASE_URL`, `OFF_CONTATTO`. `PORT` la imposta Render, `APP_VERSION` è nell'immagine. Significato in [Struttura dell'API](../tecnico/api/struttura.md).
- **Vercel** (Production; le variabili di Preview restano ma non servono finché le preview sono spente): `NUXT_PUBLIC_API_BASE`, `ENABLE_EXPERIMENTAL_COREPACK=1` (usa il pnpm del campo `packageManager`; senza, Vercel sceglie la versione dal lockfile e potrebbe prenderne una che non conosce `allowBuilds`). Build command `pnpm build`; branch di produzione `main` (di default Vercel prende `develop`, il branch di default del repo). In `apps/web/vercel.json`, `git.deploymentEnabled` spegne il deploy automatico su ogni branch (`"**": false`) tranne `main` (`"main": true`; se un branch combacia con più regole basta un `true`): niente build e niente mail di errore da `develop`, feature o PR, che si provano in locale. Vale per i commit che contengono il file.

## Primo utente

Render Free non ha una shell: i comandi utente si lanciano dal PC verso Neon con la connessione diretta, `DATABASE_URL='<diretta>' pnpm utente:crea <username> --admin` (o `utente:admin <username>`). Le altre variabili arrivano dal `apps/api/.env` locale. Gli utenti normali li crea l'admin dall'app.

## Backup del database

`.github/workflows/backup-db.yml`, ogni notte alle 02:30 UTC e a mano: `pg_dump --format=custom` sulla connessione diretta, cifrato con [age](https://github.com/FiloSottile/age) verso `BACKUP_AGE_RECIPIENT`, salvato come artifact per 90 giorni. Il dump non lascia mai il runner in chiaro: gli artifact di un repo pubblico sono scaricabili da chiunque abbia un account GitHub.

- La chiave privata age sta solo nel password manager del maintainer: senza, i backup non si aprono.
- `pg_dump` viene da `postgres:18-alpine`: la sua versione deve essere maggiore o uguale a quella di Neon. Se Neon passa a una versione più nuova, va aggiornata l'immagine.

**Restore**, da Git Bash con Docker:

```bash
age -d -i calories-diary-backup.key -o backup.dump backup.dump.age
MSYS_NO_PATHCONV=1 docker run --rm -v "$(pwd -W):/b" postgres:18-alpine pg_restore --list /b/backup.dump
```

Il primo comando decifra l'artifact scaricato, il secondo ne elenca il contenuto. Per ripristinare si usa `pg_restore --no-owner --no-privileges -d '<connessione>'` sullo stesso file. Alla fine si cancellano dalla cartella il dump e la chiave.

## Release

Flusso git-flow ([CONTRIBUTING.md](../../../CONTRIBUTING.md)): la release porta `develop` su `main` con il tag `v<versione>`; il push su `main` pubblica l'API (workflow) e il web (Vercel). La prima è `v0.1.0`.

La skill `/release` esegue la procedura e la avvia solo l'utente, con una conferma esplicita prima del merge su `main`: prima controlla le migrazioni nuove (girano sul database prima che parta la nuova API, senza rollback automatico), le variabili d'ambiente nuove da impostare su Render o Vercel e le modifiche a pipeline e hosting; dopo il push aspetta il workflow `Deploy API` e lo stato `Vercel` del commit. Se un deploy fallisce si ferma, senza retry o revert. Gli hotfix seguono lo stesso percorso partendo da `main`.

Ogni versione ha una GitHub Release con le novità in italiano, creata a deploy riusciti: è l'unico changelog del progetto, non c'è un file `CHANGELOG.md`.

## Limiti dei piani gratuiti

Verificati sulla documentazione dei provider il 2026-10-26.

- **Render Free**: si spegne dopo 15 minuti senza traffico e riparte in circa un minuto; 750 ore al mese per workspace. Il primo accesso della giornata è lento, nel frattempo la PWA mostra i dati in cache.
- **Neon Free**: 1 GB di storage, 100 CU-ora al mese, scale to zero dopo 5 minuti; restore limitato alle ultime 6 ore, per questo serve il backup.
- **Upstash Free**: 500K comandi al mese; archivia il database dopo 30 giorni senza attività (con avvisi, senza perdere dati).
- **GitHub Actions**: in un repo pubblico i cron si disattivano dopo 60 giorni senza attività, backup compreso (arriva un'email; si riattiva da Actions).
- **Vercel Hobby**: solo uso personale e non commerciale.

## Domande aperte

- La skill `/release` è stata provata in locale per i comandi git-flow e l'allineamento delle versioni, non ancora su una release vera (push, attesa dei deploy, GitHub Release).
- Il ripristino di un backup reale (decifrare l'artifact con la chiave age e leggerlo con `pg_restore`) non è ancora stato provato; il resto della pipeline ha funzionato al deploy della `v0.1.1`. L'utente lo considera non prioritario.
- Costo di `/health`: ogni chiamata fa una query su Neon e un `PING` su Redis. Se l'health check di Render è frequente consuma comandi Upstash e tiene sveglio Neon. Da misurare; se serve, un `/health` leggero per Render e quello completo per lo smoke test.
- MCP ufficiali dei provider (Render, Neon, Vercel; per Upstash non ne risulta uno ufficiale): utili per log e stato, non aggiunti a `.mcp.json`. Da decidere.

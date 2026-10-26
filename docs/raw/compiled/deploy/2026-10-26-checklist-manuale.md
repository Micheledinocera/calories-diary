# Checklist del deploy — passaggi manuali

Tutto quello che va fatto a mano sui servizi, in ordine. Il perché delle scelte è nella [roadmap](./2026-10-26-roadmap.md).

> **Mai segreti in questo file né nel repo.** Password, stringhe di connessione e chiavi vanno solo nei pannelli dei servizi, nei secret di GitHub e nel tuo password manager. Qui sotto `<…>` indica un valore che copi da un servizio.

Durante i passaggi tieni aperto un posto sicuro (password manager o nota cifrata) dove raccogliere questi valori, servono più volte:

| Valore | Da dove arriva | Dove va |
|---|---|---|
| Connessione Neon **pooled** | Neon, passo 1 | Render `DATABASE_URL` |
| Connessione Neon **diretta** | Neon, passo 1 | GitHub `DATABASE_URL_DIRECT`, creazione del primo utente |
| URL Redis `rediss://…` | Upstash, passo 2 | Render `REDIS_URL` |
| `JWT_SECRET` | Generato, passo 3 | Render |
| Chiave pubblica age (`age1…`) | Generata, passo 3 | GitHub `BACKUP_AGE_RECIPIENT` |
| Chiave privata age (file) | Generata, passo 3 | Solo il password manager: serve per aprire i backup |
| Deploy hook di Render | Render, passo 7 | GitHub `RENDER_DEPLOY_HOOK` |
| URL dell'API (`https://….onrender.com`) | Render, passo 7 | GitHub `API_URL`, Vercel `NUXT_PUBLIC_API_BASE` |
| URL del web (`https://….vercel.app`) | Vercel, passo 5 | Render `CORS_ORIGINS` |

I comandi vanno lanciati in **Git Bash** dalla root del repo. Docker Desktop deve essere acceso.

---

## 1. Neon (PostgreSQL)

- [ ] Vai su https://console.neon.tech e registrati (va bene il login con GitHub). Il piano è Free.
- [ ] **Create project**:
  - **Project name**: `calories-diary`
  - **Postgres version**: la più recente proposta, **massimo 18** (il backup usa `pg_dump` 18, che non legge server più nuovi). Se ti propone una versione superiore alla 18, dimmelo prima di andare avanti.
  - **Cloud provider**: AWS
  - **Region**: **AWS Europe Central 1 (Frankfurt)**
  - **Neon Auth** (se compare): **disattivato**, l'autenticazione la fa la nostra API.
- [ ] Nella dashboard del progetto premi **Connect**. Lascia branch `production` (o `main`), database `neondb`, ruolo `neondb_owner`.
- [ ] Con l'interruttore **Connection pooling attivo** copia la stringa: è la **pooled** (l'host contiene `-pooler`). Salvala.
- [ ] Con l'interruttore **disattivato** copia di nuovo: è la **diretta** (stesso host senza `-pooler`). Salvala.
  - Entrambe hanno la forma `postgresql://neondb_owner:<password>@ep-….eu-central-1.aws.neon.tech/neondb?sslmode=require…`. Copiale intere, parametri compresi.
- [ ] **Prova la diretta** (incolla la stringa tra apici singoli):

  ```bash
  docker run --rm postgres:18-alpine psql '<connessione diretta>' -c 'select version()'
  ```

  Deve stampare `PostgreSQL 1x.x …`. Se dà errore, fermati e mandamelo (senza la password).

Il database resta vuoto: le tabelle le crea il workflow di deploy con le migrazioni.

## 2. Upstash (Redis)

- [ ] Vai su https://console.upstash.com e registrati (anche qui va bene GitHub).
- [ ] **Create Database** (sezione Redis):
  - **Name**: `calories-diary`
  - **Primary region**: **AWS eu-central-1 (Frankfurt)**, nessuna regione di lettura aggiuntiva
  - **Plan**: Free
  - **Eviction**: lascialo disattivato
- [ ] Nella pagina del database, sezione **Connect** (o *Details*), scegli la scheda **ioredis** o **Redis URL** e copia l'URL: `rediss://default:<password>@<nome>.upstash.io:6379`. Deve iniziare con **`rediss://`** (con due *s*: è la connessione cifrata). Salvalo.
- [ ] **Prova**:

  ```bash
  docker run --rm redis:8-alpine redis-cli --tls -u '<url rediss>' ping
  ```

  Deve rispondere `PONG`.

## 3. Chiavi da generare

- [ ] **`JWT_SECRET`**:

  ```bash
  openssl rand -base64 48
  ```

  Salva la riga stampata. Se un giorno la cambi, tutti gli utenti vengono disconnessi.

- [ ] **Chiavi age per i backup**. Installa age (da PowerShell: `winget install FiloSottile.age`, poi riapri il terminale), quindi:

  ```bash
  age-keygen -o calories-diary-backup.key
  ```

  - Stampa `Public key: age1…`: questa è la **chiave pubblica**, salvala.
  - Il file `calories-diary-backup.key` è la **chiave privata**: mettilo nel password manager (come allegato o copiandone il contenuto), poi **cancellalo dalla cartella**. Non va mai nel repo. Senza questo file i backup non si possono aprire.

## 4. GitHub: environment `production`

Sul repo: **Settings → Environments → New environment**, nome `production`.

- [ ] **Deployment branches and tags** → *Selected branches and tags* → aggiungi `main` e `develop`. Servono entrambi: il deploy parte da `main`, il backup notturno gira su `develop` (il branch di default).
- [ ] **Environment secrets** → *Add environment secret*:
  - `DATABASE_URL_DIRECT` = connessione **diretta** di Neon
- [ ] **Environment variables** → *Add environment variable*:
  - `BACKUP_AGE_RECIPIENT` = chiave pubblica age (`age1…`)
  - `API_URL` = `https://calories-diary-api.onrender.com`, l'indirizzo che avrà il servizio Render se il nome è libero. Al passo 7 controlli che sia giusto.
- [ ] `RENDER_DEPLOY_HOOK` si aggiunge al passo 7, quando il servizio Render esiste.

Lo staging resta spento: **non** creare la variabile `STAGING_ENABLED`.

## 5. Vercel (web)

- [ ] Vai su https://vercel.com e registrati **con GitHub**. Il piano è Hobby.
- [ ] **Add New → Project** → importa `Micheledinocera/calories-diary` (se non lo vedi, *Adjust GitHub App Permissions* e dai accesso al repo).
- [ ] Nella schermata di configurazione:
  - **Project name**: `calories-diary` (l'indirizzo sarà `calories-diary.vercel.app` se libero, altrimenti con un suffisso)
  - **Root Directory**: `apps/web`
  - **Framework Preset**: Nuxt (dovrebbe rilevarlo da solo)
  - **Build Command**: override → `pnpm build` (lancia `nuxt generate`, l'app è statica)
  - Install command e Output directory: lasciali come sono
  - **Environment Variables**:
    - `NUXT_PUBLIC_API_BASE` = `https://calories-diary-api.onrender.com`
    - `ENABLE_EXPERIMENTAL_COREPACK` = `1`
- [ ] **Deploy**. Il primo deploy parte da `develop`. Il sito si apre ma il login non funziona ancora: l'API non esiste. Va bene così.
  - Se la build fallisce, mandami il log.
- [ ] **Branch di produzione**: Vercel prende il branch di default del repo, cioè `develop`. Va cambiato in **`main`**. Lo trovi in *Settings → Environments → Production* (nelle versioni precedenti *Settings → Git → Production Branch*).
- [ ] Controlla in *Settings → Environment Variables* che le due variabili valgano per **Production** e **Preview**.
- [ ] Salva l'**indirizzo di produzione** (in *Settings → Domains*, es. `calories-diary.vercel.app`).

## 6. Primo deploy dell'API (insieme)

Qui serve che il codice arrivi su `main`: chiudiamo la feature (PR verso `develop`, merge) e facciamo la release `v0.1.0`. Lo facciamo insieme.

Al primo push su `main` il workflow **Deploy API** costruisce l'immagine, la pubblica su GHCR e applica le migrazioni su Neon, poi **fallisce al passo "Deploy on Render"** perché il servizio non esiste ancora. È previsto.

- [ ] Rendi pubblica l'immagine: dal tuo profilo GitHub → **Packages** → `calories-diary-api` → **Package settings** → *Danger Zone* → **Change visibility** → **Public**.
- [ ] Su Neon, nella tabella *Tables* del database, devono comparire le tabelle (`utente`, `alimento`, …): conferma che le migrazioni sono andate.

## 7. Render (API)

- [ ] Vai su https://render.com e registrati (con GitHub). Se per il piano Free ti chiede la carta, fermati e dimmelo.
- [ ] **New → Web Service** → **Existing Image**:
  - **Image URL**: `ghcr.io/micheledinocera/calories-diary-api:latest` (nessuna credenziale: è pubblica)
  - **Name**: `calories-diary-api`
  - **Region**: **Frankfurt (EU Central)**
  - **Instance Type**: **Free**
  - **Environment Variables**:

    | Nome | Valore |
    |---|---|
    | `NODE_ENV` | `production` |
    | `DATABASE_URL` | connessione **pooled** di Neon |
    | `REDIS_URL` | URL `rediss://` di Upstash |
    | `REDIS_PREFIX` | `calories-diary:prod:` |
    | `CORS_ORIGINS` | `https://calories-diary.vercel.app,https://calories-diary-*.vercel.app` (con il tuo indirizzo Vercel se diverso) |
    | `JWT_SECRET` | quello del passo 3 |
    | `LOG_LEVEL` | `info` |
    | `OFF_BASE_URL` | `https://world.openfoodfacts.org` |
    | `OFF_CONTATTO` | un'email di contatto che Open Food Facts vede nelle richieste (la tua va bene) |

    `PORT` e `APP_VERSION` non vanno messe: la prima la imposta Render, la seconda è dentro l'immagine.
  - **Advanced → Health Check Path**: `/health`
- [ ] **Deploy Web Service**. Alla fine la pagina del servizio mostra l'indirizzo: controlla che sia `https://calories-diary-api.onrender.com`. Se è diverso (es. con un suffisso), aggiorna `API_URL` su GitHub e `NUXT_PUBLIC_API_BASE` su Vercel, poi su Vercel fai **Redeploy** dell'ultimo deploy di produzione (l'indirizzo dell'API entra nella build).
- [ ] Apri `https://<indirizzo api>/health` nel browser: deve rispondere `{"stato":"ok","db":"ok","redis":"ok",…}`. Se dà `503`, guarda quale dei due è in `errore` e controlla la variabile corrispondente.
- [ ] **Settings → Deploy Hook**: copia l'URL e aggiungilo su GitHub come secret `RENDER_DEPLOY_HOOK` dell'environment `production`.
- [ ] Su GitHub, **Actions → Deploy API** → l'esecuzione fallita → **Re-run all jobs**. Ora deve arrivare in fondo, smoke test compreso.

## 8. Primo utente

Render Free non ha una shell: l'utente si crea dal PC verso Neon, con la connessione **diretta**. Il resto delle variabili lo prende dal tuo `apps/api/.env` locale (quelle passate sulla riga di comando hanno la precedenza).

- [ ] ```bash
  DATABASE_URL='<connessione diretta>' pnpm utente:crea <tua email>
  ```

  Chiede la password (almeno 12 caratteri) due volte.

## 9. Verifica

- [ ] Dal telefono apri l'indirizzo Vercel, fai login (il primo accesso dopo una pausa può metterci un minuto: Render si sta svegliando).
- [ ] Installa la PWA (*Aggiungi a schermata Home*).
- [ ] Giro completo: aggiungi un alimento, registra un pasto, scansiona un codice a barre, fai un export.
- [ ] **Backup**: GitHub → **Actions → Backup database → Run workflow** (branch `develop`). A fine esecuzione scarica l'artifact e prova ad aprirlo:

  ```bash
  age -d -i calories-diary-backup.key -o backup.dump backup.dump.age
  MSYS_NO_PATHCONV=1 docker run --rm -v "$(pwd -W):/b" postgres:18-alpine pg_restore --list /b/backup.dump | head
  ```

  (la chiave privata la recuperi dal password manager; alla fine cancella `backup.dump` e la chiave dalla cartella). La procedura di restore completa andrà nel wiki.

Fatto questo, l'app è online. Da qui ogni release su `main` si pubblica da sola.

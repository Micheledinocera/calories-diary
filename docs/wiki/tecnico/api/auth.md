---
tipo: info
aggiornato: 2026-10-27
fonti:
  - raw/compiled/auth/2026-10-25-implementazione.md
  - raw/compiled/diary/2026-10-25-decisioni-diario.md
  - raw/compiled/user-login/2026-10-27-implementazione.md
---

# Autenticazione e utenti

Moduli `src/modules/utenti/` e `src/modules/auth/`, middleware `src/middlewares/autenticazione.ts`. Le regole sono nelle decisioni [Autenticazione multiutente](../../progetto/decisione-autenticazione.md) e [Gestione delle utenze in app](../../progetto/decisione-gestione-utenze.md). Token firmati con [jose](https://github.com/panva/jose).

## Entità `Utente`

Tabella `utente`:

| Campo | Tipo | Note |
|---|---|---|
| `id` | uuid | Generato alla creazione |
| `username` | varchar(254) | Come l'ha scritto l'utente. 254 perché gli utenti migrati hanno come username la vecchia email |
| `chiaveUsername` | varchar(254) | Username in minuscolo, **unica**: tenuta allineata da `onCreate` / `onUpdate`. Ogni ricerca per username passa da qui con `chiaveUsername()` (`utente.entity.ts`) |
| `email` | varchar(254), nullable | Facoltativa, unica quando c'è; per ora solo nel database (non esposta) |
| `passwordHash` | varchar(255) | `hidden`: mai serializzato |
| `ruolo` | enum `admin` \| `utente` | Predefinito `utente` |
| `versioneSessione` | int | Sale a ogni cambio password: invalida i token già emessi (vedi [Token](#token)) |
| `fabbisogno`, `quotaCarboidrati`, `quotaGrassi`, `quotaProteine` | int | Obiettivi dell'utente, vedi [Obiettivi](./obiettivi.md) |
| `creatoIl` / `aggiornatoIl` | timestamptz | Impostati da `onCreate` / `onUpdate` |

Il DTO esposto (`Utente` in shared) contiene `id`, `username` e `ruolo`.

La migrazione `utenti_admin` ha copiato l'email nello username, svuotato l'email e reso admin `michele@gmail.com`.

## Creazione degli utenti

Gli utenti normali li crea un admin dall'app (`POST /utenti`). Da CLI (dalla root o da `apps/api`; in produzione `node dist/src/db/cli.js …`):

- `utente:crea <username> [--admin]`: chiede la password senza mostrarla e la fa ripetere; senza TTY legge la prima riga di stdin (`echo … | pnpm utente:crea …`). Valida con `nuovoUtenteSchema` (username, password di almeno **12 caratteri**). È l'unico modo per creare un admin;
- `utente:admin <username>`: rende admin un utente esistente;
- username già usato (ignorando maiuscole e minuscole) → `USERNAME_IN_USO`;
- gli errori attesi si stampano senza stack trace, con exit code 1.

## Servizio `creaUtentiService(em)`

`src/modules/utenti/utenti.service.ts`, usato da CLI e rotte: `crea`, `promuoviAdmin`, `lista` (per username), `modifica` (username e/o password), `cambiaPassword` (verifica quella attuale, altrimenti 400 `PASSWORD_ERRATA`), `elimina`. Ogni nuova password incrementa `versioneSessione`.

`elimina(id, richiedenteId)`: 400 `AUTO_ELIMINAZIONE` su sé stessi, 404 se l'utente non c'è. In una transazione: cancella i pasti dell'utente (voci in cascata), poi i suoi alimenti (`autore`) che non hanno più voci, cioè non usati nel diario di nessun altro, poi l'utente (`uso_alimento` in cascata; gli alimenti rimasti perdono l'autore con `set null`).

## Password

`src/lib/password.ts`: `scrypt` di `node:crypto` (nessuna dipendenza nativa), parametri N=2^17, r=8, p=1 (raccomandazioni OWASP). Formato salvato `scrypt$N$r$p$<salt>$<hash>` in base64: i parametri restano nell'hash, si potranno alzare senza invalidare le password esistenti. Il confronto usa `timingSafeEqual`.

## Token

`src/modules/auth/token.ts`, `creaGestoreToken(JWT_SECRET)`:

- JWT HS256, `sub` = id utente, `ver` = `versioneSessione`, `iss` = `calories-diary`, durata **7 giorni** (`DURATA_TOKEN_S`);
- `verifica(token)` restituisce `{ utenteId, versione }`, o `null` se il token non è valido o è scaduto. Un token senza `ver` (emesso prima delle versioni) vale come versione 0;
- `JWT_SECRET` (almeno 32 caratteri) è una variabile d'ambiente obbligatoria: cambiarla disconnette tutti gli utenti.

## Rotte `/auth`

| Rotta | Auth | Risposta |
|---|---|---|
| `POST /auth/login` | — | Body `Credenziali` (`username`, `password`) → `Sessione` `{ token, scadeIl, utente }`. 401 `CREDENZIALI_ERRATE`, 429 `TROPPI_TENTATIVI`, 400 `VALIDAZIONE` |
| `POST /auth/rinnova` | Bearer | Nuova `Sessione` di 7 giorni (rinnovo scorrevole) |
| `GET /auth/io` | Bearer | L'`Utente` corrente |
| `PATCH /auth/io` | Bearer | Body `ModificaProfilo` (`username`) → l'`Utente` aggiornato; 409 `USERNAME_IN_USO` |
| `PUT /auth/password` | Bearer | Body `CambioPassword` (`passwordAttuale`, `nuovaPassword`) → nuova `Sessione` per il dispositivo corrente (gli altri token non valgono più); 400 `PASSWORD_ERRATA`, 429 `TROPPI_TENTATIVI` |

Con uno username sconosciuto il login verifica comunque un hash fittizio, così il tempo di risposta non rivela quali utenti esistono.

## Rotte `/utenti` (admin)

Montate dietro `richiediAutenticazione` e `richiediAdmin`. L'admin gestisce le utenze, non vede i diari.

| Rotta | Risposta |
|---|---|
| `GET /utenti` | Lista di `Utente`, per username |
| `POST /utenti` | Body `NuovoUtente` → 201 con l'`Utente` (sempre ruolo `utente`); 409 `USERNAME_IN_USO` |
| `PATCH /utenti/:id` | Body `ModificaUtente` (username e/o password) → l'`Utente`; 404, 409 `USERNAME_IN_USO` |
| `DELETE /utenti/:id` | 204; 400 `AUTO_ELIMINAZIONE`, 404 (vedi `elimina` sopra) |

## Middleware

- `richiediAutenticazione`, montato in `app.ts` davanti alle rotte protette (`/diario`, `/obiettivi`, `/alimenti`, `/catalogo`, `/utenti` e le rotte Bearer di `/auth`): richiede `Authorization: Bearer <token>` valido, di un utente **ancora esistente** e con la **stessa `versioneSessione`** del token; altrimenti 401 `NON_AUTENTICATO`. L'utente (DTO) va in `res.locals.utente`; le rotte lo leggono con `utenteCorrente(res)`.
- `richiediAdmin`, dopo il precedente: 403 `NON_AUTORIZZATO` se il ruolo (letto dal database a ogni richiesta) non è `admin`.

## Rate limit del login

`src/modules/auth/limite-login.ts`, `creaLimiteLogin(redis, logger, gruppo)`, su Redis, finestra fissa di 15 minuti. Due gruppi di contatori, con il prefisso dell'ambiente:

- `login`: chiavi `login:utente:<username in minuscolo>` e `login:ip:<ip>`;
- `password` (cambio della propria password): chiavi `password:utente:<id>` e `password:ip:<ip>`.

Per entrambi:

- al massimo **5 tentativi per utente** e **20 per IP**; oltre, 429 `TROPPI_TENTATIVI` con `dettagli.riprovaTraS`;
- una password corretta azzera il contatore dell'utente;
- se Redis non risponde il tentativo è permesso e si scrive un warning nel log: scrypt rallenta comunque i tentativi.

## Test

Il `globalSetup` crea due utenti e un admin di test (`test/utenti-test.ts`) e cancella le chiavi `login:*` e `password:*` di Redis, perché i contatori sopravvivono tra un'esecuzione e l'altra. `test/utenti.test.ts` (gestione utenti, profilo, password, eliminazione) fa i login da un IP suo (`X-Forwarded-For`, con `trust proxy`), per non consumare il limite per IP degli altri test.

## Domande aperte

- Login permesso quando Redis non risponde: scelta di disponibilità fatta durante lo sviluppo, da confermare.

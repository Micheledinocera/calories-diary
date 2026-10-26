---
tipo: info
aggiornato: 2026-10-25
fonti:
  - raw/compiled/auth/2026-10-25-implementazione.md
  - raw/compiled/diary/2026-10-25-decisioni-diario.md
---

# Autenticazione e utenti

Moduli `src/modules/utenti/` e `src/modules/auth/`, middleware `src/middlewares/autenticazione.ts`. Le regole sono nella decisione [Autenticazione multiutente](../../progetto/decisione-autenticazione.md). Token firmati con [jose](https://github.com/panva/jose).

## Entità `Utente`

Tabella `utente`:

| Campo | Tipo | Note |
|---|---|---|
| `id` | uuid | Generato alla creazione |
| `email` | varchar(254) | Unica, sempre minuscola (`credenzialiSchema` la normalizza) |
| `passwordHash` | varchar(255) | `hidden`: mai serializzato |
| `fabbisogno`, `quotaCarboidrati`, `quotaGrassi`, `quotaProteine` | int | Obiettivi dell'utente, vedi [Obiettivi](./obiettivi.md) |
| `creatoIl` / `aggiornatoIl` | timestamptz | Impostati da `onCreate` / `onUpdate` |

Il DTO esposto (`Utente` in shared) contiene solo `id` ed `email`.

## Creazione degli utenti

Non c'è una rotta di registrazione. `pnpm utente:crea <email>` (dalla root o da `apps/api`; in produzione `node dist/src/db/cli.js utente:crea <email>`):

- chiede la password senza mostrarla e la fa ripetere; senza TTY legge la prima riga di stdin (`echo … | pnpm utente:crea …`);
- password di almeno **12 caratteri**, email valida;
- `creaUtentiService(em).crea()` salva l'utente; email già usata → `EMAIL_IN_USO`;
- gli errori attesi si stampano senza stack trace, con exit code 1.

## Password

`src/lib/password.ts`: `scrypt` di `node:crypto` (nessuna dipendenza nativa), parametri N=2^17, r=8, p=1 (raccomandazioni OWASP). Formato salvato `scrypt$N$r$p$<salt>$<hash>` in base64: i parametri restano nell'hash, si potranno alzare senza invalidare le password esistenti. Il confronto usa `timingSafeEqual`.

## Token

`src/modules/auth/token.ts`, `creaGestoreToken(JWT_SECRET)`:

- JWT HS256, `sub` = id utente, `iss` = `calories-diary`, durata **7 giorni** (`DURATA_TOKEN_S`);
- `verifica(token)` restituisce l'id utente, o `null` se il token non è valido o è scaduto;
- `JWT_SECRET` (almeno 32 caratteri) è una variabile d'ambiente obbligatoria: cambiarla disconnette tutti gli utenti.

## Rotte `/auth`

| Rotta | Auth | Risposta |
|---|---|---|
| `POST /auth/login` | — | Body `Credenziali` → `Sessione` `{ token, scadeIl, utente }`. 401 `CREDENZIALI_ERRATE`, 429 `TROPPI_TENTATIVI`, 400 `VALIDAZIONE` |
| `POST /auth/rinnova` | Bearer | Nuova `Sessione` di 7 giorni (rinnovo scorrevole) |
| `GET /auth/io` | Bearer | L'`Utente` corrente |

Con un'email sconosciuta il login verifica comunque un hash fittizio, così il tempo di risposta non rivela quali email esistono.

## Middleware `richiediAutenticazione`

Montato in `app.ts` davanti alle rotte protette (`/diario`, `/obiettivi`, `/alimenti`, `/catalogo`, `/auth/rinnova`, `/auth/io`):

- richiede `Authorization: Bearer <token>` valido **e** un utente ancora esistente: un utente cancellato perde l'accesso subito, anche con un token non scaduto;
- altrimenti 401 `NON_AUTENTICATO`;
- l'utente va in `res.locals.utente`; le rotte lo leggono con `utenteCorrente(res)`.

## Rate limit del login

`src/modules/auth/limite-login.ts`, su Redis, finestra fissa di 15 minuti (chiavi `login:email:<email>` e `login:ip:<ip>`, con il prefisso dell'ambiente):

- al massimo **5 tentativi per email** e **20 per IP**; oltre, 429 `TROPPI_TENTATIVI` con `dettagli.riprovaTraS`;
- un login riuscito azzera il contatore dell'email;
- se Redis non risponde il login è permesso e si scrive un warning nel log: scrypt rallenta comunque i tentativi.

## Test

Il `globalSetup` crea due utenti di test (`test/utenti-test.ts`) e cancella le chiavi `login:*` di Redis, perché i contatori sopravvivono tra un'esecuzione e l'altra.

## Domande aperte

- Login permesso quando Redis non risponde: scelta di disponibilità fatta durante lo sviluppo, da confermare.
- Nessuna revoca dei token né cambio password: un token rubato resta valido (e rinnovabile) finché l'utente esiste o `JWT_SECRET` non cambia.

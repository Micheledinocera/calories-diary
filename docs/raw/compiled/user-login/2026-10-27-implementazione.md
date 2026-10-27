# Implementazione — user-login

Scelte fatte durante lo sviluppo, oltre a quelle in `2026-10-27-decisioni.md`.

## Database

- Migrazione `utenti_admin`: colonne `username` (varchar 254: gli username migrati sono le vecchie email), `chiave_username` (lo username in minuscolo, unica), `ruolo` (`admin` | `utente`, predefinito `utente`), `versione_sessione` (int, 0); `email` diventa facoltativa (unica quando presente) e viene svuotata.
- **Username con maiuscole e minuscole** (richiesta dell'utente): viene salvato come lo si scrive, ma l'unicità e il login le ignorano. `chiave_username` la tiene aggiornata l'ORM (`onCreate`/`onUpdate` sull'entità); le ricerche passano da `chiaveUsername()`.
- La migrazione rende admin `michele@gmail.com` (il proprietario, in produzione; altrove non trova nessuno). Gli altri admin si promuovono con `utente:admin <username>` (in produzione `node dist/src/db/cli.js utente:admin <username>`).

## Sessione

- Il JWT contiene `ver` = `versioneSessione` dell'utente. Il middleware rifiuta i token con una versione diversa da quella nel DB, e quelli di utenti che non esistono più.
- La versione sale quando cambia la password: sia quando la imposta l'admin, sia quando l'utente la cambia da solo. In quel caso `PUT /auth/password` restituisce una nuova sessione per il dispositivo corrente; gli altri dispositivi rifanno il login.
- I token emessi prima della migrazione non hanno `ver` e valgono come versione 0: restano validi.
- Nella PWA la sessione salvata col vecchio formato (utente con `email`) viene scartata: dopo l'aggiornamento ogni dispositivo rifà il login una volta.

## API

- `POST /auth/login` con `username` e `password`. Rate limit per username e per IP.
- `PATCH /auth/io` (username dell'utente corrente), `PUT /auth/password` (password attuale + nuova, rate limit `password:` per utente e per IP come il login).
- `/utenti` solo admin (403 `NON_AUTORIZZATO` per gli altri): `GET` lista, `POST` crea un utente normale, `PATCH /:id` username e/o password, `DELETE /:id` (400 `AUTO_ELIMINAZIONE` su sé stessi).
- Cancellazione in transazione: prima i pasti (voci in cascata), poi gli alimenti dell'utente senza voci rimaste, poi l'utente (utilizzi in cascata, gli alimenti rimasti perdono l'autore).
- Errori nuovi: `USERNAME_IN_USO` (409), `PASSWORD_ERRATA` (400).
- Password nuove di almeno 12 caratteri (`nuovaPasswordSchema` in shared, usato anche dalla CLI).

## CLI

- `utente:crea <username> [--admin]`, `utente:admin <username>`; `seed:demo <username>`.

## PWA

- Login con username.
- **Obiettivi e profilo separati** (richiesta dell'utente): `/obiettivi` ha fabbisogno e ripartizione dei macro, `/profilo` username, password (la nuova va ripetuta) e tema. Nel menu account: Obiettivi, Profilo, Gestione utenti (solo admin).
- **Footer con la versione** (richiesta dell'utente), per capire se la PWA si è aggiornata: `v<versione di apps/web> · <commit corto>`, fissata al build in `nuxt.config.ts` (`runtimeConfig.public.versione`). Il commit viene da `VERCEL_GIT_COMMIT_SHA` su Vercel, da `git rev-parse` in locale. Non c'è nella pagina di login, che non usa il layout.
- Pagina `/utenti` (solo admin, voce "Gestione utenti" nel menu account): elenco, nuovo utente, modifica in un modale con eliminazione. Il proprio utente non si modifica da qui ma dal profilo.

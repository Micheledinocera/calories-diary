# Implementazione — auth

Scelte tecniche fatte durante lo sviluppo (da rivedere con l'utente dove indicato).

## API

- **Modulo `utenti`**: entità `Utente` (`id`, `email` unica e minuscola, `passwordHash` nascosto, timestamp). Nessuna rotta: gli utenti si creano con `pnpm utente:crea <email>` (comando in `src/db/cli.ts`), che chiede la password senza mostrarla (o la legge dalla prima riga di stdin), minimo **12 caratteri**, e crea i pasti predefiniti. Errori attesi (email in uso, email non valida, password corta) stampati senza stack trace, exit code 1.
- **Password**: `scrypt` di `node:crypto` (nessuna dipendenza nativa), parametri OWASP N=2^17, r=8, p=1, formato `scrypt$N$r$p$salt$hash` (i parametri restano nell'hash, si potranno cambiare). Con email sconosciuta si verifica comunque un hash fittizio, così il tempo di risposta non rivela quali email esistono.
- **Token**: JWT HS256 con `jose`, `sub` = id utente, emittente `calories-diary`, durata 7 giorni. Chiave in `JWT_SECRET` (nuova variabile, minimo 32 caratteri; cambiarla disconnette tutti).
- **Rotte `/auth`**: `POST /auth/login` (credenziali → `Sessione` `{ token, scadeIl, utente }`), `POST /auth/rinnova` (token valido → nuova sessione di 7 giorni: è il rinnovo scorrevole), `GET /auth/io` (utente corrente).
- **Middleware `richiediAutenticazione`**: `Authorization: Bearer`, verifica il token e che l'utente esista ancora (un utente cancellato perde l'accesso subito). Errore 401 `NON_AUTENTICATO`. Utente in `res.locals.utente`, letto con `utenteCorrente(res)`.
- **Rate limit del login** (Redis, finestra fissa di 15 minuti): max 5 tentativi per email e 20 per IP; oltre → 429 `TROPPI_TENTATIVI` con `dettagli.riprovaTraS`. Il contatore dell'email si azzera dopo un login riuscito. **Se Redis non risponde il login è permesso** (con warning nel log): scelta di disponibilità, da confermare.
- **Codici di errore nuovi**: `CREDENZIALI_ERRATE` (401), `NON_AUTENTICATO` (401), `TROPPI_TENTATIVI` (429), `EMAIL_IN_USO` (409, solo CLI).
- **Pasti per utente**: `pasto.utente_id` (FK con cancellazione a cascata), unicità `(utente_id, nome)`. `/pasti` richiede l'autenticazione e mostra solo i pasti dell'utente; il pasto di un altro utente risponde 404 (non si rivela che esiste). La migrazione `utenti` cancella i pasti condivisi del vecchio seed. Il seed ora crea i pasti predefiniti mancanti per ogni utente esistente.
- **Test**: il global setup crea due utenti di test e azzera i contatori del rate limit su Redis (altrimenti due run ravvicinate prenderebbero 429).

## Web

- **Sessione** in `localStorage` (`calories-diary:sessione`), validata con `sessioneSchema` alla lettura. Composable `useSessione` (`sessione`, `accedi`, `rinnova`, `esci`).
- `useApi` aggiunge `Authorization: Bearer`; un 401 `NON_AUTENTICATO` chiude la sessione e porta a `/login`. Il login non fa retry (ogni tentativo conta nel rate limit).
- **Middleware globale**: senza sessione si va a `/login`; con sessione `/login` porta alla home. Un token scaduto localmente non blocca l'app (uso offline): se ne accorge l'API alla prima chiamata.
- **Rinnovo**: plugin client che chiama `/auth/rinnova` all'avvio, al ritorno online e quando l'app torna in primo piano, solo se il token ha più di un giorno (così resta sempre circa una settimana di margine offline senza chiamare l'API a ogni apertura).
- Pagina `/login` con `UAuthForm` di Nuxt UI; nella home email dell'utente e pulsante "Esci".

## Da aggiornare nel wiki

- `decisione-autenticazione`: da utente singolo con credenziali in env a multiutente (vedi `2026-10-25-decisioni-utente.md`); chiudere la domanda aperta su durata e rinnovo.
- Pagine tecniche API (struttura, database, pasti, nuova pagina auth/utenti), web (app), shared (contratti).

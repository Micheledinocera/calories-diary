# Obiettivo — user-login

Cambiamo la gestione degli utenti.

Si riparte dalla decisione aperta [Gestione delle utenze in app](../../wiki/progetto/decisione-gestione-utenze.md), che rivede la [decisione sull'autenticazione](../../wiki/progetto/decisione-autenticazione.md).

## Cosa ci siamo detti finora

- **Situazione attuale**: gli utenti si creano solo da CLI (`pnpm utente:crea <email>`), nessuna registrazione pubblica. Login con email e password, JWT da 7 giorni con rinnovo scorrevole, rate limit sul login con Redis.
- **Problema**: nel database c'è solo l'hash scrypt della password, quindi una password dimenticata non si recupera; l'unica strada è sostituire l'hash a mano sul database.
- **Cosa serve**: un flusso in app per la creazione degli utenti e per il reset della password, senza passare dal database.
- **Dati per utente** (già deciso, non cambia): il diario (pasti e voci) è del singolo utente; gli alimenti sono un pool condiviso, con recenti, più usati e archivio per utente; i tipi di pasto sono fissi nel codice.

## Domande aperte

- **Chi può creare un utente**: chiunque (registrazione aperta), solo su invito, o solo un amministratore dall'app?
- **Reset della password**: come arriva il link? Serve un servizio che mandi le email, che oggi l'app non ha (deve stare in un piano gratuito, come il resto del deploy).
- **Registrazione pubblica**: se si apre, la scelta "nessuna registrazione pubblica" della decisione sull'autenticazione va rivista (pagine, abusi, rate limit).

## Modifiche dell'utente

- Solo un admin può creare le utenze nuove, quindi va previsto un ruolo sugli utenti e una schermata per la gestione utenti.
- Inoltre la username non deve essere per forza una mail e aggiungiamo il campo mail agli utenti (facoltativa)
- L'admin può modificare nome utente e password di qualunque utente, crearne di nuovi o cancellarli
- L'utente può solo modificarsi lo username, la mail per adesso è prevista solo a DB poi vediamo se aggiungerla anche al fe modificabile
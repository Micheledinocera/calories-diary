---
tipo: decisione
stato: presa
aggiornato: 2026-10-27
fonti:
  - raw/compiled/ui-tweaks/2026-10-27-da-fare-dopo.md
  - raw/compiled/user-login/2026-10-27-obiettivo.md
  - raw/compiled/user-login/2026-10-27-decisioni.md
  - raw/compiled/user-login/2026-10-27-implementazione.md
---

# Gestione delle utenze in app

## Decisione

- **Solo un admin crea gli utenti**, da una schermata di gestione nell'app. Niente registrazione pubblica, niente inviti.
- **Ruoli** `admin` e `utente`. Gli admin si creano solo da CLI (`utente:crea <username> --admin`, o `utente:admin <username>` per promuovere un utente esistente); dall'app non si cambiano i ruoli. Il proprietario (`michele@gmail.com`) diventa admin con la migrazione.
- **Username** al posto dell'email per il login: 3–32 caratteri tra lettere, cifre, `.`, `_`, `-`, `@`. Si salva con maiuscole e minuscole come lo si scrive, ma l'unicità e il login le ignorano. Gli utenti esistenti hanno come username la loro vecchia email.
- **Email facoltativa**, per ora solo nel database: nessuna interfaccia per vederla o cambiarla, univoca quando c'è.
- **L'admin** vede l'elenco degli utenti e può crearli, cambiarne username e password, eliminarli. Non può eliminare sé stesso, e non vede i diari degli altri.
- **L'utente** può cambiare il proprio username e la propria password, inserendo quella attuale (anche se è quella ricevuta dall'admin).
- **Reset della password**: lo fa l'admin, impostandone una nuova; l'utente poi può cambiarla. Niente email.
- **Cambio password e sessioni**: quando la password cambia (dall'admin o dall'utente), i token già emessi per quell'utente smettono di valere, rinnovo compreso. Chi l'ha cambiata da solo riceve subito una sessione nuova sul dispositivo che sta usando.
- **Eliminazione** definitiva: spariscono pasti, voci e utilizzi dell'utente. I suoi alimenti si cancellano se non compaiono nel diario di nessun altro (averli solo archiviati non conta); altrimenti restano nel pool, senza autore. L'utente eliminato perde l'accesso subito.
- Rate limit anche sul cambio password, come sul login.

Dettagli di implementazione: [Autenticazione e utenti](../tecnico/api/auth.md) (API) e [App web](../tecnico/web/app.md#sessione-e-login) (PWA).

## Perché

- Gli utenti sono pochi e noti: basta che uno li crei, senza pagine pubbliche da difendere dagli abusi.
- Un servizio email (gratuito) solo per il reset non vale il lavoro: con pochi utenti chiedere all'admin basta.
- Username liberi: non tutti vogliono o hanno bisogno di usare l'email per accedere.
- Admin solo da CLI: chi ha accesso al server decide chi amministra, e dall'app non si può diventare admin per errore.
- Invalidare i token al cambio password: un token rubato smette di funzionare appena la password cambia.
- Alimenti dell'utente eliminato tenuti se usati da altri: il diario degli altri non deve perdere voci.

## Alternative scartate

- **Registrazione aperta o su invito**: più pagine e controlli senza un bisogno reale.
- **Reset della password via email**: richiede un servizio email; potrà tornare in futuro.
- **Eliminare tutti gli alimenti dell'utente** o tenerli tutti: nel primo caso il diario degli altri perderebbe voci, nel secondo resterebbero alimenti che non usa nessuno.

## Domande aperte

- Alimenti rimasti senza autore: non li può più eliminare nessuno. Per ora va bene; in futuro forse una revisione da parte dell'admin o con un batch (probabilmente non verrà mai fatta).
- Email: se e quando mostrarla e renderla modificabile nell'app.

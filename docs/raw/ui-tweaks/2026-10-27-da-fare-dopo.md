# Da fare più avanti — ui-tweaks

- **Utenze e password in app**: oggi gli utenti si creano solo da CLI (`pnpm utente:crea`) e una password dimenticata non si recupera (nel DB c'è solo l'hash scrypt). Serve un flusso in app per la creazione degli utenti e il reset della password. Da decidere chi può registrarsi (chiunque, su invito, solo un admin) e come arriva il link di reset (serve un servizio email). Tocca la [decisione sull'autenticazione](../../wiki/progetto/decisione-autenticazione.md). Non in questa feature.

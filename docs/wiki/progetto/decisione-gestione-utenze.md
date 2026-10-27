---
tipo: decisione
stato: aperta
aggiornato: 2026-10-27
fonti:
  - raw/compiled/ui-tweaks/2026-10-27-da-fare-dopo.md
---

# Gestione delle utenze in app

Da fare più avanti, non ancora analizzata.

## Contesto

Oggi gli utenti si creano solo da CLI (`pnpm utente:crea <email>`, vedi [Autenticazione multiutente](./decisione-autenticazione.md)) e nel database c'è solo l'hash scrypt della password. Una password dimenticata non si recupera: si può solo sostituire l'hash a mano sul database. L'utente vuole un flusso in app per la creazione degli utenti e il reset della password, così da non dover passare dal database.

## Domande aperte

- Chi può creare un utente: chiunque (registrazione aperta), solo su invito, o solo un amministratore dall'app?
- Come arriva il link di reset: serve un servizio che mandi le email, che oggi l'app non ha (con un piano gratuito, come il resto del [deploy](./deploy.md)).
- Cambia la scelta "nessuna registrazione pubblica" della [decisione sull'autenticazione](./decisione-autenticazione.md): va rivista insieme.

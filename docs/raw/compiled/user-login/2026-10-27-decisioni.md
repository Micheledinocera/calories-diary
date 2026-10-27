# Decisioni — user-login

Risposte dell'utente ai problemi e alle domande sollevati su `2026-10-27-obiettivo.md`.

## Sessione e password

- **Invalidazione della sessione**: quando l'admin modifica la password di un utente, i token di quell'utente smettono di valere (anche il rinnovo scorrevole) e l'utente rifà il login.
- **Utente cancellato**: il suo token smette di valere subito (il middleware controlla che l'utente esista ancora).
- **Password**: l'admin imposta la password di un utente; l'utente può cambiarsi la password inserendo quella attuale (quella ricevuta dall'admin o, in generale, la vecchia).
- **Rate limit**: anche sul cambio password, non solo sul login.

## Utenti e ruoli

- **Creazione degli admin**: gli utenti admin si creano solo da CLI. Dall'app l'admin crea gli utenti normali; dall'app non si cambiano i ruoli.
- **Vincoli dell'admin**: non può cancellare sé stesso.
- **Privacy**: l'admin gestisce le utenze ma non vede i diari degli altri.
- **Username**: univoco senza distinzione di maiuscole (salvato in minuscolo), 3–32 caratteri tra lettere, cifre, `.`, `_`, `-`, `@` (la `@` serve agli username migrati dalle email).
- **Email**: facoltativa e univoca quando presente.
- **Utenti esistenti**: la migrazione copia l'email attuale nello username e lascia vuoto il campo email.

## Cancellazione di un utente

- Definitiva: i suoi pasti, le voci e gli utilizzi (recenti, più usati, archivio) spariscono.
- **I suoi alimenti** (quelli di cui è autore) si cancellano se nessun altro utente li ha usati, cioè se non compaiono nel diario di nessun altro (averli solo archiviati non conta come uso). Se un altro utente li ha usati restano, senza autore.
- Così esisteranno alimenti che non si potranno mai eliminare: per ora va bene. In futuro si potrebbe prevedere una revisione da parte dell'admin o con un batch, ma probabilmente non verrà mai implementata.

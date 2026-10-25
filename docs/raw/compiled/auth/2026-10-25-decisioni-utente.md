# Decisioni dell'utente — auth

- Il token dura **una settimana**.
- Gestiamo il **multiutente**: in futuro l'app potrebbe essere usata anche da qualche amico. Questo supera il "un solo utente, credenziali nelle variabili d'ambiente" di [decisione-autenticazione](../../wiki/progetto/decisione-autenticazione.md).
- Gli utenti si creano con un **comando CLI** dell'API: nessuna registrazione pubblica.
- Rinnovo **scorrevole**: ogni volta che l'app parla con l'API riceve un token nuovo da 7 giorni. Chi resta offline più di 7 giorni rifà il login alla riconnessione; i dati locali restano.
- Login con **email + password**.
- I **pasti sono per utente** (i predefiniti vengono creati insieme all'utente). Scelta conservativa: più avanti si valuterà se unificarli.

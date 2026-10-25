# Obiettivo — auth

Continuiamo i primi sviluppi.

Si parte dalla decisione già presa in [decisione-autenticazione](../../wiki/progetto/decisione-autenticazione.md): utente singolo con credenziali nelle variabili d'ambiente dell'API (hash della password), login che restituisce un JWT inviato come `Authorization: Bearer`, rate limit sul login con Redis. Domanda aperta da chiudere qui: durata del token e rinnovo, compatibili con l'uso offline prolungato.

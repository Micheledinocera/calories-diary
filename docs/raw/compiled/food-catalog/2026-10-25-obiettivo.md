# Obiettivo — food-catalog

Parte back-end degli alimenti, prossima feature dell'MVP (dopo `auth`): entità alimento e porzione, adapter verso Open Food Facts (lookup per barcode, API v3), endpoint di lookup che cerca prima nel nostro DB e poi presso il provider, con i dati normalizzati e i casi limite (prodotto non trovato, valori mancanti o parziali, provider non raggiungibile).

Decisioni prese con l'utente all'avvio (25/10/2026), sulle domande aperte del wiki:

1. **Catalogo e alimenti**: due livelli. Un **catalogo condiviso** dei prodotti importati dal provider, che fa da cache comune tra gli utenti, e gli **alimenti di ogni utente**, cioè la sua copia correggibile e verificabile, con frequenza e recenza d'uso. Le correzioni di un utente non toccano i dati degli altri.
2. **Limiti di frequenza di Open Food Facts**: da verificare sulla documentazione ufficiale all'inizio della feature.
3. **Multiutente**: "sì, togliamo ogni tipo di interazione social, l'idea è solo quella di eventualmente renderla disponibile a qualche amico per utilizzo personale." Nei non obiettivi del prodotto restano esclusi social e condivisione, non il multiutente.

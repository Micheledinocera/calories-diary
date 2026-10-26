# Decisioni utente — export

- **Lo genera il front-end**: il markdown di condivisione si costruisce nella PWA a partire dai dati del diario già esposti dall'API. È poca roba, non serve un endpoint dedicato.
- **Contenuto per giorno**: dettaglio di cosa si è mangiato (per pasto) con kcal e macro di ogni voce, più i **totali giornalieri** di consumo (kcal, proteine, carboidrati, grassi) e il **target** (fabbisogno calorico e rapporto macro).
- **Intervallo**: si scelgono i giorni, massimo una settimana.

## Backup export/import (JSON o CSV): probabilmente superato

Il requisito _Backup_ di `docs/wiki/business/prodotto.md` (e la feature `backup` nel piano dell'MVP) viene dall'analisi iniziale, quando l'app era local-first: i dati stavano solo sul dispositivo (IndexedDB) e senza export si rischiava di perderli. Con la decisione _Server come fonte di verità_ i dati stanno in PostgreSQL, quindi:

- la protezione dai guasti è un backup del database lato server (es. `pg_dump` pianificato), da trattare nel `deploy`, non una funzione dell'app;
- un export/import utente servirebbe solo a portare i dati altrove o a ripristinarli a mano, cosa che per un'app personale non è stata chiesta.

**Confermato dall'utente**: si toglie il requisito _Backup_ (export/import JSON o CSV), la feature `backup` dal piano dell'MVP e la relativa domanda aperta sul formato. Resta solo l'export di condivisione in markdown; il backup del DB si tratta nel `deploy`.

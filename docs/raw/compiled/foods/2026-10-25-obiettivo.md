# Obiettivo — foods

Feature successiva dell'MVP: gli **alimenti dell'utente**, la copia personale degli alimenti che ognuno corregge e usa nel diario. Il catalogo condiviso c'è già (`food-catalog`). Regole di partenza in [Dati degli alimenti](../../wiki/business/dati-alimenti.md).

Perimetro concordato con l'utente:

- **API e modello**: entità `Alimento` per utente (campi come da bozza del modello dati) ed entità `Porzione`; rotte CRUD `/alimenti` con ricerca e ordinamento per frequenza e recenza.
- **Import dal catalogo**: dal prodotto trovato per barcode si salva una copia tra i propri alimenti, con anteprima dei valori correggibili, fonte, barcode e data di import; la porzione del provider proposta come predefinita.
- **Regole**: avvisi su valori mancanti o incoerenti, flag verificato, archiviazione invece di eliminazione.
- **UI**: lista degli alimenti con "Recenti" e "Più usati", creazione manuale, modifica, porzioni.

Risposte dell'utente alle domande aperte (tutte accettate come proposte):

1. Import da barcode in `foods` solo con codice inserito a mano; la fotocamera resta a `barcode-scan`.
2. L'alimento importato tiene il **riferimento al prodotto del catalogo** e il barcode (utile per la ri-sincronizzazione della fase 3).
3. Recenti e più usati: in `foods` solo i campi e l'ordinamento; l'aggiornamento dei contatori arriva con `diary`, quando si usa un alimento.
4. Cache offline: non si implementa qui; si decide solo cosa serve offline di questa schermata (vedi [Cache offline in sola lettura](../../wiki/progetto/decisione-cache-offline.md), in analisi).

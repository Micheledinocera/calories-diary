# Implementazione della struttura di foods

Scelte fatte durante l'implementazione (da confermare in revisione):

- **Porzioni**: quantità nell'unità base dell'alimento (g o ml), campo `quantita` come nel catalogo (la bozza diceva "grammi"). Al massimo una predefinita, nomi unici per alimento: controllati dalla validazione, non da un vincolo del DB. Si modificano sostituendo tutta la lista.
- **Collegamento al catalogo**: `POST /alimenti` con un barcode già nel catalogo collega l'alimento al prodotto (`fonte: off`, data di import); altrimenti l'alimento è `manuale`. Barcode unico per utente: un secondo alimento con lo stesso codice risponde 409 `ALIMENTO_ESISTENTE` con l'id di quello esistente.
- **Eliminazione**: possibile solo per un alimento mai usato nel diario (`utilizzi = 0`); altrimenti 409 `ALIMENTO_IN_USO` e si archivia.
- **Avvisi**: per gli alimenti dell'utente vale solo `KCAL_INCOERENTI` (i quattro valori sono obbligatori), calcolato dal back-end.
- **Ricerca e ordinamento**: `GET /alimenti` con `q` (nome, marca, barcode), `ordine` (`uso`, `recenti`, `nome`), `archiviati` (solo archiviati o solo attivi), `limite`. "Recenti" e "Più usati" restano vuoti finché `diary` non aggiorna i contatori.
- **UI provvisoria** (da validare con Claude Design a fine MVP): navigazione in alto "Oggi" / "Alimenti"; `/alimenti` con ricerca e sezioni; `/alimenti/nuovo` con ricerca per codice a barre inserito a mano e form precompilato; `/alimenti/:id` con modifica, verifica, archivia, elimina. La pagina "Oggi" resta quella provvisoria dello scaffolding.
- **Tipi**: tutti da `packages/shared`; unico tipo ad hoc del front-end `StatoFormAlimento` (valori vuoti mentre si compila il form).
- **Offline** (per la decisione sulla cache, in analisi): di questa schermata servirebbe offline la lista degli alimenti in sola lettura; creazione e modifica richiedono la rete.

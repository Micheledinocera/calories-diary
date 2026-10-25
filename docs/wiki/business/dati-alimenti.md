---
tipo: info
aggiornato: 2026-10-25
fonti:
  - raw/compiled/first-develop/analisi-iniziale-calorie-tracker.md
  - raw/compiled/first-develop/2026-10-25-decisioni-e-piano.md
  - raw/compiled/food-catalog/2026-10-25-obiettivo.md
  - raw/compiled/food-catalog/2026-10-25-open-food-facts-e-perimetro.md
  - raw/compiled/offline-cache/2026-10-25-decisione-niente-sync.md
  - raw/compiled/foods/2026-10-25-obiettivo.md
  - raw/compiled/foods/2026-10-25-decisioni-utente.md
  - raw/compiled/foods/2026-10-25-implementazione.md
---

# Dati degli alimenti

Regole su provenienza, consolidamento e uso dei dati nutrizionali.

## Principio guida

La fonte esterna serve **solo per trovare e importare** un alimento. Dopo l'import l'app lavora sulla **copia nostra**, che l'utente può verificare e correggere. Tutte le chiamate ai provider passano dal back-end (vedi [Server come fonte di verità](../progetto/decisione-server-fonte-di-verita.md)).

## Catalogo e alimenti dell'utente

I dati degli alimenti stanno su due livelli:

- **Catalogo condiviso**: i prodotti importati dal provider, comuni a tutti gli utenti. Fa da cache: un prodotto già scansionato da qualcuno si trova senza chiamare di nuovo il provider. Riflette i dati del provider, quindi i valori possono mancare. Codice: [Catalogo e lookup per barcode](../tecnico/api/catalogo.md).
- **Alimenti dell'utente**: la copia di ogni utente, che lui può correggere e segnare come verificata, con frequenza e recenza d'uso. Le correzioni di un utente non toccano i dati degli altri. Un alimento importato tiene il riferimento al prodotto del catalogo e il barcode. Codice: [Alimenti dell'utente](../tecnico/api/alimenti.md).

## Fonti

| Fonte | Uso | Note |
|---|---|---|
| **Open Food Facts (OFF)** | Prodotti confezionati, ricerca per codice a barre | Primo provider. Dati crowdsourced (ODbL): qualità variabile, da verificare sempre |
| **Inserimento manuale** | Alimenti sfusi o generici, prodotti mancanti su OFF | Valori dall'etichetta o dalle tabelle CREA (consultate a mano) |
| **Tabelle generiche** (fase 3) | Precaricare alimenti generici | Candidati: CIQUAL (licenza aperta), USDA FoodData Central (pubblico dominio), BDA-IEO (uso con citazione). Nessun precaricamento nell'MVP |

## Integrazione con Open Food Facts

- Lookup per barcode con l'API **v3.6**, chiedendo solo i campi necessari (`fields`): codice, nome (`product_name_it`, altrimenti `product_name`), marca, valori nutrizionali, porzione (`serving_size`, `serving_quantity`), immagine piccola.
- Valori per 100 g/ml: kcal, proteine, carboidrati, zuccheri, grassi, grassi saturi, fibre, sale. Si usano **solo i valori dichiarati** (etichetta o produttore), non quelli stimati da OFF.
- Limiti di OFF: **15 letture di prodotto al minuto per IP** (10 per le ricerche). Le chiamate partono tutte dal nostro server, quindi il limite vale per tutti gli utenti insieme: il back-end si ferma a 12 al minuto e ricorda per un giorno i codici non trovati.
- I codici a barre si normalizzano come fa OFF (es. `0000000000017` → `00000017`), così lo stesso prodotto non entra due volte.
- User-Agent identificativo dell'app, come richiesto da OFF: per questo le chiamate partono dal back-end.
- La ricerca testuale è più lenta e più limitata del lookup per barcode: solo come ripiego.
- Casi da gestire: prodotto non trovato; trovato senza valori nutrizionali; valori parziali (es. kcal senza macro); provider non raggiungibile (l'app continua a funzionare con i dati nostri).

## Import e consolidamento

- Il lookup restituisce, insieme al prodotto, gli avvisi su valori assenti, parziali (manca una tra kcal, proteine, carboidrati, grassi) o incoerenti.
- Prima di salvare un prodotto del provider tra i propri alimenti: anteprima dei valori per 100 g, correggibili.
- La copia salvata registra la fonte, il codice a barre e la data di import.
- Flag **verificato**: l'utente conferma che i valori corrispondono all'etichetta.
- **Controllo di coerenza**: kcal stimate = 4 × proteine + 4 × carboidrati + 9 × grassi. Se lo scarto rispetto alle kcal dichiarate supera il **20%**, l'app mostra un avviso.
- Ri-sincronizzazione manuale dal provider, con diff da confermare (fase 3).

## Regole del diario

- **Valori congelati**: ogni voce del diario salva nome, grammi e valori calcolati al momento dell'inserimento. Modificare un alimento in seguito non altera lo storico.
- Gli alimenti usati nel diario non si eliminano: si **archiviano** (nascosti dalla ricerca). Un alimento mai usato si può eliminare.
- Calcolo: `valore_per_100 × grammi / 100`. L'arrotondamento si applica solo in visualizzazione.
- Per "Recenti" e "Più usati" ogni alimento tiene data dell'ultimo uso e numero di utilizzi.

## Modello dati (bozza)

Catalogo e alimenti dell'utente sono definiti (vedi [Catalogo](../tecnico/api/catalogo.md) e [Alimenti dell'utente](../tecnico/api/alimenti.md)); il resto è da confermare nella feature `diary`. I nomi restano in italiano anche nel codice.

- **prodotto del catalogo** (condiviso): barcode (unico), fonte e id nella fonte, nome, marca, unità base, valori per 100 tutti facoltativi, porzione del provider, immagine, data di import e di aggiornamento.
- **alimento** (per utente): nome, marca, barcode (unico per utente), fonte (oggi `manuale` o `off`; le tabelle generiche arriveranno in fase 3), riferimento al prodotto del catalogo, valori per 100 (**solo kcal, proteine, carboidrati, grassi** nell'MVP, obbligatori), unità base (g o ml), verificato, data di import, data di aggiornamento, ultimo uso, numero di utilizzi, archiviato.
- **porzione**: alimento, nome (es. "1 vasetto"), quantità nell'unità base dell'alimento, predefinita.
- **voce del diario**: data, pasto, alimento (facoltativo), nome congelato, grammi, porzione, kcal, proteine, carboidrati e grassi congelati, data di creazione.
- **pasto**: nome, ordine (già presente nel codice, vedi [Pasti](../tecnico/api/pasti.md)).
- Fase 2: **ricetta** (nome, peso finale, esposta come alimento) e **ingrediente della ricetta** (alimento, grammi).

## Domande aperte

- Gli altri valori del catalogo (zuccheri, grassi saturi, fibre, sale) si potranno mostrare più avanti, ad esempio in un dettaglio alimento: non nell'MVP.

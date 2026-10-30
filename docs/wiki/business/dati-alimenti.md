---
tipo: info
aggiornato: 2026-10-30
fonti:
  - raw/compiled/minor-fixes/2026-10-30-obiettivo.md
  - raw/compiled/meals/2026-10-30-pasti-preferiti.md
  - raw/compiled/meals/2026-10-30-decisioni-collegamento.md
  - raw/compiled/first-develop/analisi-iniziale-calorie-tracker.md
  - raw/compiled/first-develop/2026-10-25-decisioni-e-piano.md
  - raw/compiled/food-catalog/2026-10-25-obiettivo.md
  - raw/compiled/food-catalog/2026-10-25-open-food-facts-e-perimetro.md
  - raw/compiled/offline-cache/2026-10-25-decisione-niente-sync.md
  - raw/compiled/foods/2026-10-25-obiettivo.md
  - raw/compiled/foods/2026-10-25-decisioni-utente.md
  - raw/compiled/foods/2026-10-25-implementazione.md
  - raw/compiled/diary/2026-10-25-decisioni-diario.md
  - raw/compiled/ui-tweaks/2026-10-27-task.md
  - raw/compiled/ui-tweaks/2026-10-27-decisioni.md
---

# Dati degli alimenti

Regole su provenienza, consolidamento e uso dei dati nutrizionali.

## Principio guida

La fonte esterna serve **solo per trovare e importare** un alimento. Dopo l'import l'app lavora sulla **copia nostra**, che gli utenti possono verificare e correggere. Tutte le chiamate ai provider passano dal back-end (vedi [Server come fonte di verità](../progetto/decisione-server-fonte-di-verita.md)).

## Catalogo e alimenti

I dati degli alimenti stanno su due livelli:

- **Catalogo condiviso**: i prodotti importati dal provider, comuni a tutti gli utenti. Fa da cache: un prodotto già scansionato da qualcuno si trova senza chiamare di nuovo il provider. Riflette i dati del provider, quindi i valori possono mancare. Codice: [Catalogo e lookup per barcode](../tecnico/api/catalogo.md).
- **Alimenti**: la copia nostra, **condivisa tra tutti gli utenti** (un pool unico; i pasti invece restano di ciascuno). Tutti la vedono e la usano nel diario. Un alimento importato tiene il riferimento al prodotto del catalogo e il barcode, unico nel pool. Codice: [Alimenti](../tecnico/api/alimenti.md).

Chi può fare cosa su un alimento del pool:

| Azione | Chi | Effetto |
|---|---|---|
| Modificare (valori, porzioni, verificato) | Chiunque | Per tutti, anche nei giorni passati dei loro diari |
| Archiviare | Chiunque | **Solo per sé**: lo nasconde dalla propria ricerca ("nascondi per me") |
| Eliminare | Solo l'autore | Solo se nessun diario e nessun pasto preferito, di nessun utente, lo usa |

"Recenti" e "Più usati" restano **per utente**: ognuno vede i propri.

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
- Flag **verificato**: l'utente conferma che i valori corrispondono all'etichetta. Un prodotto trovato da barcode parte già verificato, anche con avvisi: l'utente può spegnerlo prima di salvare.
- **Controllo di coerenza**: kcal stimate = 4 × proteine + 4 × carboidrati + 9 × grassi. Se lo scarto rispetto alle kcal dichiarate supera il **20%**, l'app mostra un avviso.
- Ri-sincronizzazione manuale dal provider, con diff da confermare (fase 3).

## Regole del diario

- **Valori ricalcolati**: ogni voce del diario salva solo alimento e quantità. Kcal e macro si calcolano sempre dai valori attuali dell'alimento: correggere un alimento cambia anche i totali dei giorni passati. (Sostituisce la regola precedente dei valori congelati, per decisione dell'utente nella feature `diary`.)
- Per questo gli alimenti usati nel diario di qualcuno non si eliminano mai: si **archiviano** (nascosti dalla ricerca di chi li archivia, ancora visibili nei giorni in cui sono stati usati). Un alimento mai usato si può eliminare, solo da chi l'ha creato.
- Calcolo: `valore_per_100 × grammi / 100`. L'arrotondamento si applica solo in visualizzazione.
- Per "Recenti" e "Più usati" si tengono, per ogni utente e alimento, data dell'ultimo uso e numero di utilizzi.

## Modello dati (bozza)

Catalogo, alimenti e diario sono definiti (vedi [Catalogo](../tecnico/api/catalogo.md), [Alimenti](../tecnico/api/alimenti.md) e [Diario](../tecnico/api/diario.md)); le ricette sono ancora una bozza. I nomi restano in italiano anche nel codice.

- **prodotto del catalogo** (condiviso): barcode (unico), fonte e id nella fonte, nome, marca, unità base, valori per 100 tutti facoltativi, porzione del provider, immagine, data di import e di aggiornamento.
- **alimento** (condiviso): autore, nome, marca, barcode (unico), fonte (oggi `manuale` o `off`; le tabelle generiche arriveranno in fase 3), riferimento al prodotto del catalogo, valori per 100 (**solo kcal, proteine, carboidrati, grassi** nell'MVP, obbligatori), unità base (g o ml), verificato, data di import, data di aggiornamento.
- **uso dell'alimento** (per utente e alimento): ultimo uso, numero di utilizzi, archiviato.
- **porzione**: alimento, nome (es. "1 vasetto"), quantità nell'unità base dell'alimento, predefinita.
- **pasto**: un pasto di un giorno dell'utente: giorno, tipo (colazione, pranzo, cena, spuntino), ordine nella giornata.
- **voce**: pasto, alimento, quantità in g o ml. Niente valori salvati: si ricalcolano dall'alimento.
- **pasto preferito** (condiviso): autore, nome, voci (alimento e quantità). Un pasto del giorno resta collegato al preferito finché è identico.
- Fase 2: **ricetta** (nome, peso finale, esposta come alimento) e **ingrediente della ricetta** (alimento, grammi).

## Domande aperte

- Gli altri valori del catalogo (zuccheri, grassi saturi, fibre, sale) si potranno mostrare più avanti, ad esempio in un dettaglio alimento: non nell'MVP.
- Con il pool condiviso chiunque può correggere un alimento per tutti, e la correzione cambia anche i totali passati degli altri. Non c'è uno storico delle modifiche né l'indicazione di chi ha corretto: da valutare se gli utenti diventano più di qualche persona di fiducia.

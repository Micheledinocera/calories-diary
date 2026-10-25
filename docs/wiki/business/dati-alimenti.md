---
tipo: info
aggiornato: 2026-10-25
fonti:
  - raw/compiled/first-develop/analisi-iniziale-calorie-tracker.md
  - raw/compiled/first-develop/2026-10-25-decisioni-e-piano.md
---

# Dati degli alimenti

Regole su provenienza, consolidamento e uso dei dati nutrizionali.

## Principio guida

La fonte esterna serve **solo per trovare e importare** un alimento. Dopo l'import l'app lavora sulla **copia nostra**, che l'utente può verificare e correggere. Tutte le chiamate ai provider passano dal back-end (vedi [Architettura local-first](../progetto/decisione-local-first.md)).

## Fonti

| Fonte | Uso | Note |
|---|---|---|
| **Open Food Facts (OFF)** | Prodotti confezionati, ricerca per codice a barre | Primo provider. Dati crowdsourced (ODbL): qualità variabile, da verificare sempre |
| **Inserimento manuale** | Alimenti sfusi o generici, prodotti mancanti su OFF | Valori dall'etichetta o dalle tabelle CREA (consultate a mano) |
| **Tabelle generiche** (fase 3) | Precaricare alimenti generici | Candidati: CIQUAL (licenza aperta), USDA FoodData Central (pubblico dominio), BDA-IEO (uso con citazione). Nessun precaricamento nell'MVP |

## Integrazione con Open Food Facts

- Lookup per barcode con l'API v3, chiedendo solo i campi necessari (`fields`): codice, nome (`product_name_it`, altrimenti `product_name`), marca, `nutriments`, porzione (`serving_size`, `serving_quantity`), immagine piccola.
- Valori per 100 g/ml in `nutriments`: kcal, proteine, carboidrati, zuccheri, grassi, grassi saturi, fibre, sale.
- User-Agent identificativo dell'app, come richiesto da OFF: per questo le chiamate partono dal back-end.
- La ricerca testuale è più lenta e più limitata del lookup per barcode: solo come ripiego.
- Casi da gestire: prodotto non trovato; trovato senza valori nutrizionali; valori parziali (es. kcal senza macro); provider non raggiungibile (l'app continua a funzionare con i dati nostri).

## Import e consolidamento

- Prima di salvare un prodotto del provider: anteprima dei valori per 100 g, correggibili.
- La copia salvata registra la fonte, il codice a barre e la data di import.
- Flag **verificato**: l'utente conferma che i valori corrispondono all'etichetta.
- **Controllo di coerenza**: kcal stimate = 4 × proteine + 4 × carboidrati + 9 × grassi. Se lo scarto rispetto alle kcal dichiarate supera il **20%**, l'app mostra un avviso.
- Ri-sincronizzazione manuale dal provider, con diff da confermare (fase 3).

## Regole del diario

- **Valori congelati**: ogni voce del diario salva nome, grammi e valori calcolati al momento dell'inserimento. Modificare un alimento in seguito non altera lo storico.
- Gli alimenti usati nel diario non si eliminano: si **archiviano** (nascosti dalla ricerca).
- Calcolo: `valore_per_100 × grammi / 100`. L'arrotondamento si applica solo in visualizzazione.
- Per "Recenti" e "Più usati" ogni alimento tiene data dell'ultimo uso e numero di utilizzi.

## Modello dati (bozza)

Da confermare nelle feature `food-catalog`, `sync` e `diary`. I nomi restano in italiano anche nel codice.

- **alimento**: nome, marca, barcode (unico), fonte (`off`, `manuale`, `crea`, `ciqual`, `usda`, `bda`) e id nella fonte, valori per 100 (kcal, proteine, carboidrati, grassi obbligatori; zuccheri, grassi saturi, fibre, sale facoltativi), unità base (g o ml), verificato, data di import, data di aggiornamento, ultimo uso, numero di utilizzi, archiviato.
- **porzione**: alimento, nome (es. "1 vasetto"), grammi, predefinita.
- **voce del diario**: data, pasto, alimento (facoltativo), nome congelato, grammi, porzione, kcal, proteine, carboidrati e grassi congelati, data di creazione.
- **pasto**: nome, ordine (già presente nel codice, vedi [Pasti](../tecnico/api/pasti.md)).
- Fase 2: **ricetta** (nome, peso finale, esposta come alimento) e **ingrediente della ricetta** (alimento, grammi).

Le tabelle sincronizzate col client avranno anche id UUID generati dal client, data di aggiornamento e cancellazione logica (vedi [Architettura local-first](../progetto/decisione-local-first.md)).

## Domande aperte

- Limiti di frequenza dell'API di Open Food Facts: da verificare nella documentazione ufficiale prima di `food-catalog`.
- Il catalogo dei prodotti importati sul back-end e gli alimenti dell'utente sono la stessa tabella (un solo utente) o due livelli distinti? Da decidere in `food-catalog`.

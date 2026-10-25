# Calorie Tracker personale — Analisi iniziale

> Documento di partenza da integrare con l'analisi tecnica e funzionale di dettaglio.
> Le sezioni marcate **[DA DEFINIRE]** contengono decisioni ancora aperte.

## 1. Contesto e obiettivo

Applicazione **personale** (singolo utente) per tracciare l'apporto calorico e di macronutrienti giornaliero.

Obiettivi principali:
- registrare rapidamente ciò che si mangia (per pasto e per giorno);
- calcolare kcal e macronutrienti a partire da grammi/porzioni;
- costruire nel tempo una **base dati locale consolidata** degli alimenti usati abitualmente, riducendo progressivamente la dipendenza da fonti esterne.

Non obiettivi (almeno nella prima versione):
- multi-utente, social, condivisione;
- piani dietetici, consigli nutrizionali, obiettivi calcolati automaticamente;
- micronutrienti dettagliati (vitamine, minerali).

## 2. Strategia dati

### 2.1 Principio guida

La fonte esterna serve **solo per trovare e importare** un alimento. Dopo l'import, l'app lavora esclusivamente sulla **copia locale**, che l'utente può verificare e correggere.

### 2.2 Fonti

| Fonte | Uso | Note |
|---|---|---|
| **Open Food Facts (OFF)** | Prodotti confezionati, ricerca per codice a barre | API gratuita, dati crowdsourced (licenza ODbL): qualità variabile, vanno sempre verificati |
| **Inserimento manuale** | Alimenti sfusi o generici (frutta, verdura, carne, pasta, olio…) e prodotti mancanti su OFF | Valori presi dall'etichetta o dalle tabelle CREA (consultazione manuale su alimentinutrizione.it) |
| **Import tabelle generiche** *(opzionale, fase successiva)* | Precaricare alimenti generici | Candidati: CIQUAL (gratuito, licenza aperta), USDA FoodData Central (pubblico dominio), BDA-IEO (Excel a fronte di donazione, uso con citazione della fonte) |

### 2.3 Integrazione Open Food Facts

- Endpoint principale: lookup per barcode, API v3
  `GET https://world.openfoodfacts.org/api/v3/product/{barcode}?fields=...`
- Richiedere solo i campi necessari tramite `fields`, ad esempio:
  `code,product_name,product_name_it,brands,nutriments,serving_size,serving_quantity,image_front_small_url`
- Campi nutrizionali di interesse in `nutriments` (valori per 100 g/ml):
  - `energy-kcal_100g`
  - `proteins_100g`
  - `carbohydrates_100g`
  - `sugars_100g`
  - `fat_100g`
  - `saturated-fat_100g`
  - `fiber_100g`
  - `salt_100g`
- Impostare uno **User-Agent identificativo**, ad esempio `NomeApp/0.1 (email@esempio.it)`, come richiesto dalla documentazione OFF.
- Verificare nella documentazione ufficiale i **limiti di frequenza** delle chiamate. La ricerca testuale è più limitata e più lenta del lookup per barcode, quindi va usata solo come fallback.
- Gestire i casi:
  - prodotto non trovato;
  - prodotto trovato ma senza valori nutrizionali;
  - valori parziali (es. kcal presenti ma macro mancanti);
  - API non raggiungibile (l'app deve funzionare comunque con i dati locali).

## 3. Requisiti funzionali (prima versione)

### 3.1 Diario
- Vista giornaliera con i pasti: colazione, pranzo, cena, spuntini (elenco pasti configurabile **[DA DEFINIRE]**).
- Aggiunta di una voce: scelta dell'alimento, quantità in grammi oppure in porzioni, pasto.
- Modifica ed eliminazione delle voci.
- Totali per pasto e per giorno: kcal, proteine, carboidrati, grassi.
- Navigazione tra i giorni.

### 3.2 Ricerca e aggiunta alimenti
Ordine di ricerca:
1. **alimenti locali**, ordinati per frequenza e recenza d'uso;
2. **barcode** (scansione con fotocamera o inserimento manuale): prima nel DB locale, poi su OFF;
3. **ricerca testuale su OFF** come fallback;
4. **creazione manuale**.

Sezioni "Recenti" e "Più usati" in evidenza.

### 3.3 Import e consolidamento
Quando un prodotto arriva da OFF:
- mostrare un'anteprima dei valori per 100 g;
- permettere di correggerli prima del salvataggio;
- salvare la copia locale con `fonte = off`, il barcode e la data di import.

Inoltre:
- Flag **"verificato"**: l'utente conferma che i valori corrispondono all'etichetta.
- **Controllo di coerenza** automatico: kcal stimate = 4×proteine + 4×carboidrati + 9×grassi. Se lo scarto rispetto alle kcal dichiarate supera una soglia (proposta 20% **[DA DEFINIRE]**), mostrare un avviso.
- Possibilità di **ri-sincronizzare** manualmente un alimento da OFF, mostrando le differenze prima di applicarle.

### 3.4 Porzioni
- Porzioni personalizzate per alimento (es. "1 vasetto = 125 g", "1 cucchiaio = 10 g").
- Se OFF fornisce `serving_quantity`, proporla come porzione predefinita.

### 3.5 Ricette *(fase 2)*
- Ricetta = elenco di ingredienti con grammi + peso finale del piatto cotto.
- Valori per 100 g calcolati automaticamente; la ricetta si usa nel diario come un normale alimento.

### 3.6 Obiettivi e riepiloghi *(fase 2)*
- Obiettivo kcal giornaliero e, opzionalmente, obiettivi per i macronutrienti (impostati manualmente).
- Storico settimanale e mensile con grafici semplici.

## 4. Modello dati (bozza)

```
alimento
  id                 PK
  nome               text
  marca              text, nullable
  barcode            text, nullable, unique
  fonte              enum: off | manuale | crea | ciqual | usda | bda
  fonte_id           text, nullable       -- id nella fonte esterna
  kcal_100           decimal
  proteine_100       decimal
  carboidrati_100    decimal
  zuccheri_100       decimal, nullable
  grassi_100         decimal
  grassi_saturi_100  decimal, nullable
  fibre_100          decimal, nullable
  sale_100           decimal, nullable
  unita_base         enum: g | ml
  verificato         bool
  importato_il       datetime, nullable
  aggiornato_il      datetime
  ultimo_uso         datetime, nullable
  n_utilizzi         int
  archiviato         bool                 -- nascosto dalla ricerca, non eliminato

porzione
  id                 PK
  alimento_id        FK -> alimento
  nome               text                 -- es. "1 vasetto"
  grammi             decimal
  predefinita        bool

voce_diario
  id                 PK
  data               date
  pasto              enum / FK
  alimento_id        FK -> alimento, nullable
  nome_snapshot      text
  grammi             decimal
  porzione_id        FK, nullable
  kcal               decimal              -- valori CONGELATI al momento dell'inserimento
  proteine           decimal
  carboidrati        decimal
  grassi             decimal
  creato_il          datetime

ricetta              (fase 2)
  id, nome, peso_finale_g, alimento_id    -- ricetta esposta come alimento

ricetta_ingrediente  (fase 2)
  id, ricetta_id, alimento_id, grammi
```

### Regole importanti
- **Snapshot nel diario**: le voci salvano i valori calcolati al momento dell'inserimento. Modificare un alimento in seguito **non** deve alterare lo storico.
- Gli alimenti usati nel diario non si eliminano fisicamente: si archiviano.
- Le kcal si calcolano come `valore_100 × grammi / 100`. L'arrotondamento si applica solo in visualizzazione.

## 5. Requisiti non funzionali
- **Offline-first**: diario e alimenti locali devono funzionare senza rete; OFF è un'integrazione opzionale.
- **Inserimento rapido**: aggiungere un alimento già noto deve richiedere pochi tocchi.
- **Backup ed export** dei dati (JSON o CSV) e relativo import.
- **Privacy**: dati solo locali o su storage personale; nessuna telemetria.
- Attribuzione della fonte: indicare nell'app che parte dei dati proviene da Open Food Facts (ODbL).

## 6. Decisioni aperte [DA DEFINIRE]
1. **Piattaforma**: app mobile nativa o cross-platform, PWA, oppure web app con backend personale.
2. **Storage**: solo locale sul dispositivo (es. SQLite/IndexedDB) oppure backend con DB e sincronizzazione tra dispositivi.
3. **Scansione barcode**: libreria o API della fotocamera da usare in base alla piattaforma scelta.
4. **Precaricamento** di alimenti generici (CIQUAL, USDA, BDA) già nella prima versione, oppure solo inserimento manuale.
5. Soglia del controllo di coerenza kcal/macro.
6. Lingua dei nomi prodotto: preferire `product_name_it` con fallback su `product_name`.

## 7. Fasi proposte

| Fase | Contenuto |
|---|---|
| **MVP** | Diario giornaliero, alimenti manuali, lookup OFF per barcode con import, consolidamento locale, recenti e più usati, porzioni, totali giornalieri, export/backup |
| **Fase 2** | Scansione barcode da fotocamera (se non già nell'MVP), ricette, obiettivi, storico e grafici, ricerca testuale OFF |
| **Fase 3** | Import di tabelle generiche, ri-sincronizzazione con diff, eventuale sync multi-dispositivo |

## 8. Riferimenti
- Open Food Facts — documentazione API: https://openfoodfacts.github.io/openfoodfacts-server/api/
- USDA FoodData Central — API guide: https://fdc.nal.usda.gov/api-guide.html
- CREA — Tabelle di composizione degli alimenti: https://www.alimentinutrizione.it
- BDA — Banca Dati di Composizione degli Alimenti (IEO): https://bda.ieo.it
- CIQUAL (ANSES): https://ciqual.anses.fr

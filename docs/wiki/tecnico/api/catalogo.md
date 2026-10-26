---
tipo: info
aggiornato: 2026-10-25
fonti:
  - raw/compiled/food-catalog/2026-10-25-obiettivo.md
  - raw/compiled/food-catalog/2026-10-25-open-food-facts-e-perimetro.md
---

# Catalogo e lookup per barcode

Modulo `src/modules/catalogo/`. Il catalogo è il primo dei due livelli di dati degli alimenti (vedi [Dati degli alimenti](../../business/dati-alimenti.md#catalogo-e-alimenti-dellutente)): i prodotti importati dal provider, **condivisi tra tutti gli utenti** come cache comune. Il secondo livello sono gli [alimenti dell'utente](./alimenti.md).

## Entità `ProdottoCatalogo`

Tabella `prodotto_catalogo`:

| Campo | Tipo | Note |
|---|---|---|
| `id` | uuid | Generato alla creazione |
| `barcode` | varchar(14) | Unico, normalizzato (vedi sotto) |
| `fonte` / `idFonte` | enum `off` / varchar(50) | Provider e codice presso il provider |
| `nome`, `marca` | varchar(255), facoltativi | `nome`: prima `product_name_it`, poi `product_name`; `marca`: la prima di `brands` |
| `unitaBase` | enum `g` \| `ml` | `ml` se OFF indica millilitri per la quantità o la porzione |
| `kcal`, `proteine`, `carboidrati`, `grassi`, `zuccheri`, `grassiSaturi`, `fibre`, `sale` | numeric(10,3), facoltativi | Valori per 100 g o 100 ml |
| `porzioneDescrizione` / `porzioneQuantita` | varchar(100) / numeric(10,3), facoltativi | Porzione del provider (es. "47.5 g", 47.5) |
| `immagineUrl` | varchar(500), facoltativo | Solo URL https |
| `importatoIl` / `aggiornatoIl` | timestamptz | `onCreate` / `onUpdate` |

Tutti i valori sono facoltativi: il catalogo riflette quello che dà il provider.

## Rotta

`GET /catalogo/barcode/:codice`, dietro `richiediAutenticazione`. Risposta `lookupBarcodeSchema` (vedi [Contratti](../shared/contratti.md)):

```json
{ "prodotto": { "barcode": "8076809513753", "nome": "Pesto alla genovese", "valoriPer100": { "kcal": 492, "…": "…" }, "…": "…" },
  "origine": "provider", "avvisi": [] }
```

1. Il codice (solo cifre, fino a 20) viene normalizzato; dopo la normalizzazione deve avere al massimo 14 cifre e non essere tutto zeri, altrimenti 400 `VALIDAZIONE`.
2. Se è nel catalogo risponde con `origine: "catalogo"`, senza chiamare il provider.
3. Se è nella cache dei non trovati risponde 404 `PRODOTTO_NON_TROVATO`.
4. Altrimenti conta la chiamata nel limite globale e interroga il provider: se lo trova lo salva nel catalogo (`origine: "provider"`), altrimenti mette il codice nella cache dei non trovati e risponde 404. Due import contemporanei dello stesso codice non falliscono: il secondo rilegge il prodotto salvato dal primo.

`avvisi` è calcolato a ogni risposta da `calcolaAvvisi` (`avvisi.ts`), secondo le regole di [Import e consolidamento](../../business/dati-alimenti.md#import-e-consolidamento):

| Avviso | Quando |
|---|---|
| `SENZA_VALORI` | Nessun valore nutrizionale |
| `VALORI_PARZIALI` | Manca almeno uno tra kcal, proteine, carboidrati, grassi |
| `KCAL_INCOERENTI` | Le kcal dichiarate si scostano di oltre il 20% da 4 × proteine + 4 × carboidrati + 9 × grassi (con kcal 0, se la stima è positiva) |

Errori propri: 404 `PRODOTTO_NON_TROVATO`, 503 `PROVIDER_NON_DISPONIBILE` (provider irraggiungibile, timeout di 5 s o errore), 429 `PROVIDER_OCCUPATO` (`dettagli.riprovaTraS`; limite nostro o di OFF).

## Normalizzazione del barcode

`normalizzaBarcode` (`barcode.ts`) fa come Open Food Facts, così lo stesso prodotto non entra due volte: toglie gli zeri iniziali, poi porta a 8 cifre i codici fino a 7 e a 13 (EAN-13) quelli da 9 a 12. Esempi: `0000000000017` → `00000017`, `049000028911` → `0049000028911`.

## Provider

Interfaccia `ProviderAlimenti` (`provider.ts`): `cercaBarcode(barcode)` restituisce un `ProdottoProvider` già normalizzato, `null` se il provider non conosce il codice, o lancia `ErroreApp` se non può rispondere. È una dipendenza di `creaApp`: `server.ts` passa l'adapter di Open Food Facts, i test un provider finto in memoria (`test/provider-finto.ts`), senza rete.

### Open Food Facts

`creaOpenFoodFacts({ baseUrl, userAgent, logger })` in `open-food-facts.ts`. Documentazione: https://openfoodfacts.github.io/openfoodfacts-server/api/

- `GET {OFF_BASE_URL}/api/v3.6/product/{barcode}?fields=…`, solo i campi usati. User-Agent `CaloriesDiary/{APP_VERSION} ({OFF_CONTATTO})`, come richiesto da OFF.
- Versione **fissata a v3.6**: i valori stanno in `product.nutrition.aggregated_set.nutrients` (il vecchio `nutriments` torna vuoto). Si usa solo il set `preparation: "as_sold"`.
- Si scartano i valori con `source: "estimate"`: restano solo quelli dell'etichetta o del produttore, così `VALORI_PARZIALI` è onesto. I `mg` diventano grammi; se mancano le kcal si ricavano dai kJ (÷ 4,184).
- I testi vengono tagliati alla lunghezza delle colonne (dati crowdsourced).
- HTTP 404 → `null`; 429 → `PROVIDER_OCCUPATO`; rete, timeout o altri errori → `PROVIDER_NON_DISPONIBILE` (loggati come warning).

## Redis

| Chiave | Uso |
|---|---|
| `provider:off` | Limite globale: **12 chiamate al minuto** verso OFF (che ne consente 15 per IP, e tutti gli utenti escono dall'IP del server). Finestra fissa come il [rate limit del login](./auth.md#rate-limit-del-login); con Redis giù la chiamata passa |
| `catalogo:non-trovato:<barcode>` | Codici sconosciuti al provider, per **24 ore**: una nuova scansione non consuma chiamate |

## Configurazione

- `OFF_BASE_URL`: default produzione `https://world.openfoodfacts.org`. Staging, per prove a mano: `https://world.openfoodfacts.net` (basic auth `off`/`off`).
- `OFF_CONTATTO`: email di contatto nello User-Agent, **obbligatoria**. Nel `docker-compose.yml` si passa dall'ambiente della macchina (`OFF_CONTATTO`); nei test ha un valore finto.

## Domande aperte

- Aggiornamento dei prodotti già in catalogo: oggi un prodotto importato non viene più riletto dal provider (la ri-sincronizzazione è prevista in fase 3).

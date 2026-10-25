# Open Food Facts: verifiche e perimetro di food-catalog

## Verifiche sull'API (25/10/2026)

Dalla documentazione ufficiale (https://openfoodfacts.github.io/openfoodfacts-server/api/) e da chiamate di prova:

- Limiti: 15 richieste/minuto per IP per la lettura dei prodotti, 10/minuto per le ricerche. Oltre un limite globale OFF risponde 503. Tutte le chiamate partono dal nostro back-end, quindi il limite vale per tutti gli utenti insieme.
- User-Agent obbligatorio nella forma `NomeApp/versione (email)`. Lettura senza autenticazione. Staging: `world.openfoodfacts.net` (basic auth `off`/`off`).
- v2 deprecata, v3 consigliata. La **v3.6** ha un nuovo schema dei valori: `product.nutrition.aggregated_set` (`per: "100g"`, `preparation: "as_sold"`) con `nutrients.<nome>.{value, unit, source, source_per, modifier}`. `source` vale `manufacturer`, `packaging`, `estimate`… Con v3.6 il vecchio `nutriments` torna vuoto se lo si chiede nei `fields`.
- Per le bevande i valori sono per 100 ml (`source_per: "100ml"`); l'unità si ricava da `product_quantity_unit` / `serving_quantity_unit`.
- Codici normalizzati da OFF: `0000000000017` → `00000017` (warning `different_normalized_product_code`).
- Prodotto inesistente: HTTP 404, `status: "failure"`, `result.id: "product_not_found"`.

## Decisioni prese con l'utente

- `food-catalog` = **solo catalogo condiviso + lookup per barcode**. Alimenti e porzioni dell'utente vanno in `foods`, dopo `sync`, perché sono dati sincronizzati e il loro formato lo definisce `sync`.
- Entità catalogo con tutti i valori per 100 **facoltativi** (kcal, proteine, carboidrati, grassi, zuccheri, grassi saturi, fibre, sale): il catalogo riflette il provider; l'obbligo delle 4 voci principali vale per l'alimento dell'utente.
- API OFF fissata a `/api/v3.6/`; si usano solo i valori non stimati (`source` diverso da `estimate`).
- `GET /catalogo/barcode/:codice`: prima il catalogo, poi il provider (normalizza e salva). Risposta con origine e avvisi (`SENZA_VALORI`, `VALORI_PARZIALI`, `KCAL_INCOERENTI` oltre il 20%). Errori 404 `PRODOTTO_NON_TROVATO`, 503 `PROVIDER_NON_DISPONIBILE`, 429 `PROVIDER_OCCUPATO`.
- Redis: limite globale di 12 chiamate/minuto verso OFF; cache dei "non trovato" per 24 ore.
- Adapter `ProviderAlimenti` iniettato nell'app (finto nei test); env `OFF_BASE_URL` e `OFF_CONTATTO`.

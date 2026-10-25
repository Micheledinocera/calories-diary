---
tipo: info
aggiornato: 2026-10-25
fonti:
  - raw/compiled/foods/2026-10-25-obiettivo.md
  - raw/compiled/foods/2026-10-25-decisioni-utente.md
  - raw/compiled/foods/2026-10-25-implementazione.md
  - raw/compiled/diary/2026-10-25-decisioni-diario.md
---

# Alimenti dell'utente

Modulo `src/modules/alimenti/`. Gli alimenti dell'utente sono il secondo livello dei dati degli alimenti (vedi [Dati degli alimenti](../../business/dati-alimenti.md#catalogo-e-alimenti-dellutente)): la copia personale che l'utente corregge e usa nel diario. Sono **per utente**; nell'MVP tracciano solo kcal e macro.

## Entità `Alimento`

Tabella `alimento`:

| Campo | Tipo | Note |
|---|---|---|
| `id` | uuid | Generato alla creazione |
| `utente` | FK → `utente` | Cancellazione a cascata |
| `nome`, `marca` | varchar(255); `marca` facoltativa | |
| `barcode` | varchar(14), facoltativo | Normalizzato come nel catalogo; unico per utente (`utente_id`, `barcode`) |
| `fonte` | enum `manuale` \| `off` | `off` se collegato a un prodotto del catalogo |
| `prodottoCatalogo` | FK → `prodotto_catalogo`, facoltativa | `set null` se il prodotto sparisce; serve alla ri-sincronizzazione della fase 3 |
| `unitaBase` | enum `g` \| `ml` | |
| `kcal`, `proteine`, `carboidrati`, `grassi` | numeric(10,3) | Per 100 g o 100 ml, obbligatori |
| `verificato`, `archiviato` | boolean | Default `false` |
| `ultimoUso` / `utilizzi` | timestamptz facoltativo / int | Per "Recenti" e "Più usati"; li aggiorna il [diario](./diario.md#entità-voce) quando si aggiunge o si elimina una voce |
| `importatoIl` | timestamptz, facoltativo | Valorizzato quando l'alimento nasce dal catalogo |
| `creatoIl` / `aggiornatoIl` | timestamptz | `onCreate` / `onUpdate` |

## Entità `Porzione`

Tabella `porzione` (indice su `alimento_id`): `alimento` (FK, cascata), `nome` (varchar(50)), `quantita` (numeric(10,3), nell'unità base dell'alimento), `predefinita`. Al massimo una predefinita e nomi unici per alimento sono garantiti dalla validazione (`nuovoAlimentoSchema`), non da un vincolo: la lista si sostituisce per intero (`orphanRemoval`) e i nuovi record verrebbero inseriti prima di eliminare i vecchi.

## Rotte

Tutte dietro `richiediAutenticazione`, sempre sugli alimenti dell'utente corrente. Contratti in [Contratti condivisi](../shared/contratti.md).

| Rotta | Risposta |
|---|---|
| `GET /alimenti` | Lista di `Alimento`. Query (`filtriAlimentiSchema`): `q` (nome o marca, senza distinzione di maiuscole; barcode se sono solo cifre), `ordine` (`uso`: utilizzi, poi ultimo uso, poi nome; `recenti`: solo alimenti già usati; `nome`), `archiviati` (`true`: solo archiviati; default solo attivi), `limite` (default 100, max 200) |
| `POST /alimenti` | 201 con l'`Alimento` creato (`nuovoAlimentoSchema`). Un barcode già nel catalogo collega l'alimento al prodotto (`fonte: off`, `importatoIl`); altrimenti è `manuale` |
| `GET /alimenti/:id` | Un `Alimento` |
| `PATCH /alimenti/:id` | `Alimento` aggiornato (`modificaAlimentoSchema`, campi tutti facoltativi; `porzioni` sostituisce la lista; il barcode non si modifica) |
| `DELETE /alimenti/:id` | 204; 409 `ALIMENTO_IN_USO` se l'alimento è già stato usato nel diario (`utilizzi > 0`): va archiviato |

Errori propri: 409 `ALIMENTO_ESISTENTE` se l'utente ha già un alimento con lo stesso barcode (`dettagli.id`: quello esistente); 404 `NON_TROVATO` se l'alimento non esiste o è di un altro utente.

Il DTO ha `avvisi`: per gli alimenti dell'utente vale solo `KCAL_INCOERENTI`, calcolato con `kcalIncoerenti` di `catalogo/avvisi.ts` (le stesse regole del catalogo).

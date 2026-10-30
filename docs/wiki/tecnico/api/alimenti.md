---
tipo: info
aggiornato: 2026-10-30
fonti:
  - raw/compiled/meals/2026-10-30-pasti-preferiti.md
  - raw/compiled/foods/2026-10-25-obiettivo.md
  - raw/compiled/foods/2026-10-25-decisioni-utente.md
  - raw/compiled/foods/2026-10-25-implementazione.md
  - raw/compiled/diary/2026-10-25-decisioni-diario.md
  - raw/compiled/ui-tweaks/2026-10-27-decisioni.md
---

# Alimenti

Modulo `src/modules/alimenti/`. Gli alimenti sono il secondo livello dei dati degli alimenti (vedi [Dati degli alimenti](../../business/dati-alimenti.md#catalogo-e-alimenti)): la copia nostra, che gli utenti correggono e usano nel diario. Sono un **pool condiviso** tra tutti gli utenti; uso e archivio sono invece di ciascuno, in `UsoAlimento`. Nell'MVP tracciano solo kcal e macro.

## Entità `Alimento`

Tabella `alimento`:

| Campo | Tipo | Note |
|---|---|---|
| `id` | uuid | Generato alla creazione |
| `autore` | FK → `utente`, facoltativa | Chi l'ha creato, l'unico che può eliminarlo; `set null` se l'utente sparisce |
| `nome`, `marca` | varchar(255); `marca` facoltativa | |
| `barcode` | varchar(14), facoltativo | Normalizzato come nel catalogo; unico nel pool |
| `fonte` | enum `manuale` \| `off` | `off` se collegato a un prodotto del catalogo |
| `prodottoCatalogo` | FK → `prodotto_catalogo`, facoltativa | `set null` se il prodotto sparisce; serve alla ri-sincronizzazione della fase 3 |
| `unitaBase` | enum `g` \| `ml` | |
| `kcal`, `proteine`, `carboidrati`, `grassi` | numeric(10,3) | Per 100 g o 100 ml, obbligatori |
| `verificato` | boolean | Default `false` |
| `importatoIl` | timestamptz, facoltativo | Valorizzato quando l'alimento nasce dal catalogo |
| `creatoIl` / `aggiornatoIl` | timestamptz | `onCreate` / `onUpdate` |

## Entità `UsoAlimento`

Tabella `uso_alimento`, unica per (`utente_id`, `alimento_id`), indice su `alimento_id`: come un utente usa un alimento del pool. `utente` e `alimento` (FK, cascata), `ultimoUso` (timestamptz facoltativo) e `utilizzi` (int) per "Recenti" e "Più usati", `archiviato` (boolean). Una riga mancante vale "mai usato, non archiviato": si crea al primo uso o alla prima archiviazione.

- `utilizzi` e `ultimoUso` li aggiorna il [diario](./diario.md#entità-voce) quando l'utente aggiunge o elimina una voce.
- Un alimento è **in uso** se una qualsiasi riga, di qualsiasi utente, ha `utilizzi > 0`, o se sta in un [pasto preferito](./pasti-preferiti.md) (salvarlo in un preferito non cambia `utilizzi`).
- Helper in `uso.ts`: `usoDi` (l'uso dell'utente, se c'è), `usoPer` (lo crea se manca), `inUso`. Richiedono `alimento.usi` popolato, e `inUso` anche `alimento.vociPreferite`.

## Entità `Porzione`

Tabella `porzione` (indice su `alimento_id`): `alimento` (FK, cascata), `nome` (varchar(50)), `quantita` (numeric(10,3), nell'unità base dell'alimento), `predefinita`. Al massimo una predefinita e nomi unici per alimento sono garantiti dalla validazione (`nuovoAlimentoSchema`), non da un vincolo: la lista si sostituisce per intero (`orphanRemoval`) e i nuovi record verrebbero inseriti prima di eliminare i vecchi.

## Rotte

Tutte dietro `richiediAutenticazione`. Il DTO mostra l'alimento **come lo vede l'utente corrente**: `archiviato`, `ultimoUso` e `utilizzi` sono i suoi; `eliminabile` è vero se è l'autore e l'alimento non è in uso. Contratti in [Contratti condivisi](../shared/contratti.md).

| Rotta | Risposta |
|---|---|
| `GET /alimenti` | Lista di `Alimento`. Query (`filtriAlimentiSchema`): `q` (nome o marca, senza distinzione di maiuscole; barcode se sono solo cifre), `ordine` (`uso`: utilizzi, poi ultimo uso, poi nome; `recenti`: solo alimenti già usati dall'utente; `nome`), `archiviati` (`true`: solo quelli archiviati dall'utente; default gli altri), `limite` (default 100, max 200) |
| `POST /alimenti` | 201 con l'`Alimento` creato (`nuovoAlimentoSchema`), autore l'utente corrente. Un barcode già nel catalogo collega l'alimento al prodotto (`fonte: off`, `importatoIl`); altrimenti è `manuale` |
| `GET /alimenti/:id` | Un `Alimento` |
| `PATCH /alimenti/:id` | `Alimento` aggiornato (`modificaAlimentoSchema`, campi tutti facoltativi; `porzioni` sostituisce la lista; il barcode non si modifica). Chiunque modifica, per tutti; `archiviato` vale solo per l'utente corrente |
| `DELETE /alimenti/:id` | 204; 403 `ALIMENTO_NON_TUO` se l'utente non è l'autore; 409 `ALIMENTO_IN_USO` se un diario o un pasto preferito lo usa: va archiviato |

Filtro per archiviati e ordinamento si fanno in memoria, dopo la query su `q`, perché dipendono dall'uso dell'utente: il pool sono gli alimenti di una famiglia, poche centinaia al massimo.

Errori propri: 409 `ALIMENTO_ESISTENTE` se esiste già un alimento con lo stesso barcode (`dettagli.id`: quello esistente); 404 `NON_TROVATO` se l'alimento non esiste.

Il DTO ha `avvisi`: per gli alimenti vale solo `KCAL_INCOERENTI`, calcolato con `kcalIncoerenti` di `catalogo/avvisi.ts` (le stesse regole del catalogo).

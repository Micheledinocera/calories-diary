---
tipo: info
aggiornato: 2026-10-25
fonti:
  - raw/compiled/diary/2026-10-25-obiettivo.md
  - raw/compiled/diary/2026-10-25-pasti-del-giorno.md
  - raw/compiled/diary/2026-10-25-decisioni-diario.md
---

# Diario

Modulo `src/modules/diario/`: i pasti di ogni giorno dell'utente e gli alimenti che contengono. Regole funzionali in [Prodotto](../../business/prodotto.md#requisiti-funzionali-dellmvp) e [Dati degli alimenti](../../business/dati-alimenti.md#regole-del-diario).

I **tipi di pasto sono fissi** nel codice (`tipiPasto` in shared): `colazione`, `pranzo`, `cena`, `spuntino`, in quest'ordine. Colazione, pranzo e cena sono i pasti **principali**: al massimo uno per giorno, sempre presenti nella giornata (vuoti finché non si aggiunge niente). Gli spuntini possono essere più di uno e stare in qualsiasi posizione.

## Entità `Pasto`

Tabella `pasto` (indice su `utente_id`, `giorno`):

| Campo | Tipo | Note |
|---|---|---|
| `id` | uuid | Generato alla creazione |
| `utente` | FK → `utente` | Cancellazione a cascata |
| `giorno` | date | Giorno locale dell'utente (`YYYY-MM-DD`): "oggi" lo decide il client |
| `tipo` | enum `colazione` \| `pranzo` \| `cena` \| `spuntino` | Indice unico parziale (`utente_id`, `giorno`, `tipo`) dove `tipo <> 'spuntino'`, creato a mano nella migrazione: MikroORM non lo dichiara |
| `ordine` | int | Posizione nella giornata |
| `creatoIl` / `aggiornatoIl` | timestamptz | `onCreate` / `onUpdate` |

La **prima scrittura di un giorno** salva anche colazione, pranzo e cena mancanti: così ogni pasto ha un id prima che gli spuntini vengano spostati tra loro. Prima di allora `GET` restituisce i principali con `id: null`.

## Entità `Voce`

Tabella `voce` (indici su `pasto_id` e `alimento_id`): `pasto` (FK, cascata), `alimento` (FK **senza** cascata: un alimento con voci non si elimina, si archivia), `quantita` (numeric(10,3), nell'unità base dell'alimento, g o ml), `creatoIl`, `aggiornatoIl`.

Le voci si elencano per `creatoIl`: quelle aggiunte nella stessa richiesta ricevono istanti distanti 1 ms, per tenere l'ordine d'inserimento.

**Niente valori salvati**: kcal e macro di voci, pasti e giorni si calcolano a ogni lettura dai valori attuali dell'alimento (`valore_per_100 × quantità / 100`), anche per i giorni passati.

Aggiungere una voce incrementa `utilizzi` e aggiorna `ultimoUso` dell'[alimento](./alimenti.md); eliminarla (anche con lo spuntino che la contiene) decrementa `utilizzi`, così un alimento non più nel diario torna eliminabile.

## Rotte

Tutte dietro `richiediAutenticazione`, sempre sul diario dell'utente corrente. Ogni scrittura risponde con la **giornata intera** (`Giornata`, totali compresi). Contratti in [Contratti condivisi](../shared/contratti.md).

| Rotta | Risposta |
|---|---|
| `GET /diario?da=&a=` | Riepiloghi per il calendario: i giorni con almeno una voce nell'intervallo (al massimo un anno), con i totali |
| `GET /diario/:giorno` | La `Giornata`: pasti in ordine, voci, totali per pasto e per giorno. Un pasto principale vuoto ha in `suggerite` le voci dello stesso pasto del giorno prima (alimenti archiviati esclusi) |
| `POST /diario/:giorno/pasti` | Body `{ tipo, voci? }`. Per un principale aggiunge le voci al pasto esistente (o lo crea); `spuntino` crea sempre un nuovo spuntino in fondo alla giornata |
| `PUT /diario/:giorno/ordine` | Body `{ pasti: id[] }`: tutti i pasti salvati del giorno nel nuovo ordine. 400 `ORDINE_NON_VALIDO` se ne manca uno o se colazione, pranzo e cena cambiano ordine tra loro |
| `DELETE /diario/pasti/:id` | Elimina uno spuntino con le sue voci; 409 `PASTO_NON_ELIMINABILE` per un pasto principale |
| `POST /diario/pasti/:id/voci` | Body `{ alimento, quantita }`: aggiunge una voce a un pasto salvato (usata per gli spuntini) |
| `PATCH /diario/voci/:id` | Body `{ quantita }` |
| `DELETE /diario/voci/:id` | Elimina la voce |

Errori propri: 404 `NON_TROVATO` per pasti, voci o alimenti inesistenti o di un altro utente; 409 `CONFLITTO` se due prime scritture dello stesso giorno arrivano insieme (indice unico violato): basta riprovare.

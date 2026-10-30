---
tipo: info
aggiornato: 2026-10-30
fonti:
  - raw/compiled/meals/2026-10-30-decisioni-utente.md
  - raw/compiled/meals/2026-10-30-modifiche.md
  - raw/compiled/meals/2026-10-30-decisioni-collegamento.md
  - raw/compiled/diary/2026-10-25-obiettivo.md
  - raw/compiled/diary/2026-10-25-pasti-del-giorno.md
  - raw/compiled/diary/2026-10-25-decisioni-diario.md
  - raw/compiled/ui-tweaks/2026-10-27-decisioni.md
---

# Diario

Modulo `src/modules/diario/`: i pasti di ogni giorno dell'utente e gli alimenti che contengono, presi dal pool condiviso. Regole funzionali in [Prodotto](../../business/prodotto.md#requisiti-funzionali-dellmvp) e [Dati degli alimenti](../../business/dati-alimenti.md#regole-del-diario).

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
| `preferito` | FK → `pasto_preferito`, facoltativa | Il [pasto preferito](./pasti-preferiti.md) a cui il pasto è identico; `set null` se il preferito sparisce |
| `creatoIl` / `aggiornatoIl` | timestamptz | `onCreate` / `onUpdate` |

La **prima scrittura di un giorno** salva anche colazione, pranzo e cena mancanti: così ogni pasto ha un id prima che gli spuntini vengano spostati tra loro. Prima di allora `GET` restituisce i principali con `id: null`.

## Entità `Voce`

Tabella `voce` (indici su `pasto_id` e `alimento_id`): `pasto` (FK, cascata), `alimento` (FK **senza** cascata: un alimento con voci non si elimina, si archivia), `quantita` (numeric(10,3), nell'unità base dell'alimento, g o ml), `creatoIl`, `aggiornatoIl`.

Le voci si elencano per `creatoIl`: quelle aggiunte nella stessa richiesta ricevono istanti distanti 1 ms, per tenere l'ordine d'inserimento.

**Niente valori salvati**: kcal e macro di voci, pasti e giorni si calcolano a ogni lettura dai valori attuali dell'alimento (`valore_per_100 × quantità / 100`), anche per i giorni passati.

Aggiungere una voce incrementa `utilizzi` e aggiorna `ultimoUso` nell'[uso dell'alimento](./alimenti.md#entità-usoalimento) dell'utente (la riga si crea al primo uso); eliminarla (anche con lo spuntino che la contiene) decrementa `utilizzi`, così un alimento non più in nessun diario torna eliminabile dall'autore.

## Rotte

Tutte dietro `richiediAutenticazione`, sempre sul diario dell'utente corrente. Ogni scrittura risponde con la **giornata intera** (`Giornata`, totali compresi). Contratti in [Contratti condivisi](../shared/contratti.md).

| Rotta | Risposta |
|---|---|
| `GET /diario?da=&a=` | Riepiloghi per il calendario: i giorni con almeno una voce nell'intervallo (al massimo un anno), con i totali |
| `GET /diario/:giorno` | La `Giornata`: pasti in ordine, voci, totali per pasto e per giorno. Un pasto principale vuoto ha in `suggerite` le voci dello stesso pasto del giorno prima (alimenti archiviati dall'utente esclusi). Il flag `archiviato` di ogni voce è quello dell'utente |
| `POST /diario/:giorno/pasti` | Body `{ tipo, voci? }`. Per un principale aggiunge le voci al pasto esistente (o lo crea); `spuntino` crea sempre un nuovo spuntino in fondo alla giornata |
| `POST /diario/:giorno/preferiti` | Body `{ preferito, tipo, pasto? }`: riempie con un pasto preferito uno spuntino salvato (`pasto`) o il pasto `tipo`. Vedi [Pasti preferiti nel diario](#pasti-preferiti-nel-diario) |
| `POST /diario/:giorno/copia` | Body `{ da }`: aggiunge al giorno le voci del giorno `da`, senza togliere quelle presenti. Ogni principale va nello stesso pasto, ogni spuntino diventa un nuovo spuntino in fondo. Alimenti archiviati dall'utente esclusi; il collegamento ai preferiti non si copia. 400 `STESSO_GIORNO`, 409 `GIORNO_VUOTO` |
| `PUT /diario/:giorno/ordine` | Body `{ pasti: id[] }`: tutti i pasti salvati del giorno nel nuovo ordine. 400 `ORDINE_NON_VALIDO` se ne manca uno o se colazione, pranzo e cena cambiano ordine tra loro |
| `DELETE /diario/pasti/:id` | Elimina uno spuntino con le sue voci; 409 `PASTO_NON_ELIMINABILE` per un pasto principale |
| `POST /diario/pasti/:id/voci` | Body `{ alimento, quantita }`: aggiunge una voce a un pasto salvato (usata per gli spuntini) |
| `POST /diario/pasti/:id/preferito` | Body `{ nome }`: salva il pasto come pasto preferito e li collega. 409 `PASTO_VUOTO` senza voci |
| `DELETE /diario/pasti/:id/preferito` | Stella spenta: elimina il preferito se è dell'utente, altrimenti toglie solo il collegamento di questo pasto |
| `PATCH /diario/voci/:id` | Body `{ quantita }` |
| `DELETE /diario/voci/:id` | Elimina la voce |

Errori propri: 404 `NON_TROVATO` per pasti o voci inesistenti o di un altro utente, o per alimenti inesistenti; 409 `CONFLITTO` se due prime scritture dello stesso giorno arrivano insieme (indice unico violato): basta riprovare.

## Pasti preferiti nel diario

`Pasto.preferito` vuol dire "questo pasto è identico a quel preferito"; nel DTO è `{ id, nome, mio }` oppure `null`.

- **Si collega** salvando il pasto come preferito, o aggiungendo un preferito a un pasto vuoto. Un preferito si aggiunge solo a un pasto vuoto: altrimenti 409 `PASTO_NON_VUOTO`. Gli alimenti archiviati dall'utente si saltano, come in "Come ieri": in quel caso il pasto non è identico e resta scollegato; se non resta nulla, 409 `PREFERITO_VUOTO`.
- **Si scollega** quando cambiano le voci: aggiunta, rimozione, quantità diversa (`aggiungiVoci`, `modificaVoce`, `eliminaVoce`), oppure quando l'autore cambia le voci del preferito. Salvare la stessa quantità o rinominare il preferito non scollega.

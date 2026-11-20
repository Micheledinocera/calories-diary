---
tipo: info
aggiornato: 2026-11-20
fonti:
  - raw/compiled/tag-system/2026-11-20-implementazione.md
  - raw/compiled/minor-fixes/2026-10-30-ordinamenti.md
  - raw/compiled/meals/2026-10-30-obiettivo.md
  - raw/compiled/meals/2026-10-30-pasti-preferiti.md
  - raw/compiled/meals/2026-10-30-decisioni-utente.md
  - raw/compiled/meals/2026-10-30-modifiche.md
  - raw/compiled/meals/2026-10-30-decisioni-collegamento.md
---

# Pasti preferiti

Modulo `src/modules/pasti-preferiti/`: composizioni di alimenti salvate per riusarle in altri giorni. Tutti gli utenti le vedono e le usano, solo l'autore le cambia. Regole funzionali in [Prodotto](../../business/prodotto.md#requisiti-funzionali-dellmvp). Non vanno confuse con l'entità `Pasto` del [Diario](./diario.md), che è il pasto di un giorno.

## Entità `PastoPreferito`

Tabella `pasto_preferito` (indice su `autore_id`): `id`, `autore` (FK → `utente`, cascata: eliminando un utente spariscono i suoi preferiti, non ciò che gli altri hanno già nel diario), `nome` (varchar(100)), `creatoIl`, `aggiornatoIl`.

Relazione molti-a-molti `tags` con [`Tag`](#entità-tag) (tabella `pasto_preferito_tags`, cascata su entrambe le FK).

## Entità `VocePreferita`

Tabella `voce_preferita` (indici su `pasto_preferito_id` e `alimento_id`): `pastoPreferito` (FK, cascata), `alimento` (FK **senza** cascata), `quantita` (numeric(10,3), nell'unità base dell'alimento), `ordine` (int). La lista si sostituisce per intero a ogni modifica (`orphanRemoval`).

Come nel diario, **niente valori salvati**: kcal e macro si calcolano a ogni lettura dai valori attuali dell'alimento (`src/modules/diario/valori.ts`). Un alimento in un pasto preferito è [in uso](./alimenti.md#entità-usoalimento): non si elimina, così il pasto non perde voci senza avviso.

## Entità `Tag`

Tabella `tag`: `id`, `nome` (varchar(30), unico), già normalizzato da `tagSchema`. Il vocabolario è unico per tutti gli utenti: creando o modificando un pasto, `trovaTag` riusa i tag esistenti e crea i mancanti. Un tag che nessun pasto ha più resta in tabella ma non si elenca.

## Rotte

Tutte dietro `richiediAutenticazione`. Contratti in [Contratti condivisi](../shared/contratti.md). Il DTO ha `autore` (username), `mio`, `voci`, `tags` (in ordine alfabetico) e `totali`; `archiviato` di ogni voce è quello dell'utente corrente.

| Rotta | Risposta |
|---|---|
| `GET /pasti-preferiti` | Pagina di pasti (`{ elementi, totale, pagina }`). Query (`filtriPastiPreferitiSchema`): `q` (nome), `autore` (`miei` o `tutti`, default `tutti`), `ordine` (`nome`, il default; `nomeDesc`; `inseritiRecenti` e `inseritiLontani`, per `creatoIl`), `tag` (ripetibile, `?tag=a&tag=b`: solo i pasti con tutti i tag, filtrati in memoria come ordinamento e paginazione), `pagina` (default 1), `limite` (default 100, max 200) |
| `GET /pasti-preferiti/tag` | `{ nome, pasti }[]`: i tag usati sui pasti di tutti gli utenti, dal più usato, a pari conteggio A-Z. Dichiarata prima di `/:id` |
| `GET /pasti-preferiti/:id` | Un pasto preferito |
| `POST /pasti-preferiti` | 201 con il pasto creato (`nuovoPastoPreferitoSchema`: nome, da 1 a 50 voci, fino a 10 `tags`, default nessuno) |
| `PUT /pasti-preferiti/:id` | Sostituisce nome, voci e tag. Se cambiano le voci, i pasti del diario collegati perdono il collegamento; se cambiano solo nome o tag, restano collegati |
| `DELETE /pasti-preferiti/:id` | 204. I pasti collegati perdono il collegamento (`set null`), il diario non cambia |

Errori propri: 403 `PASTO_PREFERITO_NON_TUO` se chi modifica o elimina non è l'autore; 404 `NON_TROVATO` per pasti o alimenti inesistenti.

Aggiunta al diario e collegamento con i pasti del giorno sono rotte del [Diario](./diario.md#pasti-preferiti-nel-diario).

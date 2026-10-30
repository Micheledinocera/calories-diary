---
tipo: info
aggiornato: 2026-10-30
fonti:
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

## Entità `VocePreferita`

Tabella `voce_preferita` (indici su `pasto_preferito_id` e `alimento_id`): `pastoPreferito` (FK, cascata), `alimento` (FK **senza** cascata), `quantita` (numeric(10,3), nell'unità base dell'alimento), `ordine` (int). La lista si sostituisce per intero a ogni modifica (`orphanRemoval`).

Come nel diario, **niente valori salvati**: kcal e macro si calcolano a ogni lettura dai valori attuali dell'alimento (`src/modules/diario/valori.ts`). Un alimento in un pasto preferito è [in uso](./alimenti.md#entità-usoalimento): non si elimina, così il pasto non perde voci senza avviso.

## Rotte

Tutte dietro `richiediAutenticazione`. Contratti in [Contratti condivisi](../shared/contratti.md). Il DTO ha `autore` (username), `mio`, `voci` e `totali`; `archiviato` di ogni voce è quello dell'utente corrente.

| Rotta | Risposta |
|---|---|
| `GET /pasti-preferiti` | Lista per nome. Query (`filtriPastiPreferitiSchema`): `q` (nome), `autore` (`miei` o `tutti`, default `tutti`) |
| `GET /pasti-preferiti/:id` | Un pasto preferito |
| `POST /pasti-preferiti` | 201 con il pasto creato (`nuovoPastoPreferitoSchema`: nome e da 1 a 50 voci) |
| `PUT /pasti-preferiti/:id` | Sostituisce nome e voci. Se cambiano le voci, i pasti del diario collegati perdono il collegamento; se cambia solo il nome, restano collegati |
| `DELETE /pasti-preferiti/:id` | 204. I pasti collegati perdono il collegamento (`set null`), il diario non cambia |

Errori propri: 403 `PASTO_PREFERITO_NON_TUO` se chi modifica o elimina non è l'autore; 404 `NON_TROVATO` per pasti o alimenti inesistenti.

Aggiunta al diario e collegamento con i pasti del giorno sono rotte del [Diario](./diario.md#pasti-preferiti-nel-diario).

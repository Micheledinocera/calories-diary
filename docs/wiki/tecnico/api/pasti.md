---
tipo: info
aggiornato: 2026-10-25
fonti:
  - raw/compiled/first-develop/2026-10-25-scaffolding.md
---

# Pasti

Modulo `src/modules/pasti/`, primo esempio del pattern a moduli. I pasti suddividono il diario della giornata (vedi [Prodotto](../../business/prodotto.md)).

## Entità `Pasto`

Tabella `pasto`:

| Campo | Tipo | Note |
|---|---|---|
| `id` | uuid | Generato alla creazione |
| `nome` | varchar(50) | Unico |
| `ordine` | int | Ordine di visualizzazione |
| `creatoIl` / `aggiornatoIl` | timestamptz | Impostati da `onCreate` / `onUpdate` |

Valori predefiniti dal seed: Colazione (0), Pranzo (1), Cena (2), Spuntino (3).

## Rotte

| Rotta | Risposta |
|---|---|
| `GET /pasti` | Lista di `Pasto` (schema `listaPastiSchema` in shared), ordinata per `ordine` |
| `GET /pasti/:id` | Un `Pasto`; 400 `VALIDAZIONE` se `id` non è un UUID, 404 `NON_TROVATO` se non esiste |

Il DTO esposto contiene solo `id`, `nome`, `ordine`.

## Domande aperte

- Quando i pasti entreranno nella sync, servirà la cancellazione logica come per le altre tabelle sincronizzate.

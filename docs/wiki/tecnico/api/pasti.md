---
tipo: info
aggiornato: 2026-10-25
fonti:
  - raw/compiled/first-develop/2026-10-25-scaffolding.md
  - raw/compiled/auth/2026-10-25-implementazione.md
---

# Pasti

Modulo `src/modules/pasti/`, primo esempio del pattern a moduli. I pasti suddividono il diario della giornata (vedi [Prodotto](../../business/prodotto.md)). Sono **per utente** (vedi [Autenticazione multiutente](../../progetto/decisione-autenticazione.md)).

## Entità `Pasto`

Tabella `pasto`:

| Campo | Tipo | Note |
|---|---|---|
| `id` | uuid | Generato alla creazione |
| `utente` | FK → `utente` | Cancellazione a cascata |
| `nome` | varchar(50) | Unico per utente (`utente_id`, `nome`) |
| `ordine` | int | Ordine di visualizzazione |
| `creatoIl` / `aggiornatoIl` | timestamptz | Impostati da `onCreate` / `onUpdate` |

Pasti predefiniti (`pastiPredefiniti` in `pasti.service.ts`): Colazione (0), Pranzo (1), Cena (2), Spuntino (3). `creaPastiPredefiniti(em, utente)` aggiunge quelli mancanti; lo usano la creazione dell'utente e il seed.

## Rotte

Tutte dietro `richiediAutenticazione` (401 `NON_AUTENTICATO` senza token valido), sempre sui pasti dell'utente corrente:

| Rotta | Risposta |
|---|---|
| `GET /pasti` | Lista di `Pasto` (schema `listaPastiSchema` in shared), ordinata per `ordine` |
| `GET /pasti/:id` | Un `Pasto`; 400 `VALIDAZIONE` se `id` non è un UUID, 404 `NON_TROVATO` se non esiste o è di un altro utente (non si rivela che esiste) |

Il DTO esposto contiene solo `id`, `nome`, `ordine`.

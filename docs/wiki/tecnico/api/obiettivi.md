---
tipo: info
aggiornato: 2026-10-25
fonti:
  - raw/compiled/diary/2026-10-25-decisioni-diario.md
---

# Obiettivi

Modulo `src/modules/obiettivi/` (solo router): fabbisogno calorico e ripartizione dei macro dell'utente. Regole in [Prodotto](../../business/prodotto.md#requisiti-funzionali-dellmvp).

Un **valore unico per utente**, senza storico: vale per tutti i giorni, anche quelli passati. Sta in colonne dell'entità [`Utente`](./auth.md#entità-utente):

| Campo | Tipo | Note |
|---|---|---|
| `fabbisogno` | int, facoltativo | kcal al giorno, inserite a mano; `null` finché non impostato |
| `quotaCarboidrati`, `quotaGrassi`, `quotaProteine` | int | Percentuali delle kcal, default 50/30/20; vincolo `utente_quote_check`: somma 100 |

## Rotte

Dietro `richiediAutenticazione`:

| Rotta | Risposta |
|---|---|
| `GET /obiettivi` | `Obiettivi`: `{ fabbisogno, ripartizione: { carboidrati, grassi, proteine } }` |
| `PUT /obiettivi` | Body `Obiettivi` (fabbisogno da 500 a 10.000 o `null`, quote intere con somma 100); risponde con gli obiettivi salvati |

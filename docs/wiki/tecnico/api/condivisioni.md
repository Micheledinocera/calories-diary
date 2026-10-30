---
tipo: info
aggiornato: 2026-10-30
fonti:
  - raw/compiled/export-rework/2026-10-30-decisioni-utente.md
---

# Condivisioni

Modulo `src/modules/condivisioni/`: link pubblici a una copia di alcuni giorni del diario. Regole e motivi in [Link pubblici al diario](../../progetto/decisione-link-pubblici.md).

## Entità `Condivisione`

Tabella `condivisione` (indice su `utente_id`):

| Campo | Tipo | Note |
|---|---|---|
| `id` | uuid | Generato alla creazione |
| `utente` | FK → `utente` | Cancellazione a cascata |
| `token` | varchar(32), unico | 24 byte casuali in base64url. In chiaro: il proprietario ricopia il link dall'elenco |
| `da` / `a` | date | Giorni condivisi, al massimo `MAX_GIORNI_EXPORT` (7) |
| `scadeIl` | timestamptz, nullable | Null: non scade |
| `dati` | jsonb | `DatiCondivisi`: la copia di giorni e obiettivi |
| `creatoIl` | timestamptz | `onCreate` |

La revoca cancella la riga. Le scadute si cancellano quando il proprietario chiede l'elenco.

## Rotte

| Rotta | Autenticazione | Cosa fa |
|---|---|---|
| `GET /condivisioni` | Sì | Link attivi dell'utente, dal più recente |
| `POST /condivisioni` | Sì | Crea il link: `nuovaCondivisioneSchema` (`da`, `a`, `durata`, `mostraFabbisogno`), risponde 201 |
| `DELETE /condivisioni/:id` | Sì | Revoca, 204. Il link di un altro utente è `NON_TROVATO` |
| `GET /pubblico/:token` | No | `VistaCondivisa`, con `Cache-Control: no-store` perché la revoca abbia effetto subito. Scaduto, revocato e inesistente rispondono allo stesso modo: 404 `NON_TROVATO` |

## Creazione della copia

`crea` legge ogni giorno con `giornata` del [Diario](./diario.md) e lo riduce con `versoGiornoCondiviso`: solo i pasti con voci, senza id, stato di archivio e suggerimenti. Gli obiettivi entrano solo con `mostraFabbisogno` e con un fabbisogno impostato; altrimenti `obiettivi` è `null`.

## Domande aperte

- `pino-http` scrive negli access log l'URL con il token, oltre agli header `Authorization` e `Cookie` di tutte le rotte: il logger non ha `redact`.

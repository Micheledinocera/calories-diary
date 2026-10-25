---
tipo: info
aggiornato: 2026-10-25
fonti:
  - raw/compiled/first-develop/2026-10-25-ruolo-monorepo.md
  - raw/compiled/first-develop/2026-10-25-scaffolding.md
  - raw/compiled/auth/2026-10-25-implementazione.md
---

# Contratti condivisi

`packages/shared` (`@calories-diary/shared`): schemi zod e tipi dei DTO dell'API, usati da back-end e front-end. Contiene **solo contratti**, non logica di dominio (vedi [Architettura](../../progetto/architettura.md#ruolo-del-monorepo)).

## Schemi

| File | Schemi / tipi | Uso |
|---|---|---|
| `src/health.ts` | `healthSchema`, `Health` | Risposta di `GET /health` |
| `src/pasti.ts` | `pastoSchema`, `listaPastiSchema`, `Pasto` | DTO dei pasti |
| `src/errori.ts` | `erroreApiSchema`, `ErroreApi` | Corpo di ogni risposta di errore |
| `src/auth.ts` | `credenzialiSchema`, `utenteSchema`, `sessioneSchema` e tipi | Body del login (email normalizzata: trim e minuscole), utente corrente, risposta di login e rinnovo |

Convenzione: per ogni contratto uno schema `xSchema` e il tipo `X = z.infer<typeof xSchema>`, esportati da `src/index.ts`.

## Build

Il pacchetto si compila in `dist/` (`exports` punta al JS compilato): lo fa il `postinstall` della root, e `pnpm dev` lo tiene in watch. API e web importano il JS compilato, senza alias né condizioni custom.

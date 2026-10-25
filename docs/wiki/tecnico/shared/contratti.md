---
tipo: info
aggiornato: 2026-10-25
fonti:
  - raw/compiled/first-develop/2026-10-25-ruolo-monorepo.md
  - raw/compiled/first-develop/2026-10-25-scaffolding.md
  - raw/compiled/auth/2026-10-25-implementazione.md
  - raw/compiled/food-catalog/2026-10-25-open-food-facts-e-perimetro.md
  - raw/compiled/foods/2026-10-25-note-ui-ux.md
  - raw/compiled/foods/2026-10-25-implementazione.md
  - raw/compiled/diary/2026-10-25-decisioni-diario.md
---

# Contratti condivisi

`packages/shared` (`@calories-diary/shared`): schemi zod e tipi dei DTO dell'API, usati da back-end e front-end. Contiene **solo contratti**, non logica di dominio (vedi [Architettura](../../progetto/architettura.md#ruolo-del-monorepo)).

## Schemi

| File | Schemi / tipi | Uso |
|---|---|---|
| `src/health.ts` | `healthSchema`, `Health` | Risposta di `GET /health` |
| `src/diario.ts` | `tipiPasto`, `tipiPastoPrincipali`, `tipoPastoSchema`, `giornoSchema`, `valoriSchema`, `voceSchema`, `pastoSchema`, `giornataSchema`, `intervalloGiorniSchema`, `riepilogoGiornoSchema`, `nuovaVoceSchema`, `nuovoPastoSchema`, `modificaVoceSchema`, `ordinePastiSchema` e tipi | DTO e body di `/diario` (vedi [Diario](../api/diario.md)); i tipi di pasto fissi stanno qui |
| `src/obiettivi.ts` | `ripartizioneMacroSchema`, `ripartizionePredefinita` (50/30/20), `obiettiviSchema` e tipi | Body e risposta di `/obiettivi` (vedi [Obiettivi](../api/obiettivi.md)) |
| `src/errori.ts` | `erroreApiSchema`, `ErroreApi` | Corpo di ogni risposta di errore |
| `src/auth.ts` | `credenzialiSchema`, `utenteSchema`, `sessioneSchema` e tipi | Body del login (email normalizzata: trim e minuscole), utente corrente, risposta di login e rinnovo |
| `src/catalogo.ts` | `valoriPer100Schema`, `unitaBaseSchema`, `prodottoCatalogoSchema`, `avvisoCatalogoSchema`, `lookupBarcodeSchema` e tipi | Risposta di `GET /catalogo/barcode/:codice` (vedi [Catalogo](../api/catalogo.md)) |
| `src/alimenti.ts` | `valoriAlimentoSchema`, `porzioneSchema`, `alimentoSchema`, `listaAlimentiSchema`, `nuovoAlimentoSchema`, `modificaAlimentoSchema`, `ordineAlimentiSchema`, `filtriAlimentiSchema` e tipi | DTO e body di `/alimenti` (vedi [Alimenti](../api/alimenti.md)). I body normalizzano i testi (trim, vuoto → `null`) e applicano i default; `NuovoAlimento` e `ModificaAlimento` sono i tipi di input (`z.input`), `FiltriAlimenti` i filtri come li manda il client |

Convenzione: per ogni contratto uno schema `xSchema` e il tipo `X = z.infer<typeof xSchema>`, esportati da `src/index.ts`. Il front-end prende i tipi sempre da qui; tipi propri solo se servono alla UI (es. lo stato di un form).

## Build

Il pacchetto si compila in `dist/` (`exports` punta al JS compilato): lo fa il `postinstall` della root, e `pnpm dev` lo tiene in watch. API e web importano il JS compilato, senza alias né condizioni custom.

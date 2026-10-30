---
tipo: info
aggiornato: 2026-10-30
fonti:
  - raw/compiled/meals/2026-10-30-modifiche.md
  - raw/compiled/export-rework/2026-10-30-decisioni-utente.md
  - raw/compiled/first-develop/2026-10-25-ruolo-monorepo.md
  - raw/compiled/first-develop/2026-10-25-scaffolding.md
  - raw/compiled/auth/2026-10-25-implementazione.md
  - raw/compiled/food-catalog/2026-10-25-open-food-facts-e-perimetro.md
  - raw/compiled/foods/2026-10-25-note-ui-ux.md
  - raw/compiled/foods/2026-10-25-implementazione.md
  - raw/compiled/diary/2026-10-25-decisioni-diario.md
  - raw/compiled/user-login/2026-10-27-implementazione.md
---

# Contratti condivisi

`packages/shared` (`@calories-diary/shared`): schemi zod e tipi dei DTO dell'API, usati da back-end e front-end. Contiene **solo contratti**, non logica di dominio (vedi [Architettura](../../progetto/architettura.md#ruolo-del-monorepo)).

## Schemi

| File | Schemi / tipi | Uso |
|---|---|---|
| `src/health.ts` | `healthSchema`, `Health` | Risposta di `GET /health` |
| `src/diario.ts` | `tipiPasto`, `tipiPastoPrincipali`, `tipoPastoSchema`, `giornoSchema`, `valoriSchema`, `voceSchema`, `pastoSchema`, `giornataSchema`, `intervalloGiorniSchema`, `riepilogoGiornoSchema`, `nuovaVoceSchema`, `nuovoPastoSchema`, `modificaVoceSchema`, `ordinePastiSchema` e tipi | DTO e body di `/diario` (vedi [Diario](../api/diario.md)); i tipi di pasto fissi stanno qui |
| `src/obiettivi.ts` | `ripartizioneMacroSchema`, `ripartizionePredefinita` (50/30/20), `obiettiviSchema` e tipi | Body e risposta di `/obiettivi` (vedi [Obiettivi](../api/obiettivi.md)) |
| `src/condivisioni.ts` | `MAX_GIORNI_EXPORT` (7), `durateCondivisione`, `nuovaCondivisioneSchema`, `condivisioneSchema`, `listaCondivisioniSchema`, `giornoCondivisoSchema`, `datiCondivisiSchema`, `vistaCondivisaSchema` e tipi | Body e risposte di `/condivisioni` e `/pubblico/:token` (vedi [Condivisioni](../api/condivisioni.md)); il limite di giorni vale anche per l'export |
| `src/pasti-preferiti.ts` | `pastoPreferitoSchema`, `listaPastiPreferitiSchema`, `nuovoPastoPreferitoSchema`, `autorePastiPreferitiSchema`, `filtriPastiPreferitiSchema`, `nuovoPreferitoDaPastoSchema`, `aggiuntaPreferitoSchema`, `copiaGiornoSchema` e tipi | DTO e body di `/pasti-preferiti` (vedi [Pasti preferiti](../api/pasti-preferiti.md)) e delle rotte del diario che li usano, più la copia di una giornata |
| `src/errori.ts` | `erroreApiSchema`, `ErroreApi` | Corpo di ogni risposta di errore |
| `src/auth.ts` | `LUNGHEZZA_MINIMA_PASSWORD` (12), `usernameSchema`, `nuovaPasswordSchema`, `credenzialiSchema`, `ruoli`, `ruoloSchema`, `utenteSchema`, `sessioneSchema`, `modificaProfiloSchema`, `cambioPasswordSchema` e tipi | Username di un utente nuovo o rinominato (trim, 3–32 caratteri, maiuscole conservate), password nuova, body del login (username con trim, qualsiasi lunghezza per gli utenti migrati), utente (`id`, `username`, `ruolo`), risposta di login e rinnovo, body di `PATCH /auth/io` e `PUT /auth/password` |
| `src/utenti.ts` | `listaUtentiSchema`, `nuovoUtenteSchema`, `modificaUtenteSchema` e tipi | Risposta e body di `/utenti` (admin); la modifica vuole almeno username o password |
| `src/catalogo.ts` | `valoriPer100Schema`, `unitaBaseSchema`, `prodottoCatalogoSchema`, `avvisoCatalogoSchema`, `lookupBarcodeSchema` e tipi | Risposta di `GET /catalogo/barcode/:codice` (vedi [Catalogo](../api/catalogo.md)) |
| `src/alimenti.ts` | `valoriAlimentoSchema`, `porzioneSchema`, `alimentoSchema`, `listaAlimentiSchema`, `nuovoAlimentoSchema`, `modificaAlimentoSchema`, `ordineAlimentiSchema`, `filtriAlimentiSchema` e tipi | DTO e body di `/alimenti` (vedi [Alimenti](../api/alimenti.md)). I body normalizzano i testi (trim, vuoto → `null`) e applicano i default; `NuovoAlimento` e `ModificaAlimento` sono i tipi di input (`z.input`), `FiltriAlimenti` i filtri come li manda il client |

Convenzione: per ogni contratto uno schema `xSchema` e il tipo `X = z.infer<typeof xSchema>`, esportati da `src/index.ts`. Il front-end prende i tipi sempre da qui; tipi propri solo se servono alla UI (es. lo stato di un form).

## Build

Il pacchetto si compila in `dist/` (`exports` punta al JS compilato): lo fa il `postinstall` della root, e `pnpm dev` lo tiene in watch. API e web importano il JS compilato, senza alias né condizioni custom.

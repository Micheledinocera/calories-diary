---
tipo: decisione
stato: presa
aggiornato: 2026-10-27
fonti:
  - raw/compiled/first-develop/2026-10-25-decisioni-e-piano.md
  - raw/compiled/auth/2026-10-25-obiettivo.md
  - raw/compiled/auth/2026-10-25-decisioni-utente.md
  - raw/compiled/auth/2026-10-25-implementazione.md
  - raw/compiled/diary/2026-10-25-pasti-del-giorno.md
  - raw/compiled/ui-tweaks/2026-10-27-decisioni.md
  - raw/compiled/ui-tweaks/2026-10-27-da-fare-dopo.md
  - raw/compiled/user-login/2026-10-27-decisioni.md
---

# Autenticazione multiutente

## Decisione

- **Più utenti**, ognuno con i propri dati: oggi solo il proprietario, in futuro qualche amico. Tabella `utente` con username, ruolo e hash della password.
- **Nessuna registrazione pubblica**: gli utenti li crea un admin, dall'app o da CLI (vedi [Gestione delle utenze in app](./decisione-gestione-utenze.md)).
- Login con **username e password**; restituisce un token (JWT) che il client invia come `Authorization: Bearer`.
- Il token dura **una settimana**, con **rinnovo scorrevole**: quando l'app parla con l'API riceve un token nuovo di 7 giorni. Chi resta offline più di 7 giorni rifà il login alla riconnessione; i dati locali restano.
- Rate limit sul login con Redis.
- I **dati del diario sono per utente**: i pasti di ogni giorno e le loro voci. Gli **alimenti** invece sono un pool condiviso, con uso e archivio per utente (vedi [Dati degli alimenti](../business/dati-alimenti.md#catalogo-e-alimenti)). I **tipi di pasto** (Colazione, Pranzo, Cena, Spuntino) sono invece fissi nel codice, uguali per tutti.

Dettagli di implementazione: [Autenticazione e utenti](../tecnico/api/auth.md) (API) e [App web](../tecnico/web/app.md#sessione-e-login) (PWA).

## Perché

- L'API è esposta pubblicamente e contiene dati personali: va protetta.
- L'app potrebbe essere usata anche da qualche amico: prevedere più utenti subito costa poco, aggiungerli dopo vorrebbe dire migrare ogni tabella.
- Il front-end (Vercel) e l'API (Render) sono su domini diversi: i cookie sarebbero cross-site, un header `Authorization` evita il problema.
- Con pochi utenti noti la registrazione aperta servirebbe solo agli sconosciuti: basta un admin.
- Una settimana con rinnovo scorrevole: chi usa l'app almeno una volta a settimana non rifà mai il login, e resta comunque un margine ampio per l'uso offline.
- Diario per utente: ogni pasto ha un solo proprietario. Gli alimenti sono condivisi perché gli utenti mangiano spesso le stesse cose e inserirli una volta sola basta a tutti. I tipi di pasto non si configurano nell'MVP, quindi non serve una tabella.

## Alternative scartate

- **Utente singolo con le credenziali nelle variabili d'ambiente** (la prima versione di questa decisione): niente tabella utenti, ma nessuna possibilità di aggiungere altre persone.
- **Registrazione aperta o con codice d'invito**: più lavoro (pagine, abusi) senza un bisogno reale oggi.
- **Token a scadenza fissa**: costringerebbe al login ogni settimana anche chi usa l'app tutti i giorni.
- **Tipi di pasto per utente, in tabella** (la prima implementazione): nessun vantaggio finché non c'è una schermata per configurarli.

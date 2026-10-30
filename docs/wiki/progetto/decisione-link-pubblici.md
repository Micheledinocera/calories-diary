---
tipo: decisione
stato: presa
aggiornato: 2026-10-30
fonti:
  - raw/compiled/export-rework/2026-10-30-obiettivo.md
  - raw/compiled/export-rework/2026-10-30-condividi.md
  - raw/compiled/export-rework/2026-10-30-decisioni-utente.md
  - raw/compiled/export-rework/2026-10-30-vista-per-giorno.md
---

# Link pubblici al diario

## Decisione

- Il tasto **Condividi** dell'export crea un **link pubblico**: chi lo riceve vede i giorni scelti senza login, un giorno per volta.
- Chi condivide sceglie la **durata**: 1 giorno, 1 settimana, 1 mese (30 giorni) o per sempre.
- Il link punta a una **copia fissa**, salvata alla creazione: le modifiche successive al diario e agli obiettivi non la cambiano.
- La copia contiene il **dettaglio completo**: totali del giorno e, per ogni pasto, alimenti con quantità, kcal e macro. Niente id interni, stato di archivio o suggerimenti.
- L'opzione **Mostra il fabbisogno**, spenta di default, decide se si vedono pallini colorati e confronto con fabbisogno e macro. Se è spenta, obiettivi e fabbisogno non entrano nella copia.
- La pagina non mostra **di chi** è il diario.
- I link attivi sono elencati nella pagina Esporta, dove si possono ricopiare e **revocare**. Revocarli cancella la copia, e un link scaduto o revocato non si distingue da uno inesistente.

Dettagli di implementazione: [Condivisioni](../tecnico/api/condivisioni.md) (API) e [App web](../tecnico/web/app.md#pagine) (PWA).

## Perché

- Il vecchio tasto inviava il file markdown e non era chiaro a cosa servisse: una pagina con un link è più semplice da mandare e da leggere.
- Copia fissa: si condivide esattamente ciò che si è visto, e correzioni future non finiscono in una pagina pubblica senza essere state rivedute.
- Fabbisogno fuori dalla copia, non solo nascosto: togliere i colori non basterebbe, perché il superamento si dedurrebbe dai numeri.
- Revoca: senza, un link "per sempre" non si potrebbe più togliere.
- Un giorno per volta, con la settimana come selettore: la pagina resta corta e dà comunque il colpo d'occhio dei pallini.
- Il token è un segreto lungo e casuale, salvato in chiaro: il proprietario deve poter ricopiare il link dall'elenco.

## Alternative scartate

- **Dati aggiornati a ogni visita**: il link si correggerebbe da solo, ma esporrebbe modifiche future non rivedute.
- **Solo i totali**: più riservato, ma meno utile a chi riceve il link.
- **Nascondere solo i pallini**: fabbisogno e obiettivi resterebbero visibili accanto alle kcal.
- **Nessuna revoca**: più semplice, ma senza modo di ritirare un link.
- **Calendario mensile come selettore**: con al massimo sette giorni attivi sarebbe quasi tutto vuoto.

## Domande aperte

- **Import per altri utenti**: l'idea è rimandata, non ancora definita.
- **Primo avvio su Vercel**: `/condivisi/<token>` non è un file statico, quindi il sito risponde 404 con la pagina dell'app. Sul sito attuale il corpo è quello dell'app, ma un vero link va provato dopo la release. Le anteprime automatiche delle app di messaggistica potrebbero non funzionare.

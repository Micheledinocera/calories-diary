# Decisione — niente sync, cache offline in sola lettura

Decisione dell'utente (2026-10-25): si abbandona la sync local-first. Va bene una **cache locale in sola lettura** per l'offline.

Cosa cambia rispetto alla decisione [Local-first](../../wiki/progetto/decisione-local-first.md):

- Il **server è l'unica fonte di verità**: la PWA legge e scrive tramite l'API.
- Offline la PWA mostra i dati già scaricati (cache locale), ma **non permette di registrare** né modificare.
- Cade quindi il protocollo di sync: niente push/pull incrementale, niente gestione dei conflitti. Era l'alternativa scartata ("Server come unica fonte di verità, con cache offline in sola lettura"), che ora diventa la scelta.
- Resta valido il resto della decisione: il front-end parla solo con la nostra API, i provider esterni stanno dietro un adapter nel back-end.

Pagine della wiki da rivedere all'ingest:

- `progetto/decisione-local-first.md`: decisione superata o da riscrivere.
- `business/prodotto.md`: requisito "Offline-first: diario e alimenti locali funzionano senza rete"; "sync" nell'elenco dell'MVP e nell'ordine delle feature.
- `progetto/architettura.md`: uso quotidiano con lettura/scrittura sullo store locale e sync push/pull.
- `tecnico/web/app.md` e `tecnico/api/pasti.md`: note che rimandano alla feature `sync` (store locale, cancellazione logica).
- `progetto/decisione-autenticazione.md`: il margine di 7 giorni era motivato anche dall'uso offline.

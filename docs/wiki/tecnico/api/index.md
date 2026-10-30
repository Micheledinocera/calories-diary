# API

`apps/api`: back-end Express + MikroORM + Redis.

- [Struttura](./struttura.md): cartelle, pattern dei moduli, middleware, formato degli errori, health check, Redis, Docker.
- [Database](./database.md): configurazione ORM, migrazioni, seed, database dei test.
- [Autenticazione e utenti](./auth.md): entità `Utente`, CLI, password, token con versione, rotte `/auth` e `/utenti` (admin), eliminazione, middleware e rate limit.
- [Diario](./diario.md): entità `Pasto` (pasti di un giorno dell'utente) e `Voce`, rotte `/diario`, calcolo dei totali.
- [Pasti preferiti](./pasti-preferiti.md): entità `PastoPreferito` e `VocePreferita` (composizioni riutilizzabili, condivise tra utenti), rotte `/pasti-preferiti`.
- [Condivisioni](./condivisioni.md): entità `Condivisione` (copia di alcuni giorni), rotte `/condivisioni` e `/pubblico/:token`.
- [Obiettivi](./obiettivi.md): fabbisogno calorico e ripartizione dei macro, rotte `/obiettivi`.
- [Alimenti](./alimenti.md): entità `Alimento` (pool condiviso), `UsoAlimento` (uso e archivio per utente) e `Porzione`, rotte `/alimenti`, collegamento al catalogo.
- [Catalogo e lookup per barcode](./catalogo.md): catalogo condiviso `ProdottoCatalogo`, adapter Open Food Facts, rotta `/catalogo/barcode/:codice`, limite verso il provider.

# API

`apps/api`: back-end Express + MikroORM + Redis.

- [Struttura](./struttura.md): cartelle, pattern dei moduli, middleware, formato degli errori, health check, Redis, Docker.
- [Database](./database.md): configurazione ORM, migrazioni, seed, database dei test.
- [Autenticazione e utenti](./auth.md): entità `Utente`, CLI `utente:crea`, password, token, rotte `/auth`, middleware e rate limit.
- [Pasti](./pasti.md): entità `Pasto` (per utente) e rotte `/pasti`.
- [Catalogo e lookup per barcode](./catalogo.md): catalogo condiviso `ProdottoCatalogo`, adapter Open Food Facts, rotta `/catalogo/barcode/:codice`, limite verso il provider.

# Obiettivo — deploy

Mettere online l'app su hosting gratuito come previsto nel wiki ([Sviluppo, CI e ambienti](../../wiki/progetto/sviluppo-e-ambienti.md)): web su Vercel, API su Render (immagine da GHCR), PostgreSQL su Neon, Redis su Upstash.

- Pipeline di deploy dell'API: build e push su GHCR, migrazioni su Neon con la connessione diretta, deploy hook di Render, smoke test su `/health`.
- Staging predisposto nei workflow ma spento.
- Backup del database (vedi [Prodotto](../../wiki/business/prodotto.md)).
- Rispondere alle domande aperte: accesso di Render al pacchetto GHCR, come passargli l'immagine appena pubblicata, quote gratuite aggiornate, MCP ufficiali di Neon, Render, Vercel e Upstash.
- Preparare una checklist dei passaggi manuali da fare sui servizi.

Poi la release `v0.1.0`.

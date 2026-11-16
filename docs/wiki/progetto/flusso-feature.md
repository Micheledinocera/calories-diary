---
tipo: info
aggiornato: 2026-11-16
fonti:
  - raw/compiled/new-wiki-skills/2026-11-16-obiettivo.md
---

# Flusso di una feature e del wiki

Ogni task è una feature git-flow, gestita con le skill in `.claude/skills/`. Convenzioni di rami, commit e merge: [CONTRIBUTING.md](../../../CONTRIBUTING.md); regole del wiki e dei raw: [docs/CLAUDE.md](../../CLAUDE.md).

## Ciclo

1. **`/start <nome>`**: apre `feature/<nome>` da `develop` aggiornato, con la prima nota raw (`docs/raw/<nome>/…-obiettivo.md`). Le note del task si aggiungono lì.
2. **`/close`**: committa le note raw rimaste, esegue i check in locale (saltati per `study-` e `ingest-`, che non toccano codice), apre la PR verso `develop` e la **unisce subito con squash**, senza attendere una revisione; poi cancella il ramo, locale e remoto.
3. **Ingest dopo il merge**: sempre `/close` apre `feature/ingest-<nome>` dal `develop` aggiornato ed esegue `/ingest <nome>`, che legge le note raw e lo squash commit della PR unita, aggiorna il wiki e sposta le note in `docs/raw/compiled/<nome>/`. Questa feature contiene solo il commit `docs(wiki): aggiorna da <nome>` e si chiude allo stesso modo, con PR e squash automatici. Se non c'è niente da documentare non nasce nessun ramo di ingest.

Così la PR di una feature contiene solo il suo lavoro e le sue note, quella di ingest solo il wiki.

## Regole collegate

- Il prefisso `ingest-` è riservato: `/start` lo rifiuta. Un ingest rimasto a metà, o di una feature unita senza `/close`, si riprende con `/ingest <nome>` da `develop` (o dal ramo di ingest) e poi `/close`.
- Il lint del wiki (`/lint-wiki`) gira dentro `/ingest`, su tutto il wiki: copre anche le modifiche al wiki fatte a mano in una feature.
- Se lo squash merge fallisce (conflitti con `develop`), `/close` si ferma lasciando la PR aperta.
- Release e hotfix verso `main` seguono `/release`, con merge normale: vedi [Deploy](./deploy.md).

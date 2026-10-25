# Calories Diary

PWA personale per il tracciamento giornaliero di calorie e macronutrienti: diario per pasti, alimenti locali consolidati nel tempo, lookup dei prodotti per codice a barre (via back-end, con Open Food Facts come primo provider).

> Progetto in fase di scaffolding. Avvio locale e script arriveranno con la feature `first-develop`.

## Stack

Nuxt (Vue 3, PWA) · Node.js + Express · MikroORM + PostgreSQL · Redis · pnpm workspaces · Docker.

## Documentazione

- [AGENTS.md](AGENTS.md): istruzioni per gli agenti AI.
- [CONTRIBUTING.md](CONTRIBUTING.md): rami, commit, check, PR.
- [docs/wiki/index.md](docs/wiki/index.md): wiki di progetto (regole in [docs/CLAUDE.md](docs/CLAUDE.md)).

## Dati

Parte dei dati sugli alimenti proviene da [Open Food Facts](https://world.openfoodfacts.org), disponibile con licenza [ODbL](https://opendatacommons.org/licenses/odbl/1-0/).

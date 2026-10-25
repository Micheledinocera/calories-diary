---
tipo: info
aggiornato: 2026-10-25
fonti:
  - raw/compiled/first-develop/setup-progetto.md
  - raw/compiled/first-develop/2026-10-25-scaffolding.md
  - raw/compiled/remove-dependabot/2026-10-25-versioni-fissate.md
---

# Stack e strumenti

Regola: si usano le **ultime versioni stabili compatibili tra loro**, verificate sulla documentazione ufficiale e fissate in modo esatto in `package.json` e `pnpm-lock.yaml`.

| Livello | Tecnologia |
|---|---|
| Front-end | Nuxt 4 (SPA, `ssr: false`), Nuxt UI 4, Tailwind 4, @vite-pwa/nuxt |
| Back-end | Node.js 24 LTS, Express 5, TypeScript |
| ORM e DB | MikroORM 7 (driver PostgreSQL), PostgreSQL 18 |
| Cache | Redis 8, client `ioredis` |
| Validazione | zod 4, schemi condivisi in `packages/shared` |
| Log | pino, pino-http |
| Test | Vitest, Supertest |
| Qualità | ESLint (flat config; `@nuxt/eslint` per il web), Prettier, `tsc --noEmit` / `nuxt typecheck` |
| Commit | Conventional Commits con commitlint, husky, lint-staged |
| Monorepo | pnpm 12 workspaces, Node fissato in `.nvmrc` ed `engines` |
| Dipendenze | Versioni esatte, aggiornate a mano con check periodici (niente Dependabot) |

## Scelte e vincoli

- **Versioni fissate, niente Dependabot**: le dipendenze sono molto interconnesse (Nuxt e moduli PWA, TypeScript con typescript-eslint e vue-tsc, MikroORM) e gli aggiornamenti automatici uno alla volta rompevano gli allineamenti. Tutti i `package.json` usano versioni esatte, senza `^` né `~`, e `savePrefix: ""` in `pnpm-workspace.yaml` fa salvare versioni esatte anche a `pnpm add`. Ogni tanto si controllano le versioni nuove (`pnpm outdated -r`) e si decide cosa portare dentro, a gruppi coerenti, in una feature dedicata con i check verdi.
- **TypeScript 6.0, non 7**: TypeScript 7 (port nativo) non espone ancora l'API JS usata da typescript-eslint e vue-tsc.
- **`@types/node` sulla 24.x**: segue il runtime (Node 24 in `.nvmrc`, `engines` e immagine Docker), non l'ultima versione dei tipi.
- **`vite-plugin-pwa` 1.x e `@vite-pwa/assets-generator` 1.x**: `@vite-pwa/nuxt` 1.1.1 dipende da `vite-plugin-pwa ^1.2.0` e ha come peer `assets-generator ^1.0.0`. Le 2.x si portano dentro solo quando `@vite-pwa/nuxt` le supporta, altrimenti si installano due copie del plugin.
- **MikroORM 7** con `defineEntity` (niente decorator né reflect-metadata).
- **pnpm 12** blocca gli script di install delle dipendenze: quelli ammessi sono in `allowBuilds` di `pnpm-workspace.yaml`.
- **Prettier** non formatta `.claude/` e `docs/`.

## Server MCP

| MCP | Dove | Uso |
|---|---|---|
| `Nuxt` | Livello utente | Documentazione e moduli Nuxt |
| `nuxt-ui` | `.mcp.json` | Componenti Nuxt UI |
| `context7` | `.mcp.json` | Documentazione aggiornata delle librerie (MikroORM, Express, zod, Dexie, Vitest…) |
| `playwright` | `.mcp.json` | Provare la PWA nel browser |

Da valutare con la feature `deploy`: gli MCP ufficiali di Neon, Render, Vercel e Upstash.

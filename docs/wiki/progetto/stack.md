---
tipo: info
aggiornato: 2026-10-25
fonti:
  - raw/compiled/first-develop/setup-progetto.md
  - raw/compiled/first-develop/2026-10-25-scaffolding.md
---

# Stack e strumenti

Regola: si usano le **ultime versioni stabili**, verificate sulla documentazione ufficiale. Versioni esatte in `package.json` e `pnpm-lock.yaml`.

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
| Dipendenze | Dependabot (npm, GitHub Actions, Docker) |

## Scelte e vincoli

- **TypeScript 6.0, non 7**: TypeScript 7 (port nativo) non espone ancora l'API JS usata da typescript-eslint e vue-tsc. Dependabot ignora i major di TypeScript finché non sono supportati.
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

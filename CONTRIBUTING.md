# Come contribuire

Convenzioni del repo, valide per le persone e per gli agenti AI (anche per le skill `/start`, `/ingest`, `/close`).

## Rami (git-flow)

- `main`: solo release, taggate `v<versione>` (es. `v1.0.0`).
- `develop`: integrazione, ramo di default su GitHub. Le PR puntano qui.
- `feature/<nome>`: un ramo per ogni task. Si apre da `develop` con `/start <nome>` (oppure `git flow feature start <nome>`).
- `bugfix/`, `release/`, `hotfix/`: come da git-flow (configurazione dopo il clone: `git flow init -d && git config gitflow.prefix.versiontag v`; non viene versionata).

`<nome>` è breve, in inglese, in kebab-case: `wishlist`, `llm-wiki`. Le feature di sola analisi hanno il prefisso `study-` (`study-payouts`): si chiudono anche con l'analisi parziale e si riprendono con una feature nuova. **Non toccano il codice**: solo `docs/`, `.claude/` e file `*.md`. Per implementare ciò che uno studio ha deciso si chiude lo studio e si apre una feature nuova.

## Commit

Formato [Conventional Commits](https://www.conventionalcommits.org/): tipo e ambito come da standard, descrizione in **italiano**:

```
<tipo>(<ambito opzionale>): <cosa cambia, all'imperativo, max ~72 caratteri>

<corpo opzionale: perché, non come>
```

| Tipo | Quando |
|---|---|
| `feat` | Nuova funzionalità |
| `fix` | Correzione di un bug |
| `docs` | Solo documentazione (anche wiki: `docs(wiki): …`) |
| `refactor` | Modifica del codice senza cambiare il comportamento |
| `test` | Test |
| `build` / `ci` | Dipendenze, build, pipeline |
| `chore` | Tutto il resto (configurazione, pulizia) |

Ambiti: `api`, `web`, `shared`, più `wiki`, `raw`, `output`, `docs`, `ci`.

Esempi: `feat(api): aggiungi modulo alimenti`, `fix(web): gestisci kcal mancanti`, `docs(wiki): aggiorna da diary`.

**Commit atomici**: una modifica logica per commit, così la PR si rilegge passo per passo.

## Comandi di check

Da lanciare dalla root prima di ogni PR (`/close` li esegue in quest'ordine). Gli script nascono con lo scaffolding (feature `first-develop`); i test dell'API richiedono `docker compose up -d`.

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Pull request

1. Prima di aprirla, in locale, i [comandi di check](#comandi-di-check). Per le feature `study-` non servono: `/close` verifica invece che non abbiano toccato codice.
2. Si apre verso `develop` con `/close`, che aggiorna il wiki (commit `docs(wiki): …`), fa il push e crea la PR. A mano: `gh pr create --base develop`.
3. Titolo nello stesso formato dei commit; descrizione dal template (`.github/pull_request_template.md`).
4. Nessun merge senza revisione. Nella revisione si rilegge anche il commit del wiki.

**Merge**:

- feature e bugfix verso `develop`: **squash** (un commit per feature, con il titolo della PR);
- release e hotfix verso `main`, e il loro ritorno su `develop`: **merge normale**, altrimenti `main` e `develop` divergono;
- dopo lo squash il ramo locale si cancella con `git branch -D feature/<nome>` (git non lo vede come unito).

## Documentazione

- Regole per scrivere codice: `AGENTS.md` e i `CLAUDE.md` delle singole cartelle.
- Wiki di progetto, raw e ingest: [docs/CLAUDE.md](docs/CLAUDE.md).

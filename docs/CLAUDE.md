# Docs & Wiki Guide

This guide covers work in `docs/`: the raw sources, the project wiki, the outputs and the rules to keep them in order. Read it before reading from, writing to or processing anything here.
## Structure

```
docs/
├── setup/                  # setup, tooling and deploy guides — edit on request only
├── raw/                    # raw sources — added, never edited
│   ├── <feature-name>/     # one folder per git feature (feature/<name>)
│   ├── YYYY-MM-DD-*.md     # loose sources not tied to a feature
│   └── compiled/           # already processed — history, never processed again
├── output/                 # reports, analyses, studies for people — dated snapshots (/report)
└── wiki/                   # compiled knowledge — written by the LLM, reviewed in PRs
    ├── index.md            # the areas + radar of the decisions still to take — always start here
    ├── business/           # the company, market, competitors, business rules, glossary
    ├── progetto/           # how the project is built and run: repo, versions, git-flow, wiki, studies
    ├── <area>/             # one folder per domain area of the project (e.g. brand/, catalogo/, infrastruttura/)
    └── tecnico/            # custom code only, one sub-folder per app (api/, web/, shared/)
```

The wiki is split by **area** (topic), not by kind of page: an area holds both the pages that describe something and the decisions about it. Every folder has its own `index.md`. Add an area when its first page arrives, and list it in `wiki/index.md`.

## What goes where

- **Wiki**: what exists in this project and why. Business rules, brand, decisions, and the documentation of **custom** code (entities, API routes, views, components, jobs).
- **Not in the wiki**:
  - how to write code → `AGENTS.md` and the workspace `CLAUDE.md` files;
  - framework and library behaviour → the framework docs listed in `AGENTS.md`. Cite them, never copy them;
  - setup and deploy procedures → `docs/setup/`;
  - secrets, credentials, personal data.

## Language

- **Italian wherever possible**: every wiki area (`tecnico/` included), the `index.md` files, raw notes, `output/`, the app UI, and commit/PR descriptions.
- Code: domain names are Italian (entities, fields, API routes, e.g. `Alimento`, `voce_diario`, `/alimenti`); framework plumbing (config, middleware, lib helpers) and Conventional Commits types/scopes stay as the frameworks name them.
- In `tecnico/`, unknowns go in `## Domande aperte`, like the other areas. Frontmatter keys and values are always the Italian ones below.

## Raw sources

- Raw files are **never edited**. If something changes, add a new file.
- File names: `YYYY-MM-DD-topic.md`. Free format inside.
- A feature's sources live in `raw/<feature-name>/`; its first note is the task goal. Tasks are features.
- **Study features** (analysis only) are named `study-<topic>` (e.g. `feature/study-payouts`). They **touch no code**: only `docs/`, `.claude/` and `*.md` files; `/close` checks it and skips the code checks. To implement what a study decided, close it and start a new feature. Keep features short: close a study even when the analysis is partial, and resume it later with a new feature.
- There is **no backlog**: a task exists only as a feature (its goal note) and its PR. Knowledge that never reaches the wiki through an ingest was not worth keeping.
- `raw/` is versioned: no secrets or personal data. If you find any, report them and do not copy them into the wiki.
- Never read `raw/compiled/` or `output/` when processing. `raw/compiled/` is history, read it only to trace where a page came from.

## Wiki pages

- One topic per page, in the area of its topic.
- Every page starts with a frontmatter:
  ```yaml
  ---
  tipo: decisione            # info | decisione
  stato: in analisi          # only for decisione — see Decisions
  aggiornato: 2026-10-02     # last ingest that changed the page
  fonti:                     # raw files it comes from, relative to docs/
    - raw/compiled/study-payouts/2026-10-02-perimetro.md
  ---
  ```
  `fonti` may be empty only in `tecnico/` (pages that come from code). A `superata` decision also has `sostituita_da: <relative path of the page that replaces it>`.
- **Indexes** (progressive disclosure: read the root, then one area, then the pages):
  - `wiki/index.md` lists the areas, one line each, and the **radar**: every decision `aperta` or `in analisi`, with its status;
  - every folder has an `index.md` listing its pages (`- [Title](./page.md): one-line description`, plus ` · <stato>` for decisions) and its sub-folders' indexes. A folder with no pages says so ("Nessuna pagina." / "No pages.").
- **Sub-folders**: split an area when it passes ~12 pages, or when a sub-topic reaches 4 pages (e.g. `<area>/<sub-topic>/`). At most one level below an area (`tecnico/` has one more: the app). Don't split ahead of time.
- **Lint**: `/lint-wiki` checks links, indexes, frontmatter and radar. `/ingest` runs it before its commit, `/close` after the ingest.
- Unknowns go in a final `## Domande aperte` section. Never guess.
- The page format for `tecnico/` is not fixed yet: keep pages consistent with the existing ones of the same kind.

### Decisions

A decision is a page with `tipo: decisione`, in the area of its topic. Its `stato` is one of:

| Status | Meaning |
|---|---|
| `aperta` | To be taken, not analysed yet |
| `in analisi` | Analysis started, not concluded (e.g. a closed study feature) |
| `presa` | Taken, with the reasons |
| `superata` | Replaced by another decision (`sostituita_da`) |

The status lives only in the frontmatter, never in the folder name: finding every open decision is a `grep "stato: aperta"`, and the root radar lists them.

A partial analysis is a decision `in analisi`: what is known, options considered (with pros and cons), open questions. When a later feature completes it, the ingest updates the same page instead of creating a new one.

## Outputs

`docs/output/` holds documents for people (calls, meetings, the client): reports, analyses, studies. They are created by `/report`.

- File name: `YYYY-MM-DD-<topic>.md`.
- **Snapshots**: never edited after creation. For a new version, generate a new file with today's date.
- **Never a source for the ingest**: what comes out of a call (decisions, objections) goes back as a raw note.
- Committed in the feature that produced them, so the PR shows what was presented and when.

## Ingest

### What to keep — the filter

The wiki describes the **current state** of the project and the reasons behind it, not the history of how we got there. History is already in git (commits, PRs) and in `raw/compiled/`.

Keep only what someone would need later to understand or change the project:

- business rules, brand choices, decisions and their reasons, open questions;
- custom code that **exists now**: entities, links, API routes, panel views, widgets, components (what they are, what they are for, where they live).

Leave out:

- the list of commits, intermediate attempts, refactors, fixes, renames, tooling or formatting changes: they matter only if they change what exists or a rule;
- meeting chatter, temporary details, things already obvious from the code, anything the framework docs already document.

Update pages **in place**: rewrite the section that changed, never append a chronological log. If a source adds nothing that passes this filter, it changes no page (it still moves to `compiled/`). A large task should not mean a large wiki diff.

### Steps

What the ingest does, in order:

1. Collect what to process: the files in `raw/<feature-name>/` (or the loose files in `raw/`) not yet in `compiled/`, plus the feature's commits, to know what custom code was added, changed or removed:
   ```bash
   git fetch origin
   git log --no-merges origin/develop..HEAD
   ```
   Always compare with `origin/develop` after a fetch, never with the local `develop` (it may be stale, and then other features' merged commits look like this feature's). `--no-merges` drops the merges of `develop` into the feature. Commits of other open features are never in this range.
2. Read `wiki/index.md`, the index of each area involved, and the pages involved.
3. For technical pages, check the framework docs listed in `AGENTS.md`: link what they already cover.
4. Update or create the pages, the `index.md` of their folders and the radar in `wiki/index.md`. Update or delete the technical pages of code the feature changed or removed.
5. **Conflicts**: when a source contradicts the wiki, keep the existing text, add the point to the page's open questions, and list it in the final summary. Never overwrite silently.
6. Move the processed sources to `raw/compiled/`: the **whole feature folder** (`raw/<feature-name>/` must not remain), and loose files with the same name.
7. Create **one** commit with only the wiki and raw changes: `docs(wiki): aggiorna da <feature-name>`.
8. Report a summary: pages created, updated, deleted; conflicts; anything skipped.

If there is nothing new to process (no new raw, no custom code), make no changes and no commit.

Wiki changes never reach `develop` directly: they go through the feature's PR, reviewed by the project maintainer.

## Using the wiki during development

Sources, in this order:

1. `AGENTS.md` and the `CLAUDE.md` of the folder you work in — **always**. They point to the framework docs, the main source for backend and panels.
2. `wiki/tecnico/` for the project's custom code.
3. The other wiki areas (business, progetto and the domain areas) and their decisions before implementing a business rule or a brand choice. If the rule is missing or unclear, ask instead of inventing it.

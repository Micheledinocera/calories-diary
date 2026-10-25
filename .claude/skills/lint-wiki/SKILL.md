---
name: lint-wiki
description: Check the project wiki (docs/wiki) for broken links, pages missing from their folder index, folders without index.md, invalid frontmatter and open decisions missing from the root radar, then fix what it can. Use when the user runs /lint-wiki; /ingest runs it before its commit and /close after the ingest.
---

# /lint-wiki — check the wiki

The rules being checked are in `docs/CLAUDE.md`, section **Wiki pages**. Read it before fixing anything.

## Example

```
/lint-wiki
```

No arguments. It works on any branch, but fixes are committed only on a `feature/*` branch (wiki changes reach `develop` only through a PR).

## 1. Mechanical checks

From the repo root:

```bash
node .claude/skills/lint-wiki/lint-wiki.mjs
```

It prints one `ERROR` or `WARN` line per problem and exits 1 if there are errors. It checks:

- every folder of `docs/wiki/` has an `index.md`, linked from the parent folder's `index.md`;
- every page is listed in its folder's `index.md`;
- every relative link resolves;
- every page has the frontmatter (`tipo`, `stato` for decisions, `aggiornato`, `fonti` under `raw/compiled/` and existing, `sostituita_da` for a superseded decision);
- the root `index.md` lists every decision `aperta` or `in analisi` (the radar);
- warning: a folder with more than 12 pages, to split into sub-folders.

## 2. Fix

Fix every error in the wiki, following `docs/CLAUDE.md`: add the missing index entries, repair or remove broken links, complete the frontmatter from the page content and its sources. Never invent content: if a fix needs information the wiki and its sources do not have (e.g. which decision replaces a superseded one), leave the error and report it.

Warnings are for the user: report them, do not split folders on your own unless asked.

Run the script again until it reports no errors, or only errors you cannot fix.

## 3. Commit

- **Called by `/ingest`**: no commit of its own; the fixes go into the ingest commit.
- **Called by `/close`, or by the user** on a `feature/*` branch, with changes: one commit with only the wiki:
  ```bash
  git add -A docs/wiki
  git commit -m "docs(wiki): correggi errori di lint" -- docs/wiki
  ```
  End the commit message with the attribution line required by the session.
- On any other branch: do not commit; report the fixes as pending and tell the user to start a feature.

## 4. Report

Errors fixed, errors left (with the reason), warnings, and the commit hash if any.

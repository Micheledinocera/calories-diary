---
name: ingest
description: Process the current feature's raw sources and custom code into the project wiki (docs/wiki), move the processed raw files to docs/raw/compiled, run /lint-wiki and create one docs(wiki) commit. Use when the user runs /ingest, or when /close runs it. Only on a feature/* branch.
---

# /ingest — update the wiki from the raw sources

The rules for the wiki (what goes where, language, page format, conflicts) are in `docs/CLAUDE.md`. Read it first and follow its **Ingest** section. This skill adds the operational steps around it.

## Example

```
/ingest
```

No arguments: it works on the current feature branch.

Normally it runs only at the end of a feature, through `/close`. The user may run it earlier (start or middle of a feature) when they need the wiki updated sooner. Running it again later is safe: raw files already processed are in `compiled/` and are not read again, and code already documented leaves the pages unchanged.

## 1. Checks — stop if any fails

1. **Branch**: `git branch --show-current` must start with `feature/`. On `develop`, `main` or any other branch, stop and tell the user: wiki changes only reach `develop` through a feature PR.
2. **Feature name**: the branch name without `feature/` (e.g. `feature/wishlist` → `wishlist`).
3. **No unrelated pending edits in the wiki**: if `git status --porcelain docs/wiki` shows changes, stop and ask the user what to do with them. New or modified files in `docs/raw/` are fine: they are what we process.

## 2. Collect what to process

- Raw sources:
  - every file in `docs/raw/<feature-name>/`;
  - loose files directly in `docs/raw/` (material not tied to a feature), if any;
  - never anything under `docs/raw/compiled/` or `docs/output/` (outputs are snapshots, not sources).
- Custom code of this feature:
  ```bash
  git fetch origin
  git log --no-merges --stat origin/develop..HEAD
  ```
  Ignore earlier `docs(wiki): …` commits of this feature.

If there are no raw sources and no code commits beyond wiki commits: tell the user there is nothing to process, and stop without changes.

## 3. Update the wiki

Follow the **Ingest** section of `docs/CLAUDE.md` (read `wiki/index.md` and the involved pages, check the framework docs listed in `AGENTS.md` for technical pages, update or create pages, handle conflicts, update `index.md`).

Decisions follow the **Decisions** section of `docs/CLAUDE.md`: every decision page has a `stato` in its frontmatter (`aperta`, `in analisi`, `presa`, `superata`). A study feature usually leaves its decision `in analisi`; a later feature on the same topic updates that page, it does not create a new one.

Pages live in the **area** of their topic, with the frontmatter and indexes described in the **Wiki pages** section of `docs/CLAUDE.md`. When you add, move or remove a page, update its folder's `index.md`; when a decision enters or leaves `aperta` / `in analisi`, update the radar in `docs/wiki/index.md`. Fonti in the frontmatter point to where the raw files **will be** after step 4 (`raw/compiled/<feature-name>/…`).

## 4. Move the processed raw files

Move the **whole feature folder**, not just its files: afterwards `docs/raw/<feature-name>/` must not exist any more.

```bash
mkdir -p docs/raw/compiled
if [ -d docs/raw/compiled/<feature-name> ]; then
  # a previous ingest of this feature already created it: merge the new files, then drop the folder
  mv docs/raw/<feature-name>/* docs/raw/compiled/<feature-name>/ && rmdir docs/raw/<feature-name>
else
  mv docs/raw/<feature-name> docs/raw/compiled/<feature-name>
fi
```

Loose files keep their name: `docs/raw/YYYY-MM-DD-x.md` → `docs/raw/compiled/YYYY-MM-DD-x.md`.

- Use `mv`, not `git mv` (raw files may still be untracked). Staging with `git add -A` in the next step records them as renames.
- If the folder cannot be removed (on Windows it can be locked by an editor or a terminal whose working directory is inside it), retry once; if it still fails, tell the user to close what holds it and remove the empty folder. Git does not track empty folders, so the commit is correct either way.
- If the user adds notes after a mid-feature ingest, the folder is simply created again; the next ingest merges it as above.

## 5. Lint

Run the `/lint-wiki` skill and follow it, without its commit: its fixes go into the commit below. It runs after step 4 because it checks that the fonti exist under `raw/compiled/`. Errors it cannot fix go into the report.

## 6. Commit — only wiki and raw

```bash
git add -A docs/wiki docs/raw
git commit -m "docs(wiki): aggiorna da <feature-name>" -m "<one line per page created/updated/deleted>" -- docs/wiki docs/raw
```

- The `-- docs/wiki docs/raw` pathspec keeps any other staged change out of this commit.
- End the commit message with the attribution line required by the session.
- Do **not** push: `/close` does it, or the user.

## 7. Report to the user

- Pages created, updated, deleted (with links).
- Lint: errors left, warnings.
- **Conflicts** found and where they were recorded (page and open question).
- Sensitive data found in raw and not copied, if any.
- Raw files moved to `compiled/`.
- The commit hash.

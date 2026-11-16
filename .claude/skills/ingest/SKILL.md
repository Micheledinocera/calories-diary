---
name: ingest
description: After a feature is merged, open feature/ingest-<name> from develop, process that feature's raw sources and the custom code of its squash-merged PR into the project wiki (docs/wiki), move the processed raw files to docs/raw/compiled, run /lint-wiki and create one docs(wiki) commit. Use when /close runs it, or when the user runs /ingest <name>. Runs from develop or from feature/ingest-<name>.
---

# /ingest — update the wiki after a feature is merged

The rules for the wiki (what goes where, language, page format, conflicts) are in `docs/CLAUDE.md`. Read it first and follow its **Ingest** section. This skill adds the operational steps around it.

## Example

```
/ingest wishlist
```

Argument: the name of the **merged** feature (`wishlist` for `feature/wishlist`). On `feature/ingest-<name>` it can be omitted.

The ingest runs **after** the feature's PR is squash-merged into `develop`, in a dedicated feature `feature/ingest-<name>` that contains only the wiki commit. Normally `/close` runs it right after the merge and then closes the ingest feature. The user runs it by hand when that chain stopped, or for a feature merged without `/close`.

## 1. Checks — stop if any fails

1. **Branch and name**:
   - on `feature/ingest-<name>`: resume there; `<name>` comes from the branch (an argument, if given, must match);
   - on `develop`: `<name>` is the argument (ask for it if missing). `git status --porcelain` must be empty, then `git pull --ff-only origin develop`. There must be no local or remote branch `feature/ingest-<name>` (`git branch -a --list "*feature/ingest-<name>"`): if there is, stop and tell the user to switch to it;
   - on any other branch, stop: the ingest starts only after the feature is merged (`/close`).
2. **Merged PR**: find the PR of `feature/<name>`:
   ```bash
   gh pr list --state merged --base develop --head feature/<name> --json number,url,mergeCommit --limit 1
   ```
   (`gh` from the PATH, otherwise `"C:/Program Files/GitHub CLI/gh.exe"`.) Its `mergeCommit.oid` is the **squash commit** on `develop`. If there is no merged PR, stop: if the branch `feature/<name>` still exists, tell the user to run `/close` on it; otherwise ask the user which commit(s) on `develop` hold the feature.
3. **No unrelated pending edits in the wiki**: if `git status --porcelain docs/wiki` shows changes, stop and ask the user what to do with them.

## 2. Collect what to process

- Raw sources:
  - every file in `docs/raw/<name>/` (it reached `develop` with the squash);
  - loose files directly in `docs/raw/` (material not tied to a feature), if any;
  - never anything under `docs/raw/compiled/` or `docs/output/` (outputs are snapshots, not sources).
- Custom code of the feature: the squash commit.
  ```bash
  git fetch origin
  git show --stat <squash-sha>
  ```
  Read the diff of the files that matter (`git show <squash-sha> -- <path>`). Ignore changes to `docs/raw/` and `docs/output/`.

If there are no raw sources and no custom code to document: tell the user there is nothing to process, and stop without changes. If you are on a `feature/ingest-<name>` with no commits of its own (`git log origin/develop..HEAD` empty), go back to `develop` and remove it (`git checkout develop && git branch -D feature/ingest-<name>`, plus `git push origin --delete feature/ingest-<name>` if it was pushed).

## 3. Open the ingest feature

If you are on `develop`:

```bash
git flow feature start ingest-<name>
```

No goal note: the ingest feature has no raw folder of its own. Its sources are the merged feature's.

## 4. Update the wiki

Follow the **Ingest** section of `docs/CLAUDE.md` (read `wiki/index.md` and the involved pages, check the framework docs listed in `AGENTS.md` for technical pages, update or create pages, handle conflicts, update `index.md`).

Decisions follow the **Decisions** section of `docs/CLAUDE.md`: every decision page has a `stato` in its frontmatter (`aperta`, `in analisi`, `presa`, `superata`). A study feature usually leaves its decision `in analisi`; a later feature on the same topic updates that page, it does not create a new one.

Pages live in the **area** of their topic, with the frontmatter and indexes described in the **Wiki pages** section of `docs/CLAUDE.md`. When you add, move or remove a page, update its folder's `index.md`; when a decision enters or leaves `aperta` / `in analisi`, update the radar in `docs/wiki/index.md`. Fonti in the frontmatter point to where the raw files **will be** after step 5 (`raw/compiled/<name>/…`).

## 5. Move the processed raw files

Move the **whole feature folder**, not just its files: afterwards `docs/raw/<name>/` must not exist any more.

```bash
mkdir -p docs/raw/compiled
if [ -d docs/raw/compiled/<name> ]; then
  # an earlier ingest already created it: merge the new files, then drop the folder
  mv docs/raw/<name>/* docs/raw/compiled/<name>/ && rmdir docs/raw/<name>
else
  mv docs/raw/<name> docs/raw/compiled/<name>
fi
```

Loose files keep their name: `docs/raw/YYYY-MM-DD-x.md` → `docs/raw/compiled/YYYY-MM-DD-x.md`.

- Staging with `git add -A` in step 7 records the moves as renames.
- If the folder cannot be removed (on Windows it can be locked by an editor or a terminal whose working directory is inside it), retry once; if it still fails, tell the user to close what holds it and remove the empty folder. Git does not track empty folders, so the commit is correct either way.

## 6. Lint

Run the `/lint-wiki` skill and follow it, without its commit: its fixes go into the commit below. It runs after step 5 because it checks that the fonti exist under `raw/compiled/`. It checks the whole wiki, so it also catches manual wiki edits the merged feature brought. Errors it cannot fix go into the report.

## 7. Commit — only wiki and raw

```bash
git add -A docs/wiki docs/raw
git commit -m "docs(wiki): aggiorna da <name>" -m "<one line per page created/updated/deleted>" -- docs/wiki docs/raw
```

- The `-- docs/wiki docs/raw` pathspec keeps any other staged change out of this commit.
- End the commit message with the attribution line required by the session.
- Do **not** push: `/close` does it (when it called this skill, it goes on by itself; otherwise the user runs `/close`).

## 8. Report to the user

- The merged PR it documents.
- Pages created, updated, deleted (with links).
- Lint: errors left, warnings.
- **Conflicts** found and where they were recorded (page and open question).
- Sensitive data found in raw and not copied, if any.
- Raw files moved to `compiled/`.
- The commit hash, and the branch `feature/ingest-<name>` waiting for `/close`.

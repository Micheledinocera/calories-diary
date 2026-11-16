---
name: close
description: Close the current feature - commit pending raw notes, run the repo checks (skipped for study- and ingest- features, which must touch no code), push, open a pull request toward develop with GitHub CLI, squash-merge it and delete the branch. Then run /ingest in a dedicated feature/ingest-<name>, closed the same way. Use when the user runs /close. Only on a feature/* branch.
---

# /close — close a feature: PR, squash merge, then ingest

Conventions (commit, PR and merge format) are in `CONTRIBUTING.md`; wiki rules in `docs/CLAUDE.md`.

## Example

```
/close
```

No arguments: it closes the current feature branch.

The flow has two rounds:

1. **The feature**: checks, PR toward `develop`, automatic **squash merge**, feature branch deleted (local and remote).
2. **The ingest**: from the updated `develop`, `/ingest <name>` opens `feature/ingest-<name>`, updates the wiki, and this skill closes it with its own PR and squash merge. On an `ingest-` branch the second round is skipped.

`git flow feature finish` is **never** used: it would merge into `develop` locally, without a PR.

## 1. Checks — stop if any fails

1. **Branch**: `git branch --show-current` starts with `feature/`. Otherwise stop. Feature name `<name>` = branch without `feature/`. If `<name>` starts with `ingest-`, this is an **ingest feature**.
2. **No uncommitted code**: `git status --porcelain`, ignoring `docs/raw/`, must be empty. Otherwise stop and ask the user to commit or discard it.
3. **GitHub CLI**: use `gh` if on the PATH, otherwise `"C:/Program Files/GitHub CLI/gh.exe"`. `gh auth status` must succeed; otherwise stop and tell the user to run `gh auth login` in a real terminal.

## 2. Commit pending raw notes

Skip for an ingest feature.

The ingest runs later, on a new branch from `develop`: raw notes not committed here would be lost with the feature branch. If `git status --porcelain docs/raw/<name>` shows anything:

```bash
git add docs/raw/<name>
git commit -m "docs(raw): aggiungi note di <name>" -- docs/raw/<name>
```

End the commit message with the attribution line required by the session.

## 3. Documentation-only features

For a `study-` or an ingest feature, every file changed must be documentation, i.e. under `docs/`, under `.claude/`, or a `*.md` file:

```bash
git fetch origin
git diff --name-only origin/develop...HEAD
```

If any other file appears, stop, list them and tell the user: this kind of feature cannot change code; move that work to a new feature (`/start <name>`) and revert it here.

## 4. Repo checks

**Skip this step for a `study-` or an ingest feature**: step 3 already proved it changes no code.

Otherwise, from the repo root, run the commands listed in the **Comandi di check** section of `CONTRIBUTING.md`, in order, stopping at the first failure and reporting its output. If that section still has placeholders, stop and ask the user to fill it in.

## 5. Push and pull request

```bash
git push -u origin feature/<name>
```

If a PR already exists for the branch (`gh pr view --json url,state`) and it is open, use it: the push updated it. Otherwise create it toward `develop`:

```bash
gh pr create --base develop --head feature/<name> --title "<title>" --body-file <file>
```

- **Title**: Conventional Commits format, description in Italian. For a feature, it summarizes the feature (e.g. `feat: diario giornaliero`); it becomes the squash commit on `develop`. For an ingest feature: `docs(wiki): aggiorna da <original-name>`.
- **Body**: fill `.github/pull_request_template.md` (Italian, sections Sommario, Modifiche, Wiki, Come verificare, Note):
  - *Sommario* from the goal note in `docs/raw/<name>/` and the commits; for an ingest feature, which feature it documents and a link to its PR;
  - *Modifiche*: one line per commit or group of commits (`git log --no-merges origin/develop..HEAD`);
  - *Wiki*: for a feature, "Aggiornato dopo il merge, in `feature/ingest-<name>`"; for an ingest feature, the pages from the `/ingest` report and its conflicts;
  - *Note*: list the outputs created in this feature (`docs/output/…`, from `git diff --name-only origin/develop...HEAD -- docs/output`), if any;
  - *Come verificare*: tick the checks that passed, describe the manual check. For a `study-` or ingest feature, replace the checklist with "Documentation only, code checks skipped" and what to read to review it;
  - end the body with the attribution line required by the session for pull requests.
- Write the body to a temporary file in the scratchpad, not in the repo.

## 6. Squash merge

```bash
gh pr merge <number> --squash --delete-branch --subject "<title> (#<number>)"
git checkout develop
git pull --ff-only origin develop
git branch -D feature/<name> 2>/dev/null || true
git fetch --prune origin
```

- `--delete-branch` removes the remote branch and the local one; the `git branch -D` only covers a local branch left behind (after a squash git does not see it as merged).
- If the merge fails (conflicts with `develop`, branch protection), stop: report the PR URL and the error, and leave the branch as it is. The user resolves it, then runs `/close` again.

## 7. Ingest

**Skip for an ingest feature**: go to the report.

Run the `/ingest` skill with argument `<name>` and follow it fully. From `develop` it opens `feature/ingest-<name>`, processes the raw notes and the code of the merged PR, and commits.

- If it made a commit: run this skill again from step 1. You are now on `feature/ingest-<name>`, so it goes through steps 3, 5 and 6 and ends on `develop`.
- If it found nothing to process, it has already removed its branch: the feature is closed without a wiki change.
- If it stopped with an error, report it: the feature is merged, the ingest is pending on `feature/ingest-<name>` (or not started). The user can resume it with `/ingest <name>`, then `/close`.

## 8. Report

- Feature PR: URL, merged with squash, branch deleted.
- Checks passed (or skipped, for a study).
- Ingest PR: URL and merge, wiki pages touched, conflicts to look at; or "nothing to process".
- The current branch is `develop`, up to date.

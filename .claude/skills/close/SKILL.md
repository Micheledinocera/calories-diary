---
name: close
description: Close the current feature - run /ingest to update the wiki, run /lint-wiki, run the repo checks (skipped for study- features, which must touch no code), push and open a pull request toward develop with GitHub CLI. Never merges. Use when the user runs /close. Only on a feature/* branch.
---

# /close — close a feature with a PR

Conventions (commit and PR format) are in `CONTRIBUTING.md`; wiki rules in `docs/CLAUDE.md`.

## Example

```
/close
```

No arguments: it closes the current feature branch.

The feature is **not** merged here, and `git flow feature finish` is **never** used: it would merge into `develop` locally and skip the review. The merge happens on GitHub after the user reviews the PR.

## 1. Checks — stop if any fails

1. **Branch**: `git branch --show-current` starts with `feature/`. Otherwise stop. Feature name = branch without `feature/`.
2. **No uncommitted code**: `git status --porcelain`, ignoring `docs/raw/`, must be empty. Otherwise stop and ask the user to commit or discard it. New raw notes are fine: `/ingest` processes them.
3. **GitHub CLI**: use `gh` if on the PATH, otherwise `"C:/Program Files/GitHub CLI/gh.exe"`. `gh auth status` must succeed; otherwise stop and tell the user to run `gh auth login` in a real terminal.
4. **Study features touch no code**: if the name starts with `study-`, every file changed by the feature must be documentation, i.e. under `docs/`, under `.claude/`, or a `*.md` file:
   ```bash
   git fetch origin
   git diff --name-only origin/develop...HEAD
   ```
   If any other file appears, stop, list them and tell the user: a study cannot change code; move that work to a new feature (`/start <name>`) and revert it here.

## 2. Update the wiki

Run the `/ingest` skill and follow it fully. Afterwards `docs/raw/<name>/` must not exist (everything is in `docs/raw/compiled/<name>/`). If it still has files, stop and report them; if it is only an empty folder, remove it.

If `/ingest` found nothing to process, continue: the PR simply has no wiki commit.

Then run the `/lint-wiki` skill and follow it (it commits its own fixes, if any). It is quick, and it catches what the ingest did not see: manual wiki edits, or an ingest that had nothing to process. If errors remain that it cannot fix, stop and report them.

## 3. Repo checks

**Skip this step for a `study-` feature**: check 4 already proved it changes no code.

Otherwise, from the repo root, run the commands listed in the **Comandi di check** section of `CONTRIBUTING.md`, in order, stopping at the first failure and reporting its output. If that section still has placeholders, stop and ask the user to fill it in.

## 4. Push

```bash
git push -u origin feature/<name>
```

## 5. Pull request

If a PR already exists for the branch (`gh pr view --json url`), just report its URL: the push updated it.

Otherwise create it toward `develop`:

```bash
gh pr create --base develop --head feature/<name> --title "<title>" --body-file <file>
```

- **Title**: Conventional Commits format, description in Italian, summarizing the feature (e.g. `feat: diario giornaliero`).
- **Body**: fill `.github/pull_request_template.md` in Italian:
  - *Summary* from the goal note in `docs/raw/compiled/<name>/` and the commits;
  - *Changes*: one line per commit or group of commits (`git log --no-merges origin/develop..HEAD`);
  - *Wiki*: pages from the `/ingest` report and its conflicts, or "None";
  - *Notes*: list the outputs created in this feature (`docs/output/…`, from `git diff --name-only origin/develop...HEAD -- docs/output`), if any;
  - *How to verify*: tick the checks that passed, describe the manual check. For a `study-` feature, replace the checklist with "Study feature: documentation only, code checks skipped" and what to read to review it;
  - end the body with the attribution line required by the session for pull requests.
- Write the body to a temporary file in the scratchpad, not in the repo.

## 6. Report

PR URL, checks passed (or skipped, for a study), wiki pages touched, conflicts to look at in review. Remind the user that the merge is theirs, on GitHub, after review.

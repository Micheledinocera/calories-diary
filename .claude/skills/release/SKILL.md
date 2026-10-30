---
name: release
description: Publish a new version to production with git-flow - pick the SemVer version, check what the release brings to production (migrations, env), run the repo checks, align the package versions, finish the release or hotfix, push, wait for the API and web deploys and create the GitHub Release. Use when the user runs /release.
argument-hint: "[version] | hotfix <version> [what to fix]"
disable-model-invocation: true
---

# /release — publish a version

The release procedure is in the **Release** section of `CONTRIBUTING.md`, the pipeline in `docs/wiki/progetto/deploy.md`. This skill runs them with the checks around them.

**Pushing to `main` publishes to production** (API migrations included, and they have no automatic rollback). `disable-model-invocation` keeps this skill from starting on its own; the confirmation in step 6 is required even if the user passed the version.

## Example

```
/release                                  # release from develop, proposes the version
/release 0.3.0                            # release from develop, with that version
/release hotfix 0.2.1 Corregge il login   # opens hotfix/0.2.1 from main and stops
/release                                  # on hotfix/0.2.1, once the fix is committed: publishes it
```

## 1. Mode

Check `git branch --show-current`:

- `hotfix` in the arguments → **open a hotfix**, below, then stop.
- Branch `develop` → **release**: `<kind>` is `release`, `<base>` is `origin/develop`.
- Branch `hotfix/<version>` → **hotfix**: `<kind>` is `hotfix`, `<base>` is `HEAD`, the version is the branch's.
- Anything else → stop: releases start from `develop`.

**Open a hotfix**: run checks 1, 2, 3 and 6 of step 2, then `git flow hotfix start <version>` (it starts from `main`, after `git checkout main` and `git pull --ff-only origin main`). The version must be the last tag with PATCH + 1. Report the branch and stop: the user commits the fix (with `fix(<scope>): …` commits; the check commands apply), then runs `/release` again on that branch. Stop here even if the user's description makes the fix look obvious, unless they ask you to write it too.

## 2. Checks — stop if any fails

1. **Clean working tree**: `git status --porcelain` must be empty.
2. **git-flow initialized**: `git config gitflow.branch.develop` prints `develop` and `git config gitflow.prefix.versiontag` prints `v`. Otherwise see `CONTRIBUTING.md`.
3. **GitHub CLI**: use `gh` if on the PATH, otherwise `"C:/Program Files/GitHub CLI/gh.exe"`. `gh auth status` must succeed; otherwise tell the user to run `gh auth login` in a real terminal.
4. **Up to date**: `git fetch origin --tags`, then local `develop` and `main` must match `origin/develop` and `origin/main` (fast-forward them if they are only behind; stop if they diverged).
5. **Nothing to publish**: with `<last>` = `git describe --tags --abbrev=0 origin/main`, `git log --no-merges --oneline <last>..<base>` must not be empty.
6. **No other release open**: no `release/*` or `hotfix/*` branch, local or remote, other than the current one.
7. **CI green** (release only): the `CI` run on the `origin/develop` commit is `completed` and `success` (`gh run list --commit <sha> --workflow CI --json status,conclusion`). A hotfix branch has no CI: its proof is step 5.

Also list the PRs still open toward `develop` (`gh pr list --base develop`): they do not block, but the user sees what is left out.

## 3. Version

SemVer, without the `v` (`0.3.0`). If not given, propose it from the commits of check 5: `!` or `BREAKING CHANGE` → MAJOR, any `feat` → MINOR, otherwise PATCH. It must be greater than `<last>` and `v<version>` must not exist (`git tag -l`). The user confirms it in step 6.

## 4. What reaches production

Compare `<last>..<base>` and collect what the release changes outside the code:

- **Migrations** (`git diff --name-status <last> <base> -- apps/api/migrations`): read the new ones. They run on Neon before the new API starts, so the old API works on the new schema for a moment. Flag anything destructive or incompatible with the old code (`drop`, renames, `not null` without default, type changes).
- **Environment**: changes to `apps/api/src/config/env.ts` and the `.env.example` files. Every new required variable must be set on Render or Vercel **before** the push: ask the user to confirm it. Never read or print the values.
- **Pipeline and hosting**: changes to `.github/workflows/`, `apps/api/Dockerfile`, `apps/web/vercel.json`, `apps/web/nuxt.config.ts`.
- **Checks left for after the release**: search `docs/wiki` for `dopo la release` and keep what still applies, for the report.

## 5. Repo checks and notes

From the repo root, run the commands in the **Comandi di check** section of `CONTRIBUTING.md`, in order, stopping at the first failure and reporting its output. The API tests need `docker compose up -d`.

Then write the release notes to a temporary file in the scratchpad, not in the repo. Italian, for the user who reads what is new, from the commits of check 5: sections `## Novità`, `## Correzioni`, `## Note` (migrations, manual steps), each only if it has something. One line per change, in plain words, not the commit titles; no commit lists. End with `**Confronto**: https://github.com/<repo>/compare/<last>...v<version>`.

## 6. Confirmation

Ask the user with `AskUserQuestion`, standing on its own: version, number of changes, migrations and their risks, environment changes, any failed or skipped step. Say that the push publishes to production. Without an explicit yes, stop: nothing has been changed yet.

## 7. Finish

Run these one at a time, not chained: the finish must not start if the bump failed, or the tag goes out with the old version.

```bash
git flow release start <version>     # release only; a hotfix is already on its branch
pnpm -r exec npm pkg set version=<version>
git commit -am "chore: versione <version>"
GIT_MERGE_AUTOEDIT=no git flow <kind> finish -m "v<version>" <version>
```

- End the commit message with the attribution line required by the session.
- Before the commit, `git diff --name-only` must list exactly `apps/api/package.json`, `apps/web/package.json` and `packages/shared/package.json`. Otherwise stop.
- If the finish stops on a conflict, stop and report it: do not resolve it and do not push. The repo stays in the state git-flow left it in.

After the finish you are on `develop`. Verify before pushing: `git tag -l v<version>` exists, `main` contains it (`git branch --contains v<version>`) and `git show v<version>:apps/web/package.json` has the new version.

## 8. Push

```bash
git push origin main develop --tags
```

## 9. Wait for the deploy

Take the commit of the tag (`git rev-parse v<version>^{commit}`) and wait for both deploys, in the background so nothing polls in a loop:

- **API**: find the `Deploy API` run of that commit (`gh run list --commit <sha> --workflow "Deploy API" --json databaseId`; it can take a few seconds to appear), then `gh run watch <id> --exit-status`. Its smoke test already verifies `/health` on this commit.
- **Web**: the `Vercel` commit status must become `success` (`gh api repos/<repo>/commits/<sha>/status --jq '.statuses[] | select(.context == "Vercel") | .state'`).

If a deploy fails, stop: report the failed step and its log (`gh run view <id> --log-failed`), and that the tag and `main` are already public. Do not retry, revert or force-push without the user. Skip step 10 until it is sorted out.

## 10. GitHub Release

```bash
gh release create v<version> --verify-tag --title "v<version>" --notes-file <file>
```

For a hotfix too. Add `--latest=false` only if a greater version already exists.

## 11. Report

Version, GitHub Release URL, deploy outcome of API and web, migrations applied, and the manual checks found in step 4. The branch is `develop`, and new features start from there.

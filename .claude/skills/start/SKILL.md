---
name: start
description: Start a new task as a git-flow feature - create feature/<name> from an up-to-date develop, create docs/raw/<name>/ with a first note describing the goal, commit and push. Use when the user runs /start.
argument-hint: <feature-name> [goal]
---

# /start — open a feature

Conventions (branch names, commit format) are in `CONTRIBUTING.md`; raw rules are in `docs/CLAUDE.md`.

## Example

```
/start wishlist Permettere ai clienti di salvare i prodotti in una lista dei desideri
/start study-payouts Capire come pagare i venditori: provider, tempi, commissioni
/start payouts Completare lo studio in wiki/<area>/payouts.md e implementare i payout
```

## 1. Inputs

- **Feature name**: from the arguments. Short, English, kebab-case (`wishlist`). Analysis-only features use the `study-` prefix (`study-payouts`). If missing or not in that form, propose one and ask the user to confirm.
- **Goal**: what the task is about and why. If not in the arguments, ask the user. It is written in **Italian**, in their words; don't invent requirements.
- **Resuming a topic**: if the wiki has a decision on the same topic, e.g. a study left `in analisi` (radar in `docs/wiki/index.md`, or `grep -rl "tipo: decisione" docs/wiki`), mention it to the user and link it in the goal note, so the work starts from there.

## 2. Checks — stop if any fails

1. **Clean working tree**: `git status --porcelain` must be empty. Otherwise stop and ask the user to commit or stash first.
2. **git-flow initialized**: `git config gitflow.branch.develop` must print `develop`. Otherwise stop and tell the user to run `git flow init -d` (see `CONTRIBUTING.md`).
3. **Name free**: no local or remote branch `feature/<name>` (`git branch -a --list "*feature/<name>"`), and no `docs/raw/<name>/` or `docs/raw/compiled/<name>/`.

## 3. Create the feature

```bash
git checkout develop
git pull --ff-only origin develop
git flow feature start <name>
```

## 4. First raw note

Create `docs/raw/<name>/YYYY-MM-DD-obiettivo.md` (today's date):

```md
# Obiettivo — <name>

<the goal, as given by the user>
```

It is the task description and the first source for `/ingest`. It also keeps the folder in git, which does not track empty folders.

## 5. Commit and push

```bash
git add docs/raw/<name>
git commit -m "docs(raw): aggiungi obiettivo di <name>" -- docs/raw/<name>
git push -u origin feature/<name>
```

End the commit message with the attribution line required by the session.

## 6. Report

Branch created, path of the goal note, and a reminder: add notes to `docs/raw/<name>/` whenever needed; `/close` will process them. For a `study-` feature, also remind that it touches no code (only `docs/`, `.claude/`, `*.md`).

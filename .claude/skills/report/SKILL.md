---
name: report
description: Write a report, analysis or study for people (calls, meetings, the client) as a dated snapshot in docs/output/, from the project wiki and the current feature's raw notes, and commit it. Use when the user runs /report. Only on a feature/* branch.
argument-hint: <topic> [what the report should focus on]
---

# /report — create a report in docs/output

Rules for outputs are in the **Outputs** section of `docs/CLAUDE.md`. Read it first.

## Example

```
/report payouts
/report payouts opzioni per i pagamenti ai venditori, da portare alla call con il cliente
```

## 1. Inputs and checks — stop if any fails

1. **Branch**: `git branch --show-current` must start with `feature/`. Outputs are committed in the feature that produced them, then reviewed in its PR.
2. **Topic**: from the arguments, English kebab-case (`payouts`). If missing, ask. Any extra text is the focus of the report: what the user wants to bring to the call.
3. **File name**: `docs/output/<today YYYY-MM-DD>-<topic>.md`. If it already exists, ask whether to add a suffix (`-2`) or pick another topic. Never overwrite an existing output.

## 2. Sources

- `docs/wiki/index.md`, then the pages about the topic (especially the decision on the topic, if it exists, with its `stato`; the root radar lists the open ones).
- The current feature's raw notes in `docs/raw/<feature-name>/` (not yet processed).
- For technical topics, the framework docs listed in `AGENTS.md`: cite them, don't copy.
- Never use other files in `docs/output/` as a source: outputs are snapshots, not knowledge.

If the sources say nothing useful about the topic, tell the user and stop instead of writing an empty report.

## 3. Write the report

In **Italian**, for people who did not follow the work. Suggested structure, adapt to the topic:

```md
# <Titolo>

> **Data:** YYYY-MM-DD · **Feature:** <feature-name> · **Fonti:** <wiki pages and raw notes used>

## Contesto
Why we are looking at this.

## Cosa sappiamo
Facts and constraints, with their source.

## Opzioni
For each option: what it is, pros, cons, open points.

## Proposta
Only if the sources support one; otherwise say what is missing to decide.

## Domande aperte
What needs an answer (from the call, the client, a test).
```

Write only what the sources support. Mark assumptions as such.

## 4. Commit

```bash
git add docs/output/<file>
git commit -m "docs(output): aggiungi report su <topic>" -- docs/output/<file>
```

End the commit message with the attribution line required by the session. Do not push.

## 5. Report to the user

Path of the file, sources used, open questions listed in it. Remind them: what comes out of the call goes back as a raw note in `docs/raw/<feature-name>/`.

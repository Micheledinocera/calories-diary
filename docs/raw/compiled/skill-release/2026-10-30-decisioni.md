# Decisioni — skill-release

Nuova skill `/release` (`.claude/skills/release/SKILL.md`), che esegue la procedura di `CONTRIBUTING.md`.

## Cosa c'era già

git-flow configurato (prefisso tag `v`), procedura di release scritta e provata con `v0.1.0`, `v0.1.1`, `v0.2.0`, pipeline con migrazioni e smoke test, CI su `develop` e `main`.

## Cosa mancava, e cosa si è deciso

- **Hotfix**: la `v0.1.1` è stata un hotfix ma la procedura non era scritta. Ora è in `CONTRIBUTING.md` e nella skill (`/release hotfix <versione>` apre il ramo e si ferma, `/release` sul ramo pubblica).
- **Note di rilascio**: i tag non avevano nessuna release su GitHub e il repo non ha un changelog. Si crea una GitHub Release a ogni versione, con le novità in italiano, dopo che i deploy sono riusciti. Niente file `CHANGELOG.md`.
- **Controlli prima del push**: migrazioni nuove (girano sul database prima che parta la nuova API, senza rollback automatico), variabili d'ambiente nuove da impostare su Render o Vercel, modifiche a pipeline e hosting.
- **Controlli dopo il push**: si aspetta il workflow `Deploy API` e lo stato `Vercel` del commit (l'esito del web finora non lo guardava nessuno). Se un deploy fallisce ci si ferma: niente retry o revert senza l'utente.
- **Solo l'utente avvia la skill** (`disable-model-invocation`), con conferma esplicita prima del merge su `main`, perché il push pubblica in produzione.
- La versione viene proposta dai commit dall'ultimo tag (`feat` → MINOR, altrimenti PATCH, breaking → MAJOR) e la conferma l'utente.

## Verificato

`main` non ha protezioni né ruleset, l'environment `production` ha solo il vincolo sui branch: il push diretto funziona. Il commit di `v0.2.0` ha lo stato `Vercel` a `success`.

## Stato attuale, per la prima release con la skill

Da `v0.2.0` a `develop`: 3 feature, 3 migrazioni (`condivisioni`, `pasti_preferiti`, `pasto_collegato`), nessuna variabile d'ambiente nuova. La skill non è ancora stata provata su una release vera.

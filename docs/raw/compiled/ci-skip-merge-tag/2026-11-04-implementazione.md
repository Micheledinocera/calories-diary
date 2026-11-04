# Implementazione — ci-skip-merge-tag

- `ci.yml`: i job `check` e `docker` hanno un `if` che li salta quando il push è su `develop` e il messaggio del commit di testa inizia con `Merge tag 'v` (il back-merge del tag fatto da `git flow release finish` / `hotfix finish`). Sulle PR `head_commit` non esiste, quindi la condizione non scatta mai.
- `deploy-api.yml`: stessa esclusione nel ramo `develop` dell'`if` (staging), oltre a `STAGING_ENABLED`. Su `main` non cambia nulla: il merge della release continua a pubblicare.
- Il run compare comunque nella lista di Actions, ma con i job `skipped`: non chiede un runner e non resta in coda. Toglierlo del tutto richiederebbe `[skip ci]` nel messaggio del merge, che git-flow non permette di impostare.
- I push normali su `develop` (merge delle PR) fanno ancora girare la CI.

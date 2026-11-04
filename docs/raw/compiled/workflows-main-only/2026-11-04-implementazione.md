# Implementazione — workflows-main-only

- `ci.yml`: gira sulle PR e sui push a `main`, non più su `develop`. Tolte le condizioni sul merge del tag (introdotte da ci-skip-merge-tag), ormai inutili.
- `deploy-api.yml`: gira solo sui push a `main` (più l'avvio manuale, che pubblica solo se lanciato su `main`). Tolto lo staging: niente environment `staging`, niente variabile `STAGING_ENABLED`, niente tag immagine `develop`. Tag immagine: sha del commit e `latest`.
- Il deploy non dipende dai tag: parte dal push su `main`. I tag `v<versione>` servono solo a leggere la storia.
- Skill `/release`, check 7: la CI di `develop` non esiste più. La prova è che ogni PR unita da `<last>` in poi abbia passato i check (`gh api repos/<repo>/commits/<sha>/pulls` → `gh pr checks <n>`); il codice messo insieme lo verificano i check locali dello step 5.
- Resta su `develop` solo il backup schedulato (`backup-db.yml`): i workflow `schedule` girano sempre sul branch di default del repo, che è `develop`. Non usa il codice del branch.

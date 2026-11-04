# Obiettivo — ci-skip-merge-tag

Evitare che CI e Deploy API partano sul commit "Merge tag 'v…' into develop" creato da `git flow release finish` / `hotfix finish`: è codice già verificato su `main`, e il run ridondante intasa Actions durante la release.

## Contesto

- Release v0.4.0 del 2026-11-04 annullata con rollback completo (force-push di `main` a `3316e73` e di `develop` a `ca12c66`, tag `v0.4.0` cancellato): durante un incidente di GitHub Actions i run restavano in coda o "in corso" anche a passi finiti, e il push della release ne ha accodati altri (CI su `main` e su `develop`, Deploy API su entrambi).
- Il run su `develop` del back-merge del tag non serve: il codice è lo stesso appena verificato su `main`, e il Deploy API su `develop` viene comunque saltato (staging spento).
- La skill `/release` per ora resta com'è (attesa con `gh run watch`): si valuta dopo la prossima release.

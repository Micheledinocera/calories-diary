---
tipo: decisione
stato: presa
aggiornato: 2026-11-04
fonti:
  - raw/compiled/deploy/2026-10-26-roadmap.md
  - raw/compiled/ui-tweaks/2026-10-27-decisioni.md
  - raw/compiled/ui-tweaks/2026-10-27-task.md
  - raw/compiled/workflows-main-only/2026-11-04-obiettivo.md
---

# Scelte di deploy

Come è fatto il [deploy](./deploy.md). Confermate dall'utente il 2026-10-26.

## Decisione

- **Immagine dell'API pubblica su GHCR**, non privata con token.
- **Domini gratuiti** (`*.vercel.app`, `*.onrender.com`), niente dominio custom per la `v0.1.0`.
- **Backup**: dump notturno cifrato con age, artifact di GitHub Actions con retention di 90 giorni.
- **Chiamate dirette dal web all'API**, con CORS, invece di un rewrite `/api` su Vercel.
- **Niente staging**: non è nemmeno predisposto nei workflow.
- **Deploy solo da `main`**, cioè quando si chiude una release o un hotfix: niente build Vercel su `develop`, feature e PR. Tutto il resto si prova in locale.
- **Niente workflow su `develop`**: né CI né deploy. La CI gira sulle PR e su `main`. I tag `v<versione>` servono solo a leggere la storia: il deploy parte dal push su `main`, non dal tag. (Prima le PR avevano una preview Vercel che puntava all'API di produzione; cambiato su richiesta dell'utente nella feature `ui-tweaks`.)

## Perché

- GHCR pubblico: il repo è già pubblico e l'immagine non contiene segreti; Render la scarica senza credenziali, quindi niente token da ruotare.
- Backup: il restore di Neon Free copre solo le ultime 6 ore. La cifratura è obbligatoria perché gli artifact di un repo pubblico sono scaricabili da qualunque account GitHub; la chiave privata resta solo al maintainer.
- Chiamate dirette: il CORS era già pronto (con wildcard per le preview). Il rewrite eviterebbe il CORS ma aggiunge un passaggio, Vercel non dichiara il timeout verso l'origine esterna (rischio con il cold start di Render) e dai progetti creati da aprile 2026 mette in cache le risposte esterne con intestazioni di cache.
- Niente staging: per un'app personale non serve, e costerebbe un secondo servizio e un branch Neon.
- Niente su `develop`: non c'è nessun ambiente collegato. La CI ripeteva i controlli già fatti sulla PR, e il deploy saltato lasciava comunque un run in coda su Actions, che durante le release le intasava.
- Solo `main`: le build degli altri branch mandavano mail di errore a ogni push e non servivano, visto che si prova tutto in locale.

## Alternative scartate

- GHCR privato con credenziali su Render: token da gestire senza un vantaggio reale.
- Rewrite `/api` su Vercel verso Render: vedi sopra.
- Affidarsi al solo restore di Neon: finestra di 6 ore, troppo corta.

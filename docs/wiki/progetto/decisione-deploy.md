---
tipo: decisione
stato: presa
aggiornato: 2026-10-26
fonti:
  - raw/compiled/deploy/2026-10-26-roadmap.md
---

# Scelte di deploy

Come è fatto il [deploy](./deploy.md). Confermate dall'utente il 2026-10-26.

## Decisione

- **Immagine dell'API pubblica su GHCR**, non privata con token.
- **Domini gratuiti** (`*.vercel.app`, `*.onrender.com`), niente dominio custom per la `v0.1.0`.
- **Backup**: dump notturno cifrato con age, artifact di GitHub Actions con retention di 90 giorni.
- **Chiamate dirette dal web all'API**, con CORS, invece di un rewrite `/api` su Vercel.
- **Staging spento**: predisposto nei workflow, le preview Vercel puntano all'API di produzione.

## Perché

- GHCR pubblico: il repo è già pubblico e l'immagine non contiene segreti; Render la scarica senza credenziali, quindi niente token da ruotare.
- Backup: il restore di Neon Free copre solo le ultime 6 ore. La cifratura è obbligatoria perché gli artifact di un repo pubblico sono scaricabili da qualunque account GitHub; la chiave privata resta solo al maintainer.
- Chiamate dirette: il CORS era già pronto (con wildcard per le preview). Il rewrite eviterebbe il CORS ma aggiunge un passaggio, Vercel non dichiara il timeout verso l'origine esterna (rischio con il cold start di Render) e dai progetti creati da aprile 2026 mette in cache le risposte esterne con intestazioni di cache.
- Staging spento: per un'app personale non serve ancora, e costerebbe un secondo servizio e un branch Neon.

## Alternative scartate

- GHCR privato con credenziali su Render: token da gestire senza un vantaggio reale.
- Rewrite `/api` su Vercel verso Render: vedi sopra.
- Affidarsi al solo restore di Neon: finestra di 6 ore, troppo corta.

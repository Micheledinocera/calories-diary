# CI solo locale — workflows-main-only

Decisione dell'utente: visto che tutti i check girano già in locale (`/close` prima di ogni PR, `/release` prima di pubblicare), non ha senso farli rifare a GitHub, così si evita il proliferare di job che si bloccano a caso.

- Tolto `.github/workflows/ci.yml`: nessuna CI su GitHub, nemmeno sulle PR.
- L'unico controllo che la CI faceva in più era la build dell'immagine Docker dell'API (`pnpm build` non la fa): ora `/release`, nello step 5, la costruisce in locale (`docker build -f apps/api/Dockerfile .`) prima di pubblicare. Altrimenti un `Dockerfile` rotto si scoprirebbe solo nel `Deploy API`, dopo il push, con il web già pubblicato da Vercel.
- Tolto da `/release` il check sui check delle PR.
- Su GitHub Actions restano solo `deploy-api.yml` (push su `main`, cioè le release) e il backup notturno.
- Limite accettato: niente installazione pulita su Linux a ogni PR; il rischio "da me funziona" è basso perché l'immagine Docker si costruisce comunque su Linux con il lockfile bloccato.

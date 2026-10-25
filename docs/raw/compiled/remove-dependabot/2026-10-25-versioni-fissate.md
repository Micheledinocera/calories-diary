# Versioni fissate, niente Dependabot

Decisione (25/10/2026): Dependabot rimosso (`.github/dependabot.yml` cancellato; i security update automatici del repo erano già disattivati). Motivo: le dipendenze sono molto interconnesse (Nuxt, moduli PWA, TypeScript/typescript-eslint/vue-tsc, MikroORM) e gli aggiornamenti singoli rompono gli allineamenti.

Cosa cambia:

- Tutti i `package.json` del monorepo usano **versioni esatte** (niente `^` o `~`). `savePrefix: ""` in `pnpm-workspace.yaml` fa sì che `pnpm add` salvi versioni esatte.
- Gli aggiornamenti si fanno **a mano, con check periodici**: si guardano le versioni nuove (`pnpm outdated -r`), si decide cosa portare dentro, a gruppi coerenti, in una feature dedicata con i check verdi.

Esempio del problema, emerso proprio con l'ultima PR di Dependabot (#2): ha portato `vite-plugin-pwa` 2.0.0 e `@vite-pwa/assets-generator` 2.0.0, ma `@vite-pwa/nuxt` 1.1.1 (ultima versione) dipende da `vite-plugin-pwa ^1.2.0` e ha come peer `@vite-pwa/assets-generator ^1.0.0`. Risultato: due copie di `vite-plugin-pwa` installate. Riportati a 1.3.0 e 1.0.4 finché `@vite-pwa/nuxt` non supporta la 2.x.

`@types/node` resta sulla 24.x, allineato al runtime (Node 24 in `.nvmrc`, `engines` e immagine Docker): la PR #3 che portava i tipi di Node 26 è stata chiusa.

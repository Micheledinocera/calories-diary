# Sviluppo da telefono e log separati

Richieste emerse provando la scansione:

- provare l'app dal telefono (la fotocamera ha senso lì);
- `pnpm dev` lasciava processi appesi: bisognava riavviare il terminale più volte per liberare le porte;
- avere i log di front-end e back-end separati, con un selettore come in Mercur (che usa la TUI di Turborepo).

## Cosa è cambiato

- **Turborepo** (`turbo` 2.11.10, solo per `dev`): `turbo.json` con `ui: "tui"`. Un pannello per processo, frecce per cambiare, `i` per interagire, Ctrl+C chiude tutto. Gli altri script (`build`, `test`, `typecheck`) restano `pnpm -r`.
- **`scripts/dev.mjs`**: `pnpm dev` e `pnpm dev:https` lanciano turbo con `node node_modules/turbo/bin/turbo`, non con `turbo` nello script. Su Windows pnpm esegue gli script con `cmd /c` e `turbo` diventa `node_modules/.bin/turbo.cmd`: a Ctrl+C cmd chiede "Terminare il processo batch (S/N)?" e il terminale resta appeso. Il wrapper Node di turbo gestisce già il Ctrl+C su Windows.
- **`scripts/ferma-dev.mjs`** (`pnpm dev:stop`, e in testa a `pnpm dev`/`dev:https`): chiude i processi di sviluppo del repo rimasti vivi (turbo, nuxt dev, tsx watch, tsc --watch), riconosciuti dalla riga di comando che contiene il percorso del repo. Su Windows `taskkill /T /F`. Verificato: un kill brusco del terminale (non Ctrl+C) lascia vivi tutti i figli, sia con `pnpm --parallel` sia con turbo.
- **Proxy API in sviluppo**: in `nuxt.config.ts` (`$development`) `apiBase` è `/api` e `nitro.devProxy` inoltra `/api/*` a `http://localhost:3001` (prefisso tolto). Il web parla con la propria origine: niente CORS in sviluppo e il telefono raggiunge l'API attraverso Nuxt. `NUXT_PUBLIC_API_BASE` nel `.env` del web va lasciato commentato in sviluppo, serve per la build.
- **Web sempre esposto in rete**: `nuxt dev --port 3000 --host 0.0.0.0`, quindi dal telefono si apre `http://<ip-del-pc>:3000`. Nuxt avvisa che il dev server è raggiungibile senza autenticazione da chi è sulla stessa rete: accettato per la rete di casa.
- **`pnpm dev:https`**: task turbo `@calories-diary/web#dev:https` (`--host 0.0.0.0 --https`) con `with` su `api#dev` e `shared#dev`. Serve solo per la fotocamera: `getUserMedia` richiede un contesto sicuro e `http://<ip-lan>` non lo è. Certificato autofirmato (senza `mkcert` installato): sul telefono va accettato l'avviso.
- Attenzione: `--host --https` non funziona, Nuxt prende `--https` come valore di `--host`.

## Perché da telefono non si vedeva niente

Nuxt ascoltava solo su `localhost` (`::1`). Il firewall di Windows non c'entra: rete "Pubblica" con regole in ingresso per Node.js che consentono.

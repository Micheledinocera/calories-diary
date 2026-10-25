# `bun dev` non si ferma con Ctrl+C

- Problema segnalato dall'utente: lanciando `bun dev` da Git Bash, Ctrl+C non chiude il processo e il terminale resta bloccato.
- Prova (Ctrl+C reale inviato alla console): con `pnpm dev` e con `bun dev` da cmd tutto si chiude; con `bun dev` da Git Bash i server si fermano ma `bun.exe` resta appeso. Il problema è di bun sotto Git Bash, non del nostro codice; `pnpm dev` da Git Bash si chiude correttamente.
- Soluzione: lo script `dev` della root parte con `scripts/solo-pnpm.mjs`, che controlla `npm_config_user_agent` e, se non è pnpm, si ferma con il messaggio `Questo repo usa pnpm, non bun: lancia "pnpm dev".`
- Se restano processi appesi su Windows: `taskkill /PID <pid> /T /F` (cercando chi ascolta sulle porte 3000/3001).

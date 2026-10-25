// Starts a turbo dev task (`node scripts/dev.mjs <task>`) without the .cmd shim of node_modules/.bin:
// on Windows Ctrl+C on a .cmd asks "Terminare il processo batch (S/N)?" and leaves the terminal stuck.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

await import("./solo-pnpm.mjs");
await import("./ferma-dev.mjs");

const turbo = createRequire(import.meta.url).resolve("turbo");
const figlio = spawn(process.execPath, [turbo, "run", process.argv[2] ?? "dev"], {
  stdio: "inherit",
});

// Ctrl+C reaches turbo too: it stops the tasks and exits, then we exit with its code.
process.on("SIGINT", () => {});
figlio.on("exit", (code) => process.exit(code ?? 1));

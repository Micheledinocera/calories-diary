import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";

/**
 * Reads a password without echoing it. Without a TTY (e.g. `echo pw | pnpm utente:crea ...`)
 * it reads the first line of stdin.
 */
export async function chiediPassword(domanda: string): Promise<string> {
  if (!process.stdin.isTTY) {
    let testo = "";
    for await (const parte of process.stdin) testo += parte;
    return testo.split(/\r?\n/)[0] ?? "";
  }
  process.stdout.write(domanda);
  // Output muted: readline writes the typed characters to a sink.
  const muto = new Writable({ write: (_c, _e, done) => done() });
  const rl = createInterface({ input: process.stdin, output: muto, terminal: true });
  try {
    return await rl.question("");
  } finally {
    rl.close();
    process.stdout.write("\n");
  }
}

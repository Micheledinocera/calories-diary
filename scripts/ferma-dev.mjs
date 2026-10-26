// Kills the dev processes of this repo left running by a terminal that died without Ctrl+C
// (turbo, nuxt dev, tsx watch, tsc --watch): they keep ports 3000/3001 busy.
// `pnpm dev` runs it before starting; `pnpm dev:stop` runs it alone.
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const radice = fileURLToPath(new URL("..", import.meta.url))
  .replace(/[\\/]$/, "")
  .toLowerCase();
const windows = process.platform === "win32";
const sep = String.raw`[\\/]`;
const daFermare = new RegExp(
  [
    `${sep}turbo${sep}`,
    `${sep}nuxt${sep}bin${sep}`,
    `@nuxt${sep}cli${sep}dist${sep}dev${sep}`,
    `${sep}tsx${sep}dist${sep}`,
    `${sep}typescript${sep}bin${sep}tsc.*--watch`,
  ].join("|"),
  "i",
);

function processi() {
  if (windows) {
    const json = execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        "Get-CimInstance Win32_Process | Where-Object CommandLine | Select-Object ProcessId,CommandLine | ConvertTo-Json -Compress",
      ],
      { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
    );
    const righe = JSON.parse(json || "[]");
    return (Array.isArray(righe) ? righe : [righe]).map((r) => ({
      pid: r.ProcessId,
      comando: r.CommandLine,
    }));
  }
  return execFileSync("ps", ["-eo", "pid=,args="], { encoding: "utf8" })
    .split("\n")
    .map((r) => r.trim().match(/^(\d+)\s+(.*)$/))
    .filter(Boolean)
    .map(([, pid, comando]) => ({ pid: Number(pid), comando }));
}

const esclusi = new Set([process.pid, process.ppid]);
const trovati = processi().filter(
  ({ pid, comando }) =>
    !esclusi.has(pid) &&
    comando.replaceAll("/", "\\").toLowerCase().includes(radice.replaceAll("/", "\\")) &&
    daFermare.test(comando),
);

for (const { pid } of trovati) {
  try {
    if (windows) execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
    else process.kill(pid, "SIGTERM");
  } catch {
    // Already gone, e.g. killed with its parent's tree.
  }
}

if (trovati.length > 0)
  console.log(`Fermati ${trovati.length} processi di sviluppo rimasti appesi.`);

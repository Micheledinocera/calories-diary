// Stops a root script launched with another package manager (e.g. `bun dev`).
// Under Git Bash, bun does not exit on Ctrl+C and leaves the terminal stuck.
const agente = process.env.npm_config_user_agent ?? "";

if (!agente.startsWith("pnpm/")) {
  const gestore = agente.split("/")[0] || "un altro gestore";
  console.error(`Questo repo usa pnpm, non ${gestore}: lancia "pnpm ${process.argv[2] ?? "dev"}".`);
  process.exit(1);
}

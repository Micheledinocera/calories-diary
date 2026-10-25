import { z } from "zod";

const vuotoComeAssente = (v: unknown) => (v === "" ? undefined : v);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.url(),
  DATABASE_URL_DIRECT: z.preprocess(vuotoComeAssente, z.url().optional()),
  REDIS_URL: z.url(),
  REDIS_PREFIX: z.string().min(1).default("calories-diary:dev:"),
  CORS_ORIGINS: z
    .string()
    .default("")
    .transform((v) =>
      v
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean),
    ),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  APP_VERSION: z.preprocess(vuotoComeAssente, z.string().default("dev")),
});

export type Env = z.infer<typeof envSchema>;

export class EnvNonValidaError extends Error {
  constructor(error: z.ZodError) {
    const righe = error.issues.map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`);
    super(`Variabili d'ambiente non valide:\n${righe.join("\n")}`);
    this.name = "EnvNonValidaError";
  }
}

export function caricaEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) throw new EnvNonValidaError(result.error);
  return result.data;
}

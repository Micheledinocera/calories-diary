import { pino, type Logger } from "pino";
import type { Env } from "../config/env.js";

export function creaLogger(env: Pick<Env, "LOG_LEVEL" | "NODE_ENV">): Logger {
  return pino({
    level: env.LOG_LEVEL,
    ...(env.NODE_ENV === "development" && {
      transport: { target: "pino-pretty", options: { colorize: true } },
    }),
  });
}

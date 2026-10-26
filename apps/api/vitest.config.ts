import { defineConfig } from "vitest/config";

// Tests run against the services of docker-compose.yml (CI: service containers), on a dedicated database.
const envTest = {
  NODE_ENV: "test",
  DATABASE_URL:
    process.env.DATABASE_URL_TEST ??
    "postgres://calories:calories@localhost:5432/calories_diary_test",
  REDIS_URL: process.env.REDIS_URL_TEST ?? "redis://localhost:6379",
  REDIS_PREFIX: "calories-diary:test:",
  LOG_LEVEL: "silent",
  JWT_SECRET: "segreto-dei-test-lungo-almeno-32-caratteri",
  // The tests use a fake provider: Open Food Facts is never called.
  OFF_CONTATTO: "test@esempio.it",
};

// test.env reaches only the test workers: globalSetup runs in this process.
Object.assign(process.env, envTest);

export default defineConfig({
  test: {
    environment: "node",
    globalSetup: ["./test/global-setup.ts"],
    env: envTest,
  },
});

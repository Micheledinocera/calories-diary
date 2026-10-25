import { defineConfig } from "vitest/config";

// Unit tests for pure code (app/utils). Component tests will need @nuxt/test-utils.
export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});

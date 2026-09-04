import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The simulation core is deliberately DOM-free, so the fast node
    // environment is enough; rendering and input are covered by Playwright.
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      // Pure wiring and canvas drawing; exercised by the Playwright suite.
      exclude: ["src/main.ts", "src/render/**"],
    },
  },
});

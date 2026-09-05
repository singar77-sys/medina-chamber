import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    // scripts/ too: the nightly scrapers rewrite src/data/*.json, so their
    // shared transforms need regression cover like anything else.
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
    setupFiles: [],
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});

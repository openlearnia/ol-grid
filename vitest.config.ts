import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  resolve: {
    alias: {
      "@ol-grid/core": path.join(root, "packages/core/src/index.ts"),
      "@ol-grid/sort": path.join(root, "packages/sort/src/index.ts"),
      "@ol-grid/filter": path.join(root, "packages/filter/src/index.ts"),
      "@ol-grid/dom-renderer": path.join(root, "packages/dom-renderer/src/index.ts"),
      "@ol-grid/react": path.join(root, "packages/react/src/index.ts"),
      "@ol-grid/vanilla": path.join(root, "packages/vanilla/src/index.ts"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    include: ["packages/**/src/**/*.test.{ts,tsx}"],
    environmentMatchGlobs: [
      ["packages/dom-renderer/**/*.test.ts", "happy-dom"],
      ["packages/core/src/engine/grid-engine*.test.ts", "happy-dom"],
      ["packages/react/**/*.test.{ts,tsx}", "happy-dom"],
    ],
  },
});

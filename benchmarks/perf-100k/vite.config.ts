import { defineConfig } from "vite";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const perfDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: perfDir,
  build: {
    outDir: join(perfDir, "dist"),
    emptyOutDir: true,
  },
});

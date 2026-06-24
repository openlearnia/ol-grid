import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/engine-setup.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
  external: ["svelte", "@ol-grid/core", "@ol-grid/dom-renderer", "@ol-grid/sort", "@ol-grid/filter"],
});

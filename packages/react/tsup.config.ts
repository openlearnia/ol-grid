import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
  external: ["react", "react-dom", "react/jsx-runtime", "@ol-grid/core", "@ol-grid/dom-renderer"],
  banner: {
    js: '"use client";',
  },
});

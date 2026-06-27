import { build } from "tsup";
import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(scriptDir, "..");

const shared = {
  format: ["esm"],
  sourcemap: true,
  target: "es2022",
  dts: true,
};

async function patchAdapterImports(fileName) {
  const filePath = resolve(pkgRoot, fileName);
  const file = await readFile(filePath, "utf8");
  const updated = file.replace(/\.\.\/(index|utils)(?=['"])/g, "../$1.js");
  await writeFile(filePath, updated, "utf8");
}

process.chdir(pkgRoot);

await build({
  ...shared,
  entry: ["src/index.ts"],
  clean: true,
  outDir: "dist",
});

for (const adapter of ["react", "vue", "solid"]) {
  await build({
    ...shared,
    entry: [`src/${adapter}/index.ts`],
    outDir: `dist/${adapter}`,
    external: [
      adapter === "react" ? "react" : adapter === "vue" ? "vue" : "solid-js",
      "../index",
      "../utils",
    ],
  });

  await patchAdapterImports(`dist/${adapter}/index.js`);
}

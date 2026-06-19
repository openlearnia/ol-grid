import { gzipSync } from "node:zlib";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const BUDGET_KB = 80;

const bundles = [
  { name: "@ol-grid/core", path: "packages/core/dist/index.js" },
  { name: "@ol-grid/dom-renderer", path: "packages/dom-renderer/dist/index.js" },
  { name: "@ol-grid/react", path: "packages/react/dist/index.js" },
];

function gzipSize(content) {
  return gzipSync(content).length;
}

let total = 0;

console.log("ol-grid bundle size gate (gzip)\n");

for (const bundle of bundles) {
  const filePath = join(root, bundle.path);
  if (!existsSync(filePath)) {
    console.error(`Missing build output: ${bundle.path}`);
    console.error("Run `pnpm build` before bundle-size check.");
    process.exit(1);
  }

  const source = readFileSync(filePath);
  const gzipped = gzipSize(source);
  total += gzipped;
  console.log(`${bundle.name}: ${(gzipped / 1024).toFixed(2)} KB`);
}

console.log(`\nTotal (core + dom-renderer + react): ${(total / 1024).toFixed(2)} KB`);
console.log(`Budget: ${BUDGET_KB} KB gzip\n`);

if (total > BUDGET_KB * 1024) {
  console.error(`Bundle size gate failed: ${(total / 1024).toFixed(2)} KB > ${BUDGET_KB} KB`);
  process.exit(1);
}

console.log("Bundle size gate passed.");

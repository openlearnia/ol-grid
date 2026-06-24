import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, "..", "dist");
mkdirSync(dist, { recursive: true });
copyFileSync(join(root, "..", "src", "OlGrid.svelte"), join(dist, "OlGrid.svelte"));

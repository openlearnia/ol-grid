import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baselinesDir = path.join(pkgRoot, "baselines");
const manifestPath = path.join(baselinesDir, "manifest.json");

describe("visual regression baseline manifest", () => {
  it("manifest.json lists scenarios with PNG baselines on disk", () => {
    expect(existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      scenarios: Array<{ name: string }>;
    };

    expect(manifest.scenarios.length).toBeGreaterThan(0);
    for (const scenario of manifest.scenarios) {
      const pngPath = path.join(baselinesDir, `${scenario.name}.png`);
      expect(existsSync(pngPath), `missing baseline ${scenario.name}.png`).toBe(true);
    }
  });
});

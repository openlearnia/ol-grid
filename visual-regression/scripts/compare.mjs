import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baselinesDir = path.join(pkgRoot, "baselines");

const MAX_DIFF_PIXELS = 120;
const MAX_DIFF_RATIO = 0.002;

export async function comparePng(actualBuffer, baselineName) {
  const baselinePath = path.join(baselinesDir, `${baselineName}.png`);
  const expectedBuffer = await readFile(baselinePath);
  const actual = PNG.sync.read(actualBuffer);
  const expected = PNG.sync.read(expectedBuffer);

  if (actual.width !== expected.width || actual.height !== expected.height) {
    return {
      ok: false,
      reason: `size mismatch: actual ${actual.width}x${actual.height}, expected ${expected.width}x${expected.height}`,
      diffPixels: Number.POSITIVE_INFINITY,
    };
  }

  const diff = new PNG({ width: actual.width, height: actual.height });
  const diffPixels = pixelmatch(actual.data, expected.data, diff.data, actual.width, actual.height, {
    threshold: 0.1,
  });
  const ratio = diffPixels / (actual.width * actual.height);

  if (diffPixels > MAX_DIFF_PIXELS && ratio > MAX_DIFF_RATIO) {
    return {
      ok: false,
      reason: `${diffPixels} pixels differ (${(ratio * 100).toFixed(3)}%)`,
      diffPixels,
      ratio,
    };
  }

  return { ok: true, diffPixels, ratio };
}

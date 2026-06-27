#!/usr/bin/env node
/**
 * Capture PNG baselines from the built React demo (NFR-Q-03 MVP).
 * Usage: pnpm --filter @ol-grid/visual-regression run capture
 */
import { spawn, spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(pkgRoot, "../..");
const baselinesDir = path.join(pkgRoot, "baselines");
const manifestPath = path.join(baselinesDir, "manifest.json");
const PREVIEW_PORT = 4321;
const PREVIEW_URL = `http://127.0.0.1:${PREVIEW_PORT}`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runPnpm(args) {
  const result = spawnSync("pnpm", args, {
    cwd: repoRoot,
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(`pnpm ${args.join(" ")} failed with status ${result.status ?? "unknown"}`);
  }
}

async function waitForServer(url, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // retry
    }
    await sleep(250);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function startPreview() {
  runPnpm(["--filter", "@ol-grid/react...", "run", "build"]);
  runPnpm(["--filter", "@ol-grid/example-react", "run", "build"]);

  const proc = spawn(
    "pnpm",
    [
      "--filter",
      "@ol-grid/example-react",
      "exec",
      "vite",
      "preview",
      "--port",
      String(PREVIEW_PORT),
      "--strictPort",
      "--host",
      "127.0.0.1",
    ],
    { cwd: repoRoot, stdio: "pipe", env: process.env },
  );

  proc.stdout?.on("data", (chunk) => process.stdout.write(chunk));
  proc.stderr?.on("data", (chunk) => process.stderr.write(chunk));
  return proc;
}

async function configureDemo(page, { dataset, theme }) {
  await page.goto(PREVIEW_URL, { waitUntil: "networkidle0" });
  await page.waitForSelector('[data-testid="demo-dataset-select"]');
  await page.select('[data-testid="demo-dataset-select"]', dataset);
  await page.select('[data-testid="demo-theme-select"]', theme);
  await page.waitForSelector('[data-testid="ol-grid"]');
  await page.evaluate(() =>
    new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  await sleep(150);
}

async function captureScenario(page, scenario) {
  await configureDemo(page, scenario);

  if (scenario.clip === "header") {
    await page.waitForSelector(scenario.selector);
    const grid = await page.$('[data-testid="ol-grid"]');
    if (!grid) throw new Error("Grid element not found for header clip");
    const box = await grid.boundingBox();
    if (!box) throw new Error("Grid bounding box unavailable");
    return page.screenshot({
      type: "png",
      clip: { x: box.x, y: box.y, width: box.width, height: Math.min(box.height, 96) },
    });
  }

  const target = await page.$(scenario.selector ?? '[data-testid="ol-grid"]');
  if (!target) throw new Error(`Selector not found: ${scenario.selector}`);
  return target.screenshot({ type: "png" });
}

async function main() {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  await mkdir(baselinesDir, { recursive: true });

  const preview = startPreview();
  let browser;

  try {
    await waitForServer(PREVIEW_URL);
    browser = await puppeteer.launch({
      headless: true,
      defaultViewport: manifest.viewport ?? { width: 1280, height: 720 },
      args: ["--font-render-hinting=none"],
    });
    const page = await browser.newPage();
    await page.emulateMediaFeatures([
      { name: "prefers-color-scheme", value: "light" },
    ]);

    for (const scenario of manifest.scenarios) {
      process.stdout.write(`Capturing ${scenario.name}.png…\n`);
      const png = await captureScenario(page, scenario);
      await writeFile(path.join(baselinesDir, `${scenario.name}.png`), png);
    }

    process.stdout.write(`Saved ${manifest.scenarios.length} baseline(s) to ${baselinesDir}\n`);
  } finally {
    await browser?.close();
    preview.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

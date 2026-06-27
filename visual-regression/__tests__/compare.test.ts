import { spawn, spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { comparePng } from "../scripts/compare.mjs";

const runVisual = process.env.VISUAL_REGRESSION === "1";
const describeVisual = runVisual ? describe : describe.skip;

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(pkgRoot, "../..");
const baselinesDir = path.join(pkgRoot, "baselines");
const manifestPath = path.join(baselinesDir, "manifest.json");
const PREVIEW_PORT = 4322;
const PREVIEW_URL = `http://127.0.0.1:${PREVIEW_PORT}`;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url: string, timeoutMs = 60_000) {
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

describeVisual("visual regression compare (React demo)", () => {
  let preview: ReturnType<typeof spawn> | undefined;
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;

  beforeAll(async () => {
    const buildReact = spawnSync(
      "pnpm",
      ["--filter", "@ol-grid/example-react", "run", "build"],
      { cwd: repoRoot, stdio: "inherit", env: process.env },
    );
    if (buildReact.status !== 0) {
      throw new Error("React demo build failed");
    }

    preview = spawn(
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

    await waitForServer(PREVIEW_URL);
    browser = await puppeteer.launch({
      headless: true,
      defaultViewport: { width: 1280, height: 720 },
      args: ["--font-render-hinting=none"],
    });
  }, 120_000);

  afterAll(async () => {
    await browser?.close();
    preview?.kill("SIGTERM");
  });

  it("matches committed PNG baselines", async () => {
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
      scenarios: Array<{
        name: string;
        dataset: string;
        theme: string;
        selector?: string;
        clip?: string;
      }>;
    };

    const page = await browser!.newPage();
    await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);

    for (const scenario of manifest.scenarios) {
      await page.goto(PREVIEW_URL, { waitUntil: "networkidle0" });
      await page.waitForSelector('[data-testid="demo-dataset-select"]');
      await page.select('[data-testid="demo-dataset-select"]', scenario.dataset);
      await page.select('[data-testid="demo-theme-select"]', scenario.theme);
      await page.waitForSelector('[data-testid="ol-grid"]');
      await page.evaluate(() =>
        new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
      );
      await sleep(150);

      let png: Buffer;
      if (scenario.clip === "header") {
        await page.waitForSelector(scenario.selector ?? '[data-testid="ol-grid-header-group-organization"]');
        const grid = await page.$('[data-testid="ol-grid"]');
        const box = await grid!.boundingBox();
        png = (await page.screenshot({
          type: "png",
          clip: { x: box!.x, y: box!.y, width: box!.width, height: Math.min(box!.height, 96) },
        })) as Buffer;
      } else {
        const target = await page.$(scenario.selector ?? '[data-testid="ol-grid"]');
        png = (await target!.screenshot({ type: "png" })) as Buffer;
      }

      const result = await comparePng(png, scenario.name);
      expect(result.ok, result.reason).toBe(true);
    }
  }, 120_000);
});

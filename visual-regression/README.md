# Visual regression (NFR-Q-03)

MVP baseline screenshots for the default ol-grid theme, captured from `@ol-grid/example-react`.

## Baselines

| File | Scenario |
|------|----------|
| `baselines/react-grid-light.png` | Employees tiny dataset, light theme, full grid |
| `baselines/react-grid-dark.png` | Employees tiny dataset, dark theme, full grid |
| `baselines/react-grouped-headers.png` | Grouped headers (Organization / Timeline), header clip |

Manifest: `baselines/manifest.json`

## Commands

```bash
# Install deps (from repo root)
pnpm install

# Capture / refresh baselines (builds React demo + Puppeteer screenshots)
pnpm --filter @ol-grid/visual-regression run capture

# Compare against baselines (opt-in; downloads Chromium via Puppeteer)
VISUAL_REGRESSION=1 pnpm --filter @ol-grid/visual-regression run compare

# Default unit test run checks baseline files exist (no browser)
pnpm test
```

## CI (later)

Suggested gate (not wired yet):

1. Build `@ol-grid/example-react`
2. Run `VISUAL_REGRESSION=1 pnpm --filter @ol-grid/visual-regression run compare` on `ubuntu-latest`
3. Optionally run on `pull_request` label `visual` or nightly only (NFR-Q-03)

## OLTestStack alternative

For agent-driven capture/replay without Puppeteer in CI, use the replay script in `olteststack/capture-baselines.olteststack.json` with OLTestStack MCP `test_run`:

```json
{
  "goal": "Capture ol-grid React demo visual baselines",
  "suiteFile": "visual-regression/olteststack/capture-baselines.olteststack.json"
}
```

Steps navigate to the preview URL, select dataset/theme via `data-testid`, wait for `[data-testid="ol-grid"]`, and take screenshots. Compare PNGs locally or promote to committed baselines after review.

Stable selectors live in `@ol-grid/dom-renderer` (`packages/dom-renderer/src/test-ids.ts`).

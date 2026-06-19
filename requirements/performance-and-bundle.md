# Feature: Performance & Bundle Size

> **Status:** Draft  
> **Tier:** T1 (baseline NFRs); T2 (expanded budgets); T3 (scale tier)  
> **Package(s):** All `@ol-grid/*` packages; `benchmarks/` workspace  
> **Parent:** [REQUIREMENTS.md](../REQUIREMENTS.md) §4.1.6, §5.1, §5.2, NFR-P-*, NFR-B-*  
> **Architecture:** [ARCHITECTURE.md](../ARCHITECTURE.md) §5.3, §6, §7.5  
> **Last updated:** 2026-06-18

---

## 1. Summary

This document defines **non-functional requirements (NFRs)**, measurable **performance targets**, **bundle size budgets**, and the **benchmark methodology** for ol-grid. Performance and bundle discipline are product differentiators: ol-grid MUST deliver AG Grid Community–class features at materially smaller gzip sizes and meet 60 fps virtualization targets. All targets are tier-gated and enforced via CI where practical.

## 2. Goals

| ID | Goal |
|----|------|
| G-01 | Maintain 60 fps scroll virtualization for 100k+ rows on DOM renderer (Tier 1) |
| G-02 | Keep Tier 1 minimal app bundle ≤ 80 KB gzip |
| G-03 | Keep full Tier 2 feature set ≤ 150 KB gzip without Tier 3 modules |
| G-04 | Bound DOM node count to viewport × overscan, not total data size |
| G-05 | Publish reproducible benchmarks comparing AG Grid, TanStack Table + Virtual |
| G-06 | Prevent bundle regressions via CI gates on reference applications |

## 3. Non-Goals

| Item | Rationale |
|------|-----------|
| Beating Glide Data Grid on 1M-row canvas benchmarks in Tier 1 | Canvas is Tier 3 opt-in |
| Performance on IE11 or legacy browsers | ES2022 evergreen only |
| Benchmarking every patch release in CI | Nightly / release gate initially |
| Mobile 60 fps as hard gate v1 | Desktop-first; touch scroll Should |

## 4. Performance NFRs

### 4.1 Scroll & render (DOM renderer)

| ID | Requirement | Target | Tier | Measurement |
|----|-------------|--------|------|-------------|
| NFR-P-01 | Virtual scroll frame time | ≤ 16.7 ms (60 fps) p95 | T1 | 100k rows × 50 cols, mid-range laptop |
| NFR-P-02 | Virtual scroll frame time (Tier 1 baseline) | ≤ 16.7 ms p95 | T1 | 100k rows × 20 cols |
| NFR-P-03 | Initial render | ≤ 100 ms | T1 | 1k rows × 10 cols, cold mount |
| NFR-P-04 | Initial render (large) | ≤ 300 ms | T2 | 10k rows × 20 cols |
| NFR-P-05 | Cell recycle on scroll | ≤ 16 ms total mount/unmount | T1 | Per frame budget |
| NFR-P-06 | No layout thrash during scroll | 0 forced sync layouts per scroll frame | T1 | DevTools verification |
| NFR-P-07 | Positioning strategy | `transform: translateY/X` preferred over top/left | T1 | Code review + trace |
| NFR-P-08 | `content-visibility: auto` | Progressive enhancement on rows | Should | T2 |

### 4.2 Scroll & render (canvas renderer)

| ID | Requirement | Target | Tier | Measurement |
|----|-------------|--------|------|-------------|
| NFR-P-10 | Canvas scroll frame time | ≤ 16.7 ms p95 | T3 | 1M rows × 20 cols, read-only |
| NFR-P-11 | Damage rect repaint | Only changed regions on scroll | T3 | Profiling |
| NFR-P-12 | Text measurement | Cached (`measureTextCached` pattern) | T3 | No per-cell measure per frame |

### 4.3 Data operations

| ID | Requirement | Target | Tier | Measurement |
|----|-------------|--------|------|-------------|
| NFR-P-20 | Sort 100k CSRM rows | ≤ 200 ms main thread | T2 | Single column sort |
| NFR-P-21 | Sort 100k CSRM (worker path) | ≤ 100 ms perceived (async) | T3 | Web Worker module |
| NFR-P-22 | Filter 100k CSRM rows | ≤ 200 ms main thread | T2 | Text filter all columns |
| NFR-P-23 | `applyTransaction` 1k row update | ≤ 50 ms | T2 | Incremental update |
| NFR-P-24 | Full `rowData` replace 10k rows | ≤ 100 ms | T2 | Reconciliation |
| NFR-P-25 | Column virtualisation | 60 fps with 500+ columns | T3 | Horizontal scroll |

### 4.4 Memory

| ID | Requirement | Target | Tier | Measurement |
|----|-------------|--------|------|-------------|
| NFR-P-30 | DOM node count | O(visible rows × visible cols × overscan) | T1 | Not O(total rows) |
| NFR-P-31 | Infinite row model cache | Bounded by `maxBlocksInCache × blockSize` | T2 | Configurable |
| NFR-P-32 | SSRM sparse store | O(loaded rows), not O(server row count) | T3 | Memory profiler |
| NFR-P-33 | Leak-free mount/unmount | 0 detached nodes after 100 cycles | T1 | Integration test |
| NFR-P-34 | React portal pool | Portals ≤ visible cells + buffer | T1 | Adapter test |

### 4.5 API & event overhead

| ID | Requirement | Target | Tier |
|----|-------------|--------|------|
| NFR-P-40 | Sync `GridApi` call | < 0.1 ms median | T1 |
| NFR-P-41 | Event dispatch (10 listeners) | < 1 ms | T1 |
| NFR-P-42 | Store subscription notification | < 0.5 ms per subscriber | T1 |
| NFR-P-43 | `Virtualizer.computeVisibleRange` | < 1 ms for 1M rows (fixed height) | T1 |

## 5. Bundle Size Budgets

### 5.1 Package-level gzip budgets (production build, esbuild rollup)

| Package | Budget (gzip) | Tier | Notes |
|---------|---------------|------|-------|
| `@ol-grid/core` | ≤ 40 KB | T1 | Zero runtime deps |
| `@ol-grid/dom-renderer` | ≤ 25 KB | T1 | Excl. theme CSS |
| `@ol-grid/sort` | ≤ 8 KB | T1 | |
| `@ol-grid/react` | ≤ 5 KB | T1 | Adapter only |
| `@ol-grid/vanilla` | ≤ 3 KB | T1 | |
| `@ol-grid/filter` | ≤ 15 KB | T2 | |
| `@ol-grid/editing` | ≤ 12 KB | T2 | |
| `@ol-grid/pagination` | ≤ 6 KB | T2 | |
| `@ol-grid/vue` | ≤ 5 KB | T2 | |
| `@ol-grid/svelte` | ≤ 5 KB | T2 | |
| `@ol-grid/grouping` | ≤ 20 KB | T3 | |
| `@ol-grid/clipboard` | ≤ 10 KB | T3 | |
| `@ol-grid/context-menu` | ≤ 12 KB | T3 | |
| `@ol-grid/tool-panels` | ≤ 20 KB | T3 | |
| `@ol-grid/canvas-renderer` | ≤ 30 KB | T3 | |
| `@ol-grid/themes/default` (CSS) | ≤ 8 KB | T1 | `sideEffects: ["*.css"]` |

*All figures are **incremental** gzip contribution when tree-shaken into an app.*

### 5.2 Reference application bundles

| Profile | Packages included | Budget (gzip) | Tier |
|---------|-------------------|---------------|------|
| **Minimal** | core + dom-renderer + sort + react | ≤ 80 KB | T1 |
| **Community** | Minimal + filter + editing + pagination + themes | ≤ 150 KB | T2 |
| **Enterprise data** | Community + grouping + clipboard + context-menu + tool-panels | ≤ 220 KB | T3 |
| **Canvas scale** | core + canvas-renderer + sort (read-only) | ≤ 90 KB | T3 |

**Comparison baseline (indicative, not a hard gate):**

| Library | Typical gzip (comparable features) |
|---------|-----------------------------------|
| AG Grid Community + React | ~330 KB+ |
| TanStack Table + Virtual + custom UI | ~15–40 KB (incomplete grid UX) |
| MUI Data Grid Community | ~120 KB |
| **ol-grid Community profile** | **≤ 150 KB target** |

### 5.3 Tree-shaking requirements

| ID | Requirement | Tier |
|----|-------------|------|
| NFR-B-01 | `@ol-grid/core` zero third-party runtime dependencies | T1 |
| NFR-B-02 | All JS packages: `"sideEffects": false` | T1 |
| NFR-B-03 | CSS packages: `"sideEffects": ["*.css"]` only | T1 |
| NFR-B-04 | Feature modules are separate entry points | T1 |
| NFR-B-05 | Named exports only — no default exports | T1 |
| NFR-B-06 | ESM-first with dual CJS | T1 |
| NFR-B-07 | `publint` + `@arethetypeswrong/cli` pass in CI | T1 |
| NFR-B-08 | Unused feature module code eliminated when not imported | T1 |
| NFR-B-09 | No dynamic `require()` of optional features in core | T1 |

## 6. Benchmark Suite

### 6.1 Location & tooling

```
benchmarks/
├── package.json
├── src/
│   ├── scroll-fps.ts
│   ├── initial-render.ts
│   ├── sort-throughput.ts
│   └── bundle-size.ts
├── datasets/
│   ├── 1k-x-10.json
│   ├── 100k-x-20.json
│   └── 1m-x-20.json (generated)
└── README.md
```

- **Runner:** Node 20+ for bundle stats; Playwright for browser benchmarks
- **Hardware profile:** Document "mid-range laptop" — Apple M1 / Intel i7, 16 GB RAM, 1920×1080
- **Browser:** Chromium latest (primary); Firefox + WebKit spot-check on release

### 6.2 Benchmark scenarios

| ID | Scenario | Metric | Pass threshold |
|----|----------|--------|----------------|
| BENCH-01 | Scroll 100k × 20, DOM | p95 frame ms | ≤ 16.7 ms |
| BENCH-02 | Scroll 100k × 50, DOM | p95 frame ms | ≤ 16.7 ms |
| BENCH-03 | Initial render 1k × 10 | ms to `firstDataRendered` | ≤ 100 ms |
| BENCH-04 | Sort 100k CSRM | ms | ≤ 200 ms |
| BENCH-05 | Filter 100k CSRM | ms | ≤ 200 ms |
| BENCH-06 | Scroll 1M × 20, canvas read-only | p95 frame ms | ≤ 16.7 ms |
| BENCH-07 | Horizontal scroll 500 cols | p95 frame ms | ≤ 16.7 ms |
| BENCH-08 | Memory after 100 mount/unmount | detached DOM nodes | 0 |

### 6.3 Competitor comparison (published table)

Each release (from Tier 2 onward) MUST publish a markdown table in `benchmarks/RESULTS.md`:

| Scenario | ol-grid | AG Grid Community | TanStack Table + Virtual |
|----------|---------|-------------------|--------------------------|
| Scroll FPS (100k×20) | … | … | N/A (no default UI) |
| Initial render (1k×10) | … | … | … |
| Bundle (community profile) | … | … | … |
| Sort 100k | … | … | … |

**Fairness rules:**

- Same dataset JSON across libraries
- Same column definitions (text, number, date columns)
- Default configurations; no extra AG Grid enterprise modules
- Warm-up run before measurement; report median + p95

### 6.4 CI integration

| Gate | Tier | Blocking? |
|------|------|-----------|
| Bundle size (minimal profile) | T1 | Yes — PR blocking |
| Bundle size (community profile) | T2 | Yes — PR blocking |
| `publint` + `attw` | T1 | Yes |
| Scroll FPS bench | T1 | Nightly; blocking on release |
| Sort/filter bench | T2 | Nightly |
| Canvas 1M bench | T3 | Release only |
| Memory leak test | T1 | PR blocking |

## 7. Optimization Strategies (requirements on implementation)

| Area | Required approach | Tier |
|------|-------------------|------|
| Virtualization | Core-owned `Virtualizer`; fixed + dynamic height binary search | T1 |
| DOM recycling | Row/cell pool; reassign indices vs create/destroy | T1 |
| React cells | Portal pool; no `createRoot` per cell | T1 |
| Store updates | `batch()` coalescing; selector memoization | T1 |
| Sort/filter at scale | Web Worker optional path | T3 |
| Canvas | Damage rects; text measure cache | T3 |
| Column flex | Compute once per layout pass, not per cell | T1 |
| Framework adapters | `< 200 LOC`; zero logic duplication | T1 |

## 8. Monitoring & regression policy

| ID | Requirement | Tier |
|----|-------------|------|
| NFR-MON-01 | Bundle CI uploads size artifact per PR | T1 |
| NFR-MON-02 | PR comment shows delta vs base branch | T2 |
| NFR-MON-03 | > 5% regression on any hard gate fails CI | T1 |
| NFR-MON-04 | Perf regression tracked as issue if > 10% on nightly | T2 |
| NFR-MON-05 | `benchmarks/RESULTS.md` updated on minor releases | T2 |

## 9. Acceptance Criteria

- [ ] Minimal reference app bundle ≤ 80 KB gzip in CI
- [ ] Community reference app bundle ≤ 150 KB gzip in CI (Tier 2)
- [ ] BENCH-01 and BENCH-03 pass on nightly Chromium
- [ ] DOM node count stable when scrolling 100k rows (inspector snapshot)
- [ ] `publint` + `attw` green for all published packages
- [ ] `benchmarks/RESULTS.md` published with AG Grid comparison (Tier 2 exit)
- [ ] Canvas BENCH-06 passes (Tier 3 exit)
- [ ] 100× mount/unmount integration test: zero detached nodes

## 10. Test Plan

| Test type | Coverage |
|-----------|----------|
| Unit | Virtualizer range calc, binary search, overscan — no DOM |
| Unit | Store batching coalescence count |
| Benchmark | Playwright FPS via `requestAnimationFrame` sampling |
| Benchmark | `bundle-size.ts` esbuild metafile analysis |
| Integration | Portal pool size bound on scroll |
| CI | Size limit script with JSON thresholds file |

### 10.1 Threshold config example

```json
{
  "profiles": {
    "minimal": { "maxGzipBytes": 81920, "packages": ["core", "dom-renderer", "sort", "react"] },
    "community": { "maxGzipBytes": 153600, "packages": ["minimal", "filter", "editing", "pagination"] }
  }
}
```

## 11. Dependencies

| Dependency | Type | Notes |
|------------|------|-------|
| `plugin-module-system.md` | Related | Per-package size budgets |
| `ARCHITECTURE.md` §6 | Related | Rendering strategies |
| All feature specs | Related | Feature-specific perf notes |

## 12. Open Questions

| # | Question | Options | Decision |
|---|----------|---------|----------|
| OQ-1 | CI bench on GitHub Actions vs dedicated runner | Actions / self-hosted | Self-hosted for FPS stability |
| OQ-2 | Brotlify vs gzip as CI gate | gzip only / both | gzip gate; brotli informational |
| OQ-3 | Perf budget for custom cell renderers | Excluded / warning only | Excluded — app responsibility |

## 13. References

- [REQUIREMENTS.md](../REQUIREMENTS.md) §4.1.6, §5.1, §5.2, §8.1–8.3, NFR-Q-06
- [ARCHITECTURE.md](../ARCHITECTURE.md) §5.3, §6, §7.5
- [plugin-module-system.md](./plugin-module-system.md)
- [TanStack Virtual performance patterns](https://tanstack.com/virtual/latest)
- [AG Grid Performance](https://www.ag-grid.com/javascript-data-grid/scrolling-performance/)

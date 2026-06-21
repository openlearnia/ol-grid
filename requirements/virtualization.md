# Virtualization — Feature Requirements

> **Package:** `@ol-grid/core` (`Virtualizer`) + `@ol-grid/dom-renderer` / `@ol-grid/canvas-renderer`  
> **Document version:** 1.0  
> **Last updated:** June 2026  
> **Status:** Draft — row virtualization partial in `packages/core/src/virtualizer/`

Parent documents: [REQUIREMENTS.md](../REQUIREMENTS.md), [ARCHITECTURE.md](../ARCHITECTURE.md)

---

## 1. Overview

### 1.1 Summary

**Virtualization** ensures ol-grid renders only cells in or near the viewport, keeping DOM node count and layout work bounded regardless of total rows/columns. The **virtualizer** in `@ol-grid/core` computes visible index ranges and pixel offsets; renderers position rows/columns via transforms and recycle elements. Pinned column regions use **multi-viewport coordination** (shared vertical scroll, independent horizontal scroll per region).

### 1.2 Goals

| ID | Goal |
|----|------|
| G-VIRT-01 | 60 fps scroll with 100k+ rows × 50 columns (DOM renderer, Tier 1 NFR) |
| G-VIRT-02 | Decouple virtual range math from renderer — same `VirtualRange` for DOM and canvas |
| G-VIRT-03 | Configurable overscan to reduce blank flashes during fast scroll |
| G-VIRT-04 | Support dynamic row heights with measurement feedback loop |
| G-VIRT-05 | Column virtualization for 500+ columns (Tier 3) without breaking pin regions |

### 1.3 Non-goals

| Item | Rationale |
|------|-----------|
| Data loading / row models | Row models supply `rowCount` and `getRowAt` — see CSRM / infinite / SSRM specs |
| Column width business rules | [column-model.md](./column-model.md) |
| Pagination slice logic | [pagination.md](./pagination.md) — alternative to vertical virtual scroll |
| Full SSR hydration of virtual DOM | State serializable; render client-side |
| Native mobile momentum scroll tuning beyond browser default | Desktop-first v1 |

### 1.4 Current implementation snapshot

| Capability | Status |
|------------|--------|
| `computeRowVirtualRange` (fixed row height) | **Done** |
| DOM renderer row pool + incremental diff (no `replaceChildren` per scroll) | **Done** |
| Scroll fast-path: transform sync before store refresh | **Done** |
| Active scroll rAF loop during momentum scroll | **Done** |
| DOM renderer row recycling + `translateY` positioning | **Done** (row pool) |
| Pinned-left viewport (rows + header) | **Done** |
| `overscanRowCount` default 3 (`DEFAULT_OVERSCAN_ROW_COUNT`) | **Done** |
| Directional scroll buffer (MUI DataGrid pattern) | **Done** |
| Tier 2 sync scroll (render-then-scroll on fast jumps) | **Done** |
| Pinned-right viewport | **Not started** |
| Column virtualization | **Not started** |
| Dynamic row height / prefix-sum cache | **Not started** |
| `scrollToIndex` / `ensureIndexVisible` API | **Not started** |
| Canvas renderer virtual paint | **Not started** (T3 package) |

---

## 2. User stories

### US-VIRT-01 — Smooth large dataset scroll

As an end user scrolling a 100k-row grid, I experience smooth 60fps scroll with no browser tab freeze because only ~30 rows exist in the DOM.

### US-VIRT-02 — Pinned columns stay fixed

As an analyst with pinned ID and name columns, horizontal scroll moves only center columns while pinned cells stay aligned vertically with their rows.

### US-VIRT-03 — Variable row height

As a developer showing multi-line descriptions, I provide `getRowHeight` so each row measures once, caches height, and scroll position stays accurate.

### US-VIRT-04 — Wide sparse matrices

As a scientist with 2000 columns, column virtualization renders only visible columns plus overscan so horizontal scroll remains responsive (Tier 3).

### US-VIRT-05 — Programmatic scroll

As a developer, I call `ensureIndexVisible(5000)` after a search so the grid scrolls to the matching row centered in the viewport.

---

## 3. Functional requirements

### 3.1 Row virtualization (fixed height)

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| REQ-VIRT-01 | Virtualizer MUST compute `[rowStart, rowEnd]` inclusive from `scrollTop`, `viewportHeight`, `rowHeight`, `rowCount` | Must | T1 |
| REQ-VIRT-02 | Default `rowHeight` MUST be 42px (configurable via `gridOptions.rowHeight`) | Must | T1 |
| REQ-VIRT-03 | Row positioning MUST use `transform: translateY()` (or equivalent compositor-friendly offset) | Must | T1 |
| REQ-VIRT-04 | `totalHeight` MUST equal `rowCount * rowHeight` for scrollbar sizing | Must | T1 |
| REQ-VIRT-05 | Empty dataset MUST render zero rows with `totalHeight: 0` | Must | T1 |

### 3.2 Overscan

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| REQ-VIRT-10 | `overscanRowCount` (default 3–5) MUST extend range above and below viewport | Must | T1 |
| REQ-VIRT-11 | `overscanColumnCount` (default 2) MUST apply when column virtualization enabled | Must | T3 |
| REQ-VIRT-12 | Overscan MUST be disable-able via `suppressRowVirtualisation` / `suppressColumnVirtualisation` | Should | T2 |
| REQ-VIRT-13 | Infinite/SSRM models SHOULD use overscan to prefetch adjacent blocks — see [infinite-row-model.md](./infinite-row-model.md) | Should | T2 |

### 3.2.1 Directional scroll buffer (Tier 1)

MUI DataGrid-style **directional overscan** reduces white gaps during fast scroll by rendering heavily in the scroll direction only, not symmetrically.

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| REQ-VIRT-14 | Idle/default overscan MUST be small and symmetric (default 3 rows each side) | Must | T1 |
| REQ-VIRT-15 | During active vertical scroll, overscan MUST expand heavily in scroll direction only (~12 rows + velocity boost) | Must | T1 |
| REQ-VIRT-16 | During active scroll, opposite-direction overscan MUST be zero (not symmetric) | Must | T1 |
| REQ-VIRT-17 | Directional buffer MUST persist between scroll events until scroll settles (~150ms idle) | Must | T1 |
| REQ-VIRT-18 | After scroll settles, overscan MUST shrink back to idle default | Must | T1 |
| REQ-VIRT-19 | Wheel / scrollbar intent MUST pre-expand warm row pool in scroll direction before `scrollTop` changes | Must | T1 |
| REQ-VIRT-115 | Horizontal directional buffer SHOULD mirror vertical when column virtualization ships | Should | T3 |

**Deferred (future tiers):**

| Approach | Tier | Notes |
|----------|------|-------|
| Fake scrollbar track (Google Sheets) — scrollbar thumb decoupled from body | T3 | Full custom scrollbar; sync scroll covers the white-gap case for native scrollbar |
| Adaptive native + fake scroll by velocity | T3 | Research-heavy; T2 sync scroll handles high-velocity native path |

### 3.2.2 Tier 2 sync scroll (render-then-scroll)

When native `scrollTop` advances faster than the row pool can mount rows, the browser paints an empty viewport (white gap). **Sync scroll** decouples visual scroll from data scroll on high-velocity or non-overlapping range changes.

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| REQ-VIRT-20a | When scroll velocity exceeds threshold (~2 px/ms) OR virtual range is non-overlapping with applied pool OR user is dragging the native scrollbar, renderer MUST hold `body.scrollTop` at last committed position | Must | T2 |
| REQ-VIRT-20b | While held, renderer MUST call `warmSyncRowsAtScrollTop(target)` synchronously, mount rows + apply transform, then set `body.scrollTop = target` in the same turn | Must | T2 |
| REQ-VIRT-20c | Pinned-left, center, and pinned-right row containers MUST receive the same transform during sync scroll | Must | T2 |
| REQ-VIRT-20d | Body / center-inner background MUST match row background (`--ol-grid-body-bg`) so any transient gap is not visually jarring | Should | T2 |
| REQ-VIRT-20e | Slow incremental scroll with overlapping ranges MUST keep the Tier 1 transform-first fast path (no hold) | Must | T2 |

**Tradeoff:** User may feel slight scroll "catch-up" during very fast flings or large track clicks; native scrollbar drag remains functional but rows commit after render rather than before paint.

### 3.3 Pinned viewports

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| REQ-VIRT-20 | Layout MUST have regions: `pinnedLeft`, `center`, `pinnedRight` × (`header`, `body`) | Must | T1 |
| REQ-VIRT-21 | Vertical scroll (`scrollTop`) MUST synchronize across all body regions | Must | T1 |
| REQ-VIRT-22 | Horizontal scroll MUST apply only to center (and optionally pinned-right offset) | Must | T1 |
| REQ-VIRT-23 | Pinned-left width MUST come from [column-model.md](./column-model.md) `getPinnedLeftWidth()` | Must | T1 |
| REQ-VIRT-24 | Row elements MUST exist in pinned and center containers with aligned `rowIndex` | Must | T1 |
| REQ-VIRT-25 | Pinned-right region MUST mirror pinned-left (T1 completion) | Must | T1 |
| REQ-VIRT-26 | Header horizontal scroll MUST sync with body center scroll | Must | T1 |

### 3.4 Column virtualization

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| REQ-VIRT-30 | For center columns, virtualizer MUST compute `[colStart, colEnd]` from `scrollLeft`, `viewportWidth`, column widths | Must | T3 |
| REQ-VIRT-31 | Pinned columns MUST always render in full (never virtualized away) | Must | T3 |
| REQ-VIRT-32 | `colOffsets` prefix-sum array MUST support variable column widths | Must | T3 |
| REQ-VIRT-33 | Horizontal total width MUST match [column-model.md](./column-model.md) `getTotalWidth()` | Must | T3 |
| REQ-VIRT-34 | Cell mount count MUST be ≤ `(rowEnd-rowStart+1) × (colEnd-colStart+1)` plus pins | Must | T3 |

### 3.5 Dynamic row height

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| REQ-VIRT-40 | `getRowHeight(params)` callback MAY return per-row height | Must | T2 |
| REQ-VIRT-41 | Virtualizer MUST maintain `rowOffsets` prefix-sum array for variable heights | Must | T2 |
| REQ-VIRT-42 | Index lookup MUST use binary search on prefix sums (O(log n)) | Must | T2 |
| REQ-VIRT-43 | Renderer MUST call `reportRowHeight(index, height)` after measure for uncached rows | Must | T2 |
| REQ-VIRT-44 | `estimatedRowHeight` MUST be used for rows not yet measured | Must | T2 |
| REQ-VIRT-45 | Height cache invalidation MUST occur when row data or `getRowHeight` changes | Must | T2 |
| REQ-VIRT-46 | `resetRowHeights()` API MUST clear cache and remeasure visible rows | Should | T2 |

### 3.6 Scroll APIs

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| REQ-VIRT-50 | `ensureIndexVisible(rowIndex, position?)` MUST scroll minimum amount to show row | Must | T2 |
| REQ-VIRT-51 | `scrollToIndex(rowIndex)` MUST scroll row to top of viewport | Should | T2 |
| REQ-VIRT-52 | `getVerticalPixelRange()` MUST return `{ top, bottom }` visible pixel range | Should | T2 |
| REQ-VIRT-53 | `getHorizontalPixelRange()` MUST return visible horizontal range (center cols) | Should | T3 |

### 3.7 Renderer recycling

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| REQ-VIRT-60 | DOM renderer MUST reuse row elements across range changes (pool by slot, not by data id) | Must | T1 |
| REQ-VIRT-61 | Cell framework portals MUST unmount when cell leaves overscan range | Must | T1 |
| REQ-VIRT-62 | Scroll frame MUST complete cell recycle + paint within 16ms budget (100k row dataset) | Must | T1 |
| REQ-VIRT-63 | `content-visibility: auto` MAY be applied as progressive enhancement | Could | T2 |
| REQ-VIRT-64 | Canvas renderer MUST repaint damage rects only on range change (T3) | Should | T3 |

### 3.8 Interaction with pagination

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| REQ-VIRT-70 | When pagination enabled, vertical virtual scroll MUST be disabled — see [pagination.md](./pagination.md) | Must | T2 |
| REQ-VIRT-71 | Paginated mode renders all rows on current page without row virtualization | Must | T2 |

---

## 4. API surface

### 4.1 Types (core)

```typescript
interface VirtualizerConfig {
  rowCount: number;
  columnCount: number;
  rowHeight: number | ((index: number) => number);
  columnWidth: number | ((index: number) => number);
  overscanRowCount?: number;
  overscanColumnCount?: number;
  scrollTop: number;
  scrollLeft: number;
  viewportWidth: number;
  viewportHeight: number;
  estimatedRowHeight?: number;
  pinnedLeftColumnCount: number;
  pinnedRightColumnCount: number;
}

interface VirtualRange {
  rowStart: number;
  rowEnd: number;
  colStart: number;
  colEnd: number;
  rowOffsets: Float64Array;
  colOffsets: Float64Array;
  totalHeight: number;
  totalWidth: number;
  rowTranslateOffset: number;
}
```

### 4.2 GridOptions

| Option | Default | Tier |
|--------|---------|------|
| `rowHeight` | `42` | T1 |
| `getRowHeight` | — | T2 |
| `overscanRowCount` | `5` | T1 |
| `overscanColumnCount` | `2` | T3 |
| `suppressRowVirtualisation` | `false` | T2 |
| `suppressColumnVirtualisation` | `false` | T3 |
| `ensureDomOrder` | `false` | T2 |

### 4.3 GridApi methods

| Method | Tier |
|--------|------|
| `ensureIndexVisible(index, position?)` | T2 |
| `getFirstDisplayedRowIndex()` | T2 |
| `getLastDisplayedRowIndex()` | T2 |
| `getVerticalPixelRange()` | T2 |
| `resetRowHeights()` | T2 |

### 4.4 RendererAdapter callbacks

| Method | Direction |
|--------|-----------|
| `renderFrame(frame: RenderFrame)` | Core → renderer |
| `reportRowHeight(index, height)` | Renderer → core |
| `reportColumnWidth(index, width)` | Renderer → core (auto-size) |

### 4.5 Events

| Event | Tier |
|-------|------|
| `bodyScroll` | T2 |
| `bodyScrollEnd` | T2 |
| `viewportChanged` | T2 |

---

## 5. AG Grid parity matrix

| Feature | AG Grid Community | AG Grid Enterprise | ol-grid target |
|---------|-------------------|--------------------|----------------|
| Row virtualization | Yes | Yes | **T1** — partial |
| Column virtualization | Yes | Yes | **T3** |
| Pinned columns + virtual | Yes | Yes | **T1** left done |
| Dynamic row height | Yes | Yes | **T2** |
| `ensureIndexVisible` | Yes | Yes | **T2** |
| `suppressRowVirtualisation` | Yes | Yes | **T2** |
| Full-width rows | Yes | Yes | **T3** separate |
| Canvas performance path | No | No | **T3** `@ol-grid/canvas` |

---

## 6. Competitive analysis

| Library | Virtualization | ol-grid takeaway |
|---------|----------------|------------------|
| **AG Grid** | Mature DOM virtualisation + enterprise column virtual | Primary parity |
| **TanStack Virtual** | Headless range + dynamic size | Adopt prefix-sum + binary search |
| **Glide Data Grid** | Canvas cell blit, 1M+ rows | Optional canvas tier |
| **RevoGrid** | `frameSize` overscan, multi-viewport | Adopt overscan naming |
| **MUI Data Grid** | Virtualizer in Pro | Match in MIT stack |
| **react-window** | Fixed size lists only | ol-grid adds 2D + pins |

---

## 7. Tier and priority

| Phase | Scope | Priority |
|-------|-------|----------|
| **Tier 1** | Fixed row virtual, pinned-left, DOM recycle, overscan | P0 — mostly done |
| **Tier 1 done** | Pinned-right, header/body scroll sync polish | P0 |
| **Tier 2** | Dynamic row height, scroll APIs, `bodyScroll` events | P1 |
| **Tier 3** | Column virtual, canvas renderer, 500+ cols | P1 |

---

## 8. Acceptance criteria

1. **DOM bound:** 100k rows × 20 cols — DOM row count ≤ `(visible + 2*overscan)` not 100k.
2. **FPS:** Scroll wheel stress test maintains ≥ 55 fps median on M1 MacBook Air (Chrome).
3. **Pin align:** After 500px horizontal scroll, pinned row cells stay pixel-aligned with center rows vertically.
4. **Dynamic height:** Rows with heights 32, 64, 48px — `ensureIndexVisible` lands correct offset after measure.
5. **Column virtual:** 1000 columns, 50 visible — mounted cell count &lt; 80 per row slice.
6. **Recycle:** Scrolling 1000px reuses same DOM row nodes (identity check in dev mode).
7. **Pagination mutual exclusion:** `pagination: true` disables row virtualizer path.

---

## 9. Dependencies

| Feature | Relationship |
|---------|--------------|
| [column-model.md](./column-model.md) | Widths, pin counts, visible column list |
| [client-side-row-model.md](./client-side-row-model.md) | `rowCount`, `getRowAt` |
| [infinite-row-model.md](./infinite-row-model.md) | Stub rows in range, prefetch |
| [server-side-row-model.md](./server-side-row-model.md) | Stub rows, variable display count |
| [pagination.md](./pagination.md) | Disables row virtualization |
| `@ol-grid/dom-renderer` | Scroll containers, recycling |
| `@ol-grid/canvas-renderer` | T3 paint path |

---

## 10. Open questions

| # | Question | Options |
|---|----------|---------|
| OQ-VIRT-1 | Default `overscanRowCount` — 3 or 5? | 3 AG Grid / 5 current code |
| OQ-VIRT-2 | `ensureDomOrder` for a11y — default on? | off / on |
| OQ-VIRT-3 | Measure dynamic height synchronously first paint? | sync measure / estimated then correct |
| OQ-VIRT-4 | Column virtual with flex columns — recalc on resize? | throttle rAF |
| OQ-VIRT-5 | Web Worker for virtual range only? | Unlikely — keep main thread |

---

## 11. References

- [AG Grid — DOM Virtualisation](https://www.ag-grid.com/javascript-data-grid/dom-virtualisation/)
- [AG Grid — Column Virtualisation](https://www.ag-grid.com/javascript-data-grid/column-virtualisation/)
- [AG Grid — Row Height](https://www.ag-grid.com/javascript-data-grid/row-height/)
- [TanStack Virtual — Dynamic Size](https://tanstack.com/virtual/latest/docs/api/virtualizer)
- [WAI-ARIA — Grid Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/)
- [ol-grid ARCHITECTURE.md §3.4, §6.1](../ARCHITECTURE.md)
- [ol-grid REQUIREMENTS.md §5.1 NFR-P](../REQUIREMENTS.md)

---

*Virtualization requirements — authoritative for viewport range math and renderer contracts.*

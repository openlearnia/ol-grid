# ol-grid — Canvas Renderer Requirements

> Package: `@ol-grid/canvas-renderer` (planned)  
> Parent: [REQUIREMENTS.md](../REQUIREMENTS.md) · [ARCHITECTURE.md](../ARCHITECTURE.md) · [core-engine.md](./core-engine.md)  
> **Document version:** 1.0 · **Last updated:** June 2026 · **Status:** Draft — not implemented

---

## 1. Overview

The canvas renderer is an **optional, high-performance** presentation path for read-heavy grids at extreme scale (1M+ rows). It implements the same `RendererAdapter` contract as the DOM renderer but paints cells to `<canvas>` elements instead of mounting DOM per cell. A **companion accessibility DOM** MUST provide equivalent keyboard navigation and screen reader semantics.

### 1.1 When to use

| Use canvas | Use DOM (default) |
|------------|-------------------|
| 1M+ read-only rows | Editable grids with rich cell components |
| Spreadsheet-style dense tables | Native HTML form controls in cells |
| FPS-critical dashboards | WCAG without extra a11y layer |
| No per-cell React/Vue components | Design system components in cells |

### 1.2 Scope

| In scope | Out of scope |
|----------|--------------|
| `CanvasRenderer` + `createCanvasRenderer()` | Replacing DOM as default |
| Multi-viewport canvas (pin + center) | Integrated charting |
| `drawCell` / `drawHeader` paint callbacks | Full Excel rendering |
| Theme object → paint styles | CSS class-based cell layout |
| Damage rect partial repaints | DOM cell recycling |
| Hidden/synced a11y DOM grid | Canvas-native text selection |
| Text measurement cache | Complex HTML in cells |

### 1.3 Dependencies

- **Runtime:** `@ol-grid/core` only
- **Optional:** none (no React/canvas libs)
- **Peer:** none

---

## 2. AG Grid / Glide Parity Reference

| Reference | Feature | ol-grid REQ | Tier |
|-----------|---------|-------------|------|
| Glide Data Grid | Canvas scroll 1M+ rows | CR-PERF-* | T3 |
| Glide | `drawCell` callback | CR-PAINT-* | T3 |
| Glide | Theme object | CR-TH-* | T3 |
| AG Grid | DOM default | N/A — canvas is opt-in | — |
| AG Grid Enterprise | Excel-like range selection | CR-SEL-* + clipboard module | T3 |
| ol-grid NFR-A-06 | Parallel a11y DOM | CR-A11Y-* | T3 |

---

## 3. RendererAdapter Contract

**REQ-CR-API-01** — `readonly type = 'canvas'`.

**REQ-CR-API-02** — `mount(host, engine)` creates canvas layer(s), a11y DOM sibling, scroll containers, registers listeners.

**REQ-CR-API-03** — `renderFrame(frame)` schedules paint; MUST coalesce multiple frames per animation frame.

**REQ-CR-API-04** — `getCellHost(position)` returns a11y DOM cell element (not canvas pixel), for overlay editors.

**REQ-CR-API-05** — `getEditorHost()` returns absolutely positioned DOM overlay container above canvas.

**REQ-CR-API-06** — `reportRowHeight` / `reportColumnWidth` feed core measurement cache for variable sizing.

---

## 4. Viewport & Canvas Layout

### 4.1 Structure

```
.ol-grid.ol-grid--canvas [role=grid]
  └── .ol-grid__root
        ├── .ol-grid__canvas-header (canvas)
        ├── .ol-grid__canvas-body
        │     ├── .ol-grid__canvas-pinned-left (canvas)
        │     └── .ol-grid__canvas-center-scroll
        │           └── canvas (center body)
        ├── .ol-grid__a11y-layer (visually hidden, pointer-events as needed)
        │     └── [synchronized grid DOM — see CR-A11Y-*]
        └── .ol-grid__editor-overlay (DOM, for active editor only)
```

**REQ-CR-LAYOUT-01** — Three horizontal regions mirror DOM renderer: pinned-left, center (scroll), pinned-right (Tier 3).

**REQ-CR-LAYOUT-02** — Vertical scroll on body container; horizontal scroll on center region only.

**REQ-CR-LAYOUT-03** — Canvas backing store size MUST account for `devicePixelRatio` for crisp text.

**REQ-CR-LAYOUT-04** — Resize canvas on viewport `ResizeObserver` + DPR change.

---

## 5. Painting Pipeline

**REQ-CR-PAINT-01** — Paint order per frame: clear (or damage rect) → header → body rows → focus ring → selection highlight.

**REQ-CR-PAINT-02** — Default cell painter draws background, border, clipped text using theme tokens.

**REQ-CR-PAINT-03** — `drawCell(ctx, params)` hook per column or cell type registration:

```typescript
interface DrawCellParams<TData> {
  ctx: CanvasRenderingContext2D;
  rect: { x: number; y: number; width: number; height: number };
  value: string;
  data: TData;
  rowIndex: number;
  colDef: ColumnDef<TData>;
  theme: ThemeTokens;
  highlighted: boolean;
  selected: boolean;
}
```

**REQ-CR-PAINT-04** — `drawHeader` hook with same rect/theme pattern.

**REQ-CR-PAINT-05** — Text MUST clip to cell rect with ellipsis when overflow.

**REQ-CR-PAINT-06** — `measureTextCached(font, text)` — LRU cache for repeated strings (Glide pattern).

**REQ-CR-PAINT-07** — Damage rects: on scroll, repaint only newly exposed strips + dirty cells; full repaint on theme/column width change.

**REQ-CR-PAINT-08** — Sort indicator, checkbox, resize handle drawn in header painter (or DOM header hybrid — document choice in impl).

---

## 6. Scroll & Virtualization

**REQ-CR-VIRT-01** — Consume `RenderFrame.virtualRange` from core; paint only visible row/col indices.

**REQ-CR-VIRT-02** — Scroll offset applied via canvas transform or scroll container — MUST NOT repaint entire 1M-row bitmap.

**REQ-CR-VIRT-03** — Row positioning uses `frame.rowOffset` + per-row height from core.

**REQ-CR-VIRT-04** — Column virtualization (500+ cols) — Tier 3; paint subset from `colStart`–`colEnd`.

**REQ-CR-VIRT-05** — Target: 60 fps scroll with 1M rows × 20 columns read-only on mid-range laptop (NFR-P-02).

---

## 7. Input Handling

**REQ-CR-INT-01** — Hit test: map pointer (x, y) → `(rowIndex, colId)` using column offsets + row offsets from frame.

**REQ-CR-INT-02** — Click → `engine.setFocusedCell` + selection handlers (same as DOM).

**REQ-CR-INT-03** — Double-click editable cell → start edit; editor DOM in overlay layer.

**REQ-CR-INT-04** — Header click hit test for sort; resize drag for column width.

**REQ-CR-INT-05** — Keyboard events captured on a11y grid or host (delegated to engine) — see [accessibility.md](./accessibility.md).

**REQ-CR-INT-06** — Touch scroll: passive listeners; no custom gesture engine v1.

---

## 8. Accessibility Companion DOM

**REQ-CR-A11Y-01** — Parallel DOM grid MUST implement WAI-ARIA grid pattern (`role=grid`, `row`, `gridcell`, `columnheader`).

**REQ-CR-A11Y-02** — a11y layer visually hidden (`sr-only` / `aria-hidden` on decorative canvas) but focusable cells operable.

**REQ-CR-A11Y-03** — Visible focus ring MAY be drawn on canvas AND reflected on a11y focused cell.

**REQ-CR-A11Y-04** — a11y DOM row/col count reflects **virtual** visible set + overscan, synced on range change.

**REQ-CR-A11Y-05** — Screen reader announcements for sort/filter/selection — same as DOM renderer (T2).

**REQ-CR-A11Y-06** — Canvas renderer MUST NOT ship without a11y layer enabled (no `disableA11y` production flag).

---

## 9. Editing & Overlays

**REQ-CR-EDIT-01** — Read-only mode is primary; editing supported via DOM overlay only.

**REQ-CR-EDIT-02** — Single editor overlay positioned with `getBoundingClientRect` alignment to cell rect.

**REQ-CR-EDIT-03** — On edit end, repaint damage rect for that cell.

**REQ-CR-EDIT-04** — Complex cell components: optional DOM overlay "hover layer" for active cell only — not full grid of components.

---

## 10. Theming

**REQ-CR-TH-01** — Consume `ThemeTokens` object mapped from same CSS variables as DOM — see [theming.md](./theming.md).

**REQ-CR-TH-02** — `resolveTheme(host: HTMLElement): ThemeTokens` reads computed custom properties from host.

**REQ-CR-TH-03** — Dark/light switch triggers full repaint.

**REQ-CR-TH-04** — No CSS-in-JS; token object built once per theme change.

---

## 11. Clipboard & Selection Visuals

**REQ-CR-SEL-01** — Row selection: painted background using `--ol-grid-row-selected-bg`.

**REQ-CR-SEL-02** — Cell range selection (Tier 3): painted border + fill; sync with `@ol-grid/clipboard`.

**REQ-CR-SEL-03** — Copy does not use native text selection on canvas; clipboard module serializes from core selection state.

---

## 12. Performance & Memory

| REQ-ID | Requirement | Target |
|--------|-------------|--------|
| REQ-CR-PERF-01 | 1M rows scroll FPS | ≥60 fps read-only |
| REQ-CR-PERF-02 | Paint budget per frame | ≤12 ms paint + 4 ms input |
| REQ-CR-PERF-03 | Text measure cache size | Bounded LRU (e.g. 10k entries) |
| REQ-CR-PERF-04 | Canvas memory | O(viewport area × DPR²), not O(row count) |
| REQ-CR-PERF-05 | Offscreen canvas for text measure | Optional optimization |

---

## 13. Package & Distribution

**REQ-CR-PKG-01** — Package name `@ol-grid/canvas-renderer`; separate from `@ol-grid/dom-renderer`.

**REQ-CR-PKG-02** — `sideEffects: false`; no default export.

**REQ-CR-PKG-03** — Peer usage: `createGrid(host, { ... })` with `createCanvasRenderer()` passed to `engine.mount`.

**REQ-CR-PKG-04** — Document bundle size delta vs DOM in README.

**REQ-CR-PKG-05** — Examples: `examples/canvas-basic` read-only 1M row demo.

---

## 14. Current Implementation Status

**Not started.** No `packages/canvas-renderer` in monorepo. Phase 4 per ARCHITECTURE.md roadmap.

Reference implementations to study: Glide Data Grid (paint API), AG Grid canvas experiments (if any), RevoGrid multi-viewport.

---

## 15. Acceptance Criteria

### Tier 3 exit

- [ ] AC-CR-01: `createCanvasRenderer()` passes RendererAdapter type checks against core
- [ ] AC-CR-02: Benchmark: 1M rows × 20 cols ≥60 fps scroll (read-only) on documented hardware
- [ ] AC-CR-03: axe-core clean on canvas demo with a11y layer enabled
- [ ] AC-CR-04: Keyboard navigation parity with DOM demo (arrow, Enter, Escape)
- [ ] AC-CR-05: Theme switch light/dark repaints correctly
- [ ] AC-CR-06: Hit test accuracy within 1px of DOM reference grid for same data
- [ ] AC-CR-07: `engine.mount(host, canvasRenderer)` works from vanilla and React adapters without code changes in core

---

## 16. Testing Requirements

**REQ-CR-TEST-01** — Unit: hit test, damage rect calculation, text ellipsis logic (node env + mock canvas).

**REQ-CR-TEST-02** — Browser: scroll FPS measurement script in `benchmarks/`.

**REQ-CR-TEST-03** — a11y: keyboard suite shared with DOM renderer fixtures.

**REQ-CR-TEST-04** — Visual: screenshot comparison for headers, selection, focus ring.

---

## 17. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| a11y drift from visual grid | Single source of truth in `RenderFrame`; sync tests |
| Blurry text on DPR | Scale canvas backing store |
| Editor UX inferior to DOM | Document limitations; recommend DOM for edit-heavy apps |
| Maintenance burden two renderers | Shared input → engine mapping; shared theme tokens |

---

## 18. Open Questions

| ID | Question | Recommendation |
|----|----------|----------------|
| OQ-CR-01 | Hybrid header (DOM) + body (canvas) | Allow for easier resize/sort a11y |
| OQ-CR-02 | WebGL vs 2D context | 2D context v1; WebGL only if profiling demands |
| OQ-CR-03 | Worker offload for paint | Defer; scroll on main thread with damage rects first |

---

*Authoritative for `@ol-grid/canvas-renderer`. Depends on [core-engine.md](./core-engine.md) RenderFrame stability.*

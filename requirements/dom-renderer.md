# ol-grid — DOM Renderer Requirements

> Package: `@ol-grid/dom-renderer`  
> Parent: [REQUIREMENTS.md](../REQUIREMENTS.md) · [ARCHITECTURE.md](../ARCHITECTURE.md) · [core-engine.md](./core-engine.md)  
> **Document version:** 1.0 · **Last updated:** June 2026 · **Status:** Draft

---

## 1. Overview

The DOM renderer is the **default presentation layer** for ol-grid. It implements `RendererAdapter`, mounts scrollable viewport DOM, recycles row/cell elements, captures pointer and keyboard input, and delegates all business logic to `GridEngine`. It is the primary surface for accessibility (ARIA grid pattern) and theming (CSS custom properties).

### 1.1 Scope

| In scope | Out of scope |
|----------|--------------|
| `DomRenderer` class + `createDomRenderer()` | Canvas paint |
| Viewport layout (pinned-left + center) | Right-pinned region (T1 gap) |
| Row/cell DOM recycling | Framework component portals (adapter layer) |
| Header: sort click, resize drag, auto-size dbl-click | Column drag-reorder UI (T2) |
| Inline text `<input>` editor | Custom editor components (T2) |
| Scroll → store sync (rAF batched) | Column virtualization DOM (T3) |
| Built-in theme CSS injection | Runtime CSS-in-JS |
| ARIA roles on grid structure | Live region announcements (T2 a11y doc) |

### 1.2 Dependencies

- **Runtime:** `@ol-grid/core` only
- **Peer:** none
- **CSS:** `theme.css` bundled/injected once per document

---

## 2. AG Grid Parity Reference

| AG Grid feature | ol-grid REQ | Tier | Status |
|-----------------|-------------|------|--------|
| DOM row virtualization | DR-VIRT-* | T1 | Implemented (rows) |
| Pinned columns | DR-LAYOUT-* | T1 | Left pin only |
| Column resize (drag) | DR-HDR-04 | T1 | Implemented |
| Auto-size on double-click | DR-HDR-05 | T2 | Implemented |
| Header sort UI | DR-HDR-01 | T1 | Implemented |
| Cell editing (provided) | DR-EDIT-* | T2 | Basic text input |
| Custom cell renderers | DR-CELL-10 | T1 | Not started |
| Loading / empty overlay | DR-OVERLAY-* | T2 | Not started |
| Full-width rows | DR-ROW-10 | T3 | Not started |
| RTL layout | DR-LAYOUT-10 | T2 | Not started |
| Right pinned columns | DR-LAYOUT-03 | T1 | Not started |

---

## 3. RendererAdapter Contract

**REQ-DR-API-01** — `DomRenderer` MUST declare `readonly type = 'dom'`.

**REQ-DR-API-02** — `mount(host, engine)` builds DOM tree under `host`, attaches listeners, reports initial viewport size.

**REQ-DR-API-03** — `unmount()` MUST remove all listeners, disconnect `ResizeObserver`, cancel pending `requestAnimationFrame`, remove injected DOM, restore host attributes.

**REQ-DR-API-04** — `renderFrame(frame: RenderFrame)` MUST be safe to call synchronously on every store notification.

**REQ-DR-API-05** — `getCellHost(position)` returns the `.ol-grid__cell` element for framework renderer mounting.

**REQ-DR-API-06** — `getEditorHost()` returns active edit cell or fallback root.

**REQ-DR-API-07** — `reportRowHeight` / `reportColumnWidth` stubs MUST be implemented for dynamic sizing (Tier 2).

---

## 4. DOM Structure Requirements

### 4.1 Host element

**REQ-DR-DOM-01** — Host receives classes: `ol-grid`; `role="grid"`; `tabIndex={0}` for keyboard capture.

**REQ-DR-DOM-02** — CSS variable `--ol-grid-row-height` synced from `frame.rowHeight` each frame.

**REQ-DR-DOM-03** — CSS variable `--ol-grid-pinned-left-width` synced from `frame.pinnedLeftWidth`.

### 4.2 Layout tree (minimum)

```
.ol-grid [role=grid]
  └── .ol-grid__root
        ├── .ol-grid__header [role=rowgroup]
        │     ├── .ol-grid__header-pinned-left [role=row]
        │     └── .ol-grid__header-center
        │           └── .ol-grid__header-row--center [role=row]
        └── .ol-grid__body [role=rowgroup] (vertical scroll)
              └── .ol-grid__body-inner (height = totalHeight)
                    ├── .ol-grid__body-pinned-left
                    │     └── .ol-grid__rows--pinned
                    └── .ol-grid__center-scroll (horizontal scroll)
                          └── .ol-grid__center-inner
                                └── .ol-grid__rows--center
```

**REQ-DR-DOM-04** — Pinned-left and center body rows MUST share the same `translate3d` Y transform for synchronized vertical position.

**REQ-DR-DOM-05** — Center header row MUST use `translate3d(-scrollLeft, 0, 0)` to stay aligned with horizontally scrolled body.

**REQ-DR-DOM-06** — Right-pinned region — REQ-DR-LAYOUT-03: mirror left structure when core supplies `pinnedRightColumns`.

### 4.3 Row & cell elements

**REQ-DR-DOM-07** — Rows: `.ol-grid__row`, `role="row"`, `data-row-id`, `data-row-index`, `aria-rowindex` (1-based).

**REQ-DR-DOM-08** — Cells: `.ol-grid__cell`, `role="gridcell"`, `data-col-id`, `aria-colindex` (1-based), explicit `width` style.

**REQ-DR-DOM-09** — Selected rows: class `ol-grid__row--selected`.

**REQ-DR-DOM-10** — Focused cell: class `ol-grid__cell--focused`; `tabIndex=0` on focused cell when not editing.

**REQ-DR-DOM-11** — Editing cell: class `ol-grid__cell--editing`; editor child `.ol-grid__cell-editor`.

---

## 5. Virtualization & Recycling

**REQ-DR-VIRT-01** — Only rows in `frame.virtualRange` (plus engine overscan) exist in DOM.

**REQ-DR-VIRT-02** — Row recycling: reuse `.ol-grid__row` elements keyed by `row.id`; `replaceChildren` on cell updates.

**REQ-DR-VIRT-03** — Cell recycling within row: reuse by `data-col-id`.

**REQ-DR-VIRT-04** — Row positioning via `transform: translate3d(0, rowOffset, 0)` on row containers — NOT per-row `top` layout.

**REQ-DR-VIRT-05** — `body-inner` height = `frame.totalHeight`; center-inner width = `frame.centerWidth`.

**REQ-DR-VIRT-06** — DOM node count MUST be O(visible rows × visible columns), independent of total row count (NFR-P-04).

**REQ-DR-VIRT-07** — `content-visibility: auto` on rows — progressive enhancement (Should).

**REQ-DR-VIRT-08** — Scroll handlers MUST use `passive: true` and coalesce to one store dispatch per frame via `requestAnimationFrame`.

---

## 6. Header Interaction

**REQ-DR-HDR-01** — Click on sortable header (not resize handle) calls `engine.toggleColumnSort(colId)`.

**REQ-DR-HDR-02** — Sort indicator: ▲ asc, ▼ desc, empty unsorted; `data-sortable="true|false"`.

**REQ-DR-HDR-03** — Selection column header: empty, non-sortable, class `ol-grid__header-cell--selection`.

**REQ-DR-HDR-04** — Resize: mousedown on `[data-resize-handle]` starts drag; mousemove calls `engine.resizeColumn(colId, width, false)`; mouseup with `finished: true`.

**REQ-DR-HDR-05** — Double-click resize handle calls `engine.autoSizeColumn(colId)`.

**REQ-DR-HDR-06** — Resize handle MUST have `aria-hidden="true"` (column width announced via header name + sort state).

**REQ-DR-HDR-07** — `aria-sort` on sortable headers — Tier 1 a11y completion (`ascending` | `descending` | `none`).

**REQ-DR-HDR-08** — Column reorder drag — Tier 2.

---

## 7. Body Interaction

**REQ-DR-INT-01** — Cell click sets focus via `engine.setFocusedCell(rowIndex, colId)`.

**REQ-DR-INT-02** — Row click (after focus) calls `engine.handleRowClick(rowId, { metaKey, ctrlKey })`.

**REQ-DR-INT-03** — Checkbox click calls `engine.toggleRowCheckbox(rowId)`; MUST `stopPropagation`.

**REQ-DR-INT-04** — Double-click editable cell calls `engine.startEditingCell`.

**REQ-DR-INT-05** — Host focus with no focused cell: focus first navigable column row 0.

**REQ-DR-INT-06** — Emit `onCellClicked` / `onRowClicked` from engine options — renderer forwards via engine (not duplicate handlers).

---

## 8. Keyboard Handling

**REQ-DR-KB-01** — When not editing: Arrow keys call `engine.moveFocusedCell`.

**REQ-DR-KB-02** — Enter / F2 starts edit on focused cell.

**REQ-DR-KB-03** — Escape clears focused cell when not editing.

**REQ-DR-KB-04** — When editing: Escape → `stopEditing(true)`; Enter → `stopEditing(false)`.

**REQ-DR-KB-05** — Space toggles row selection where applicable — Tier 1 completion.

**REQ-DR-KB-06** — Page Up/Down, Home/End — delegate to engine — Tier 1 completion.

**REQ-DR-KB-07** — Tab navigation between editable cells — Tier 2; MUST NOT trap focus outside grid unintentionally.

**REQ-DR-KB-08** — Keyboard events on editor input MUST `stopPropagation` for Enter/Escape to avoid double handling.

---

## 9. Editing UI

**REQ-DR-EDIT-01** — Default editor: `<input type="text" class="ol-grid__cell-editor">`.

**REQ-DR-EDIT-02** — `input` event calls `engine.updateEditValue`.

**REQ-DR-EDIT-03** — `blur` commits unless `suppressEditorBlur` flag set during `renderFrame` (prevents commit-on-refresh race).

**REQ-DR-EDIT-04** — On edit start: `focus()` + `select()` on input.

**REQ-DR-EDIT-05** — `syncEditor` MUST NOT clear cell children during active edit refresh (documented race fix).

**REQ-DR-EDIT-06** — Custom editors via `EditorHost` overlay — Tier 2; positioned over cell rect.

**REQ-DR-EDIT-07** — Provided editors: number, select, date — Tier 2 registry.

---

## 10. Cell Rendering

**REQ-DR-CELL-01** — Default display: `cellEl.textContent = cell.value` (text-safe).

**REQ-DR-CELL-02** — Selection column renders checkbox with `aria-label` from locale (hardcoded "Select row" until i18n).

**REQ-DR-CELL-03** — Custom `cellRenderer` string key — Tier 1: resolve via registry; mount in cell host.

**REQ-DR-CELL-04** — Framework cell renderers mounted by adapter into `getCellHost()` — portal pool pattern.

**REQ-DR-CELL-05** — `refresh()` on cell renderer when data changes without unmount — Tier 2.

**REQ-DR-CELL-06** — HTML cell content only when column allows explicit HTML flag.

---

## 11. Theming Integration

**REQ-DR-TH-01** — `ensureThemeStyles()` injects `theme.css` once per document (`id="ol-grid-dom-theme"`).

**REQ-DR-TH-02** — All visual styling via BEM classes + CSS variables; no inline colors except dynamic widths/positions.

**REQ-DR-TH-03** — Consumer MAY omit auto-injection by importing `@ol-grid/themes/*` separately — Tier 2 option.

**REQ-DR-TH-04** — Dark mode via `[data-ol-theme="dark"]` on host or ancestor — see [theming.md](./theming.md).

---

## 12. Viewport Measurement

**REQ-DR-VP-01** — `ResizeObserver` on body container dispatches `SET_VIEWPORT` with `clientWidth` / `clientHeight`.

**REQ-DR-VP-02** — Skip dispatch when dimensions unchanged (avoid refresh loops).

**REQ-DR-VP-03** — Initial measure on mount before first `renderFrame`.

---

## 13. Overlays & Accessories

**REQ-DR-OVERLAY-01** — Loading overlay when row model reports loading — Tier 2.

**REQ-DR-OVERLAY-02** — No-rows overlay when `rowCount === 0` — Tier 2.

**REQ-DR-OVERLAY-03** — Error overlay for failed infinite/SSRM blocks — Tier 2.

---

## 14. Performance Requirements

| REQ-ID | Requirement | Target |
|--------|-------------|--------|
| REQ-DR-PERF-01 | Scroll frame time 100k rows × 50 cols | ≤16 ms (60 fps) |
| REQ-DR-PERF-02 | Cell mount/unmount per scroll frame | Within frame budget |
| REQ-DR-PERF-03 | No synchronous layout read after write in scroll handler | Must |
| REQ-DR-PERF-04 | Header/body scroll sync without layout thrash | `transform` preferred |

---

## 15. Current Implementation Notes

`packages/dom-renderer/src/dom-renderer.ts` (~780 LOC) implements:

- Full layout tree for pinned-left + center
- Row/cell recycling, rAF scroll batching
- Sort, resize, auto-size, selection checkbox, basic text edit
- Theme CSS auto-injection
- ARIA roles on grid, rowgroup, row, columnheader, gridcell
- Missing: right pin, `aria-sort`, custom renderers, overlays, Space/Page keys, RTL

Tests: `dom-renderer.edit.test.ts` covers edit blur/suppress behavior.

---

## 16. Acceptance Criteria

### Tier 1

- [ ] AC-DR-01: React + vanilla examples render 100k rows with smooth scroll
- [ ] AC-DR-02: `unmount()` removes all nodes under host; no document listeners left
- [ ] AC-DR-03: Resize column updates DOM width live; final `onColumnResized` on mouseup
- [ ] AC-DR-04: axe-core: `role=grid` structure valid on default demo
- [ ] AC-DR-05: Edit commit survives rapid scroll while editing same cell (regression test)

### Tier 2

- [ ] AC-DR-06: Custom cell renderer demo mounts React component in visible cells only
- [ ] AC-DR-07: Loading/no-rows overlays display per row model state
- [ ] AC-DR-08: RTL mirror test passes horizontal scroll + column order

### Tier 3

- [ ] AC-DR-09: Right-pinned columns scroll independently from center
- [ ] AC-DR-10: 500+ columns with column virtualization — DOM nodes bounded

---

## 17. Testing Requirements

**REQ-DR-TEST-01** — Unit tests with happy-dom: mount, renderFrame, unmount lifecycle.

**REQ-DR-TEST-02** — Integration tests per adapter: sort click, select, scroll, edit.

**REQ-DR-TEST-03** — Visual regression: default theme, pinned columns, dark mode (Tier 2).

**REQ-DR-TEST-04** — axe-core in browser CI for default scenarios.

---

## 18. Open Questions

| ID | Question | Notes |
|----|----------|-------|
| OQ-DR-01 | Single vertical scroller vs split pinned scroll | Current: shared body scroll + pinned transform |
| OQ-DR-02 | Inject theme by default vs explicit import | Default inject aids DX; document opt-out |
| OQ-DR-03 | Focus model: roving tabindex on cells vs grid container | Current: roving on cells |

---

*Authoritative for `@ol-grid/dom-renderer`. RendererAdapter changes require [core-engine.md](./core-engine.md) amendment.*

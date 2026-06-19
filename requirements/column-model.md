# Column Model — Feature Requirements

> **Package:** `@ol-grid/core` (`ColumnModel`, `ColumnApi`)  
> **Document version:** 1.0  
> **Last updated:** June 2026  
> **Status:** Draft — partial implementation in `packages/core/src/column/`

Parent documents: [REQUIREMENTS.md](../REQUIREMENTS.md), [ARCHITECTURE.md](../ARCHITECTURE.md)

---

## 1. Overview

### 1.1 Summary

The column model is the authoritative source for **what columns exist**, **how they are sized and ordered**, **which are visible or pinned**, and **how they map to cell value pipelines**. It sits between declarative `columnDefs` (user config) and runtime `ColumnState` (mutable layout). Renderers consume normalized column geometry; row models consume column identity for sort/filter keys.

### 1.2 Goals

| ID | Goal |
|----|------|
| G-COL-01 | Stable `colId` identity across re-renders, state restore, and imperative API calls |
| G-COL-02 | AG Grid–familiar `columnDefs` + `applyColumnState` / `getColumnState` ergonomics |
| G-COL-03 | Three-region layout: pinned-left, center (scrollable), pinned-right with correct width math |
| G-COL-04 | Serializable column state for persistence, SSR snapshots, and controlled mode |
| G-COL-05 | Column changes batch into a single layout frame per tick (no resize thrash) |

### 1.3 Non-goals

| Item | Rationale |
|------|-----------|
| Sort/filter algorithm implementation | Owned by `@ol-grid/sort` and `@ol-grid/filter`; column model stores sort metadata only |
| Cell renderer mounting | Renderer layer; column model supplies `colDef` + geometry |
| Row grouping / pivot column generation | Tier 3 `@ol-grid/grouping`; column model consumes generated defs |
| Column tool panel UI | Tier 3 accessory; uses `ColumnApi` imperatively |
| Spanning cells (row/col span) | Tier 3; separate spec when planned |

### 1.4 Current implementation snapshot

| Capability | Status |
|------------|--------|
| `ColumnDef` types (`field`, `width`, `flex`, `pinned`, `hide`, value pipeline) | **Done** |
| Flex distribution in center viewport | **Done** |
| Pinned-left columns + selection checkbox column | **Done** |
| `setColumnWidth` / header drag resize (DOM renderer) | **Done** |
| `getColumnState` (internal) | **Done** |
| `computeAutoColumnWidth` helper (canvas text measure) | **Partial** — not wired to `GridApi` |
| Pinned-right region | **Not started** |
| Column groups (`children`) | **Not started** |
| Drag reorder | **Not started** |
| `applyColumnState` on `GridApi` | **Not started** |
| `autoSizeColumn(s)` / `sizeColumnsToFit` on `GridApi` | **Not started** |
| State persistence hooks / `onColumnStateChanged` | **Not started** |

---

## 2. User stories

### US-COL-01 — Declarative column setup

As an application developer, I define columns via `columnDefs` with `field`, `headerName`, `width`, and `flex` so the grid renders a readable table without imperative setup.

### US-COL-02 — Resize and persist layout

As a power user, I drag column edges to resize and expect widths to survive page reload when the app saves `getColumnState()` to localStorage and restores via `applyColumnState()`.

### US-COL-03 — Pin critical columns

As a data analyst, I pin ID and status columns to the left (and optionally actions to the right) so they remain visible while horizontally scrolling wide datasets.

### US-COL-04 — Hide and reorder columns

As an admin user, I hide low-value columns and drag headers to reorder so my preferred layout matches my workflow; the column tool panel (Tier 3) uses the same underlying APIs.

### US-COL-05 — Auto-fit content

As a developer prototyping a grid, I call `autoSizeAllColumns()` once data loads so columns fit cell text without manual width tuning.

---

## 3. Functional requirements

### 3.1 Column definitions

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| REQ-COL-01 | Every leaf column MUST resolve a stable `colId` from `id`, else `field`, else generated `col_<index>` | Must | T1 |
| REQ-COL-02 | `columnDefs` MUST support `field`, `headerName`, `width`, `minWidth`, `maxWidth`, `flex`, `pinned`, `hide`, `sortable`, `filterable`, `editable` | Must | T1 |
| REQ-COL-03 | Value pipeline callbacks (`valueGetter`, `valueFormatter`, `valueSetter`, `valueParser`) MUST be stored on `colDef` and invoked by row model / editing — not by column model directly | Must | T1 |
| REQ-COL-04 | `defaultColDef` grid option MUST merge into each column def (shallow merge; nested objects deep-merge for `meta` only) | Should | T2 |
| REQ-COL-05 | `children` on `ColumnDef` MUST define column groups; leaf columns inherit group header hierarchy | Must | T2 |
| REQ-COL-06 | `suppressMovable`, `lockPosition`, `lockPinned`, `suppressSizeToFit` column flags MUST be honored per AG Grid semantics | Should | T2 |
| REQ-COL-07 | `colSpan` / `rowSpan` deferred to spanning-cells spec (T3) | — | T3 |

### 3.2 Width model

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| REQ-COL-10 | Fixed `width` columns use pixel width; unset width defaults to 150px | Must | T1 |
| REQ-COL-11 | `flex` columns share remaining viewport width proportionally after fixed columns and pinned regions subtracted | Must | T1 |
| REQ-COL-12 | `minWidth` / `maxWidth` MUST clamp resize, flex, and auto-size results | Must | T1 |
| REQ-COL-13 | `sizeColumnsToFit()` MUST distribute or shrink center columns to fill viewport without horizontal scroll when possible | Should | T2 |
| REQ-COL-14 | `autoSizeColumn(colId)` MUST measure header + visible cell values (or sample) and set width; respect `skipHeader` param | Should | T2 |
| REQ-COL-15 | `autoSizeStrategy` grid option (`fitGridWidth`, `fitCellContents`) MUST run on first data render when configured | Could | T2 |
| REQ-COL-16 | Flex columns MUST reflow on viewport resize without user interaction | Must | T1 |

### 3.3 Resize interaction

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| REQ-COL-20 | Header edge drag MUST update width live; emit `columnResized` with `finished: false` during drag | Must | T1 |
| REQ-COL-21 | On mouseup, emit `columnResized` with `finished: true` and commit to `ColumnState` | Must | T1 |
| REQ-COL-22 | Resize MUST NOT apply to selection checkbox column or columns with `resizable: false` | Must | T1 |
| REQ-COL-23 | Double-click resize handle SHOULD auto-size that column (AG Grid parity) | Could | T2 |

### 3.4 Pinning

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| REQ-COL-30 | `pinned: 'left' \| 'right' \| null` MUST place columns in correct region | Must | T1 |
| REQ-COL-31 | Pinned-left and center viewports share vertical scroll; center scrolls horizontally; pinned-left does not scroll horizontally | Must | T1 |
| REQ-COL-32 | Pinned-right region MUST mirror pinned-left (independent of center horizontal scroll) | Must | T1 |
| REQ-COL-33 | `setColumnsPinned(colIds, pin)` MUST move columns between regions programmatically | Should | T2 |
| REQ-COL-34 | Selection checkbox column MUST always pin left when row selection enabled | Must | T1 |

### 3.5 Visibility and order

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| REQ-COL-40 | `hide: true` on def or state MUST exclude column from displayed columns and width totals | Must | T2 |
| REQ-COL-41 | `setColumnVisible(colId, visible)` MUST toggle visibility without losing width state | Must | T2 |
| REQ-COL-42 | Drag-drop header reorder MUST update display order within pin region only (cannot drag from center to pinned without pin API) | Should | T2 |
| REQ-COL-43 | `moveColumn(colId, toIndex)` MUST reorder programmatically | Should | T2 |
| REQ-COL-44 | Column order MUST be reflected in `getColumnState()` when `applyOrder` semantics used | Must | T2 |

### 3.6 Column groups

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| REQ-COL-50 | Nested `children` MUST render multi-row headers with correct colspan | Must | T2 |
| REQ-COL-51 | Group open/closed state (`ColumnGroupState`) MUST persist in grid state snapshot | Should | T2 |
| REQ-COL-52 | Flattened leaf column order MUST match visual column order for virtualization | Must | T2 |

### 3.7 Column state persistence

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| REQ-COL-60 | `getColumnState()` MUST return serializable array: `colId`, `width`, `hide`, `pinned`, `sort`, `sortIndex`, `flex` (if set) | Must | T1 |
| REQ-COL-61 | `applyColumnState({ state, applyOrder?, defaultState? })` MUST merge partial state; return `false` if unknown `colId` and no default | Must | T2 |
| REQ-COL-62 | `applyColumnState` MUST emit `displayedColumnsChanged` once per apply | Must | T2 |
| REQ-COL-63 | Controlled mode: external `columnState` prop MUST sync bidirectionally with store | Should | T2 |
| REQ-COL-64 | `initialState.columns` grid option SHOULD restore state on first render (AG Grid Initial State pattern) | Could | T2 |

---

## 4. API surface

### 4.1 Types (`@ol-grid/core`)

```typescript
interface ColumnDef<TData, TValue = unknown> {
  id?: string;
  field?: keyof TData & string;
  headerName?: string;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  flex?: number;
  pinned?: 'left' | 'right' | null;
  hide?: boolean;
  sortable?: boolean;
  resizable?: boolean;
  children?: ColumnDef<TData>[];  // groups — T2
  // value pipeline, renderers — see CSRM / editing specs
}

interface ColumnState {
  colId: string;
  width?: number;
  hide?: boolean;
  pinned?: 'left' | 'right' | null;
  sort?: 'asc' | 'desc' | null;
  sortIndex?: number | null;
}

interface ApplyColumnStateParams {
  state?: ColumnState[];
  applyOrder?: boolean;
  defaultState?: Partial<ColumnState>;
}

interface AutoSizeStrategy {
  type: 'fitGridWidth' | 'fitCellContents' | 'fitProvidedWidth';
  skipHeader?: boolean;
  columnLimits?: Array<{ colId: string; minWidth?: number; maxWidth?: number }>;
}
```

### 4.2 GridOptions

| Option | Description |
|--------|-------------|
| `columnDefs` | Declarative column configuration |
| `defaultColDef` | Merged into each column (T2) |
| `autoSizeStrategy` | Initial auto-size behavior (T2) |
| `suppressColumnMoveAnimation` | Disable reorder animation (T2) |
| `maintainColumnOrder` | Keep def order when applying state (T2) |

### 4.3 GridApi / ColumnApi methods

| Method | Tier | Notes |
|--------|------|-------|
| `getColumnState()` | T1 | |
| `applyColumnState(params)` | T2 | |
| `setColumnWidth(colId, width)` | T1 | Internal today via engine |
| `autoSizeColumn(colId, skipHeader?)` | T2 | |
| `autoSizeColumns(colIds, skipHeader?)` | T2 | |
| `autoSizeAllColumns(skipHeader?)` | T2 | |
| `sizeColumnsToFit(width?)` | T2 | |
| `setColumnsVisible(colIds, visible)` | T2 | |
| `moveColumn(colId, toIndex)` | T2 | |
| `setColumnsPinned(colIds, pinned)` | T2 | |
| `getAllGridColumns()` | T2 | Includes hidden |
| `getDisplayedCenterColumns()` | T2 | For virtualization — see [virtualization.md](./virtualization.md) |

### 4.4 Events

| Event | Payload highlights | Tier |
|-------|-------------------|------|
| `columnResized` | `colId`, `width`, `finished` | T1 (partial) |
| `columnMoved` | `colId`, `toIndex`, `finished` | T2 |
| `columnPinned` | `colId`, `pinned` | T2 |
| `columnVisible` | `colId`, `visible` | T2 |
| `displayedColumnsChanged` | `api`, source | T2 |
| `columnEverythingChanged` | source string | T2 |

---

## 5. AG Grid parity matrix

| Feature | AG Grid Community | AG Grid Enterprise | ol-grid target |
|---------|-------------------|--------------------|----------------|
| Column defs (`field`, `width`, `flex`) | Yes | Yes | **T1** — done |
| Column resize (drag) | Yes | Yes | **T1** — done |
| Column pin left/right | Yes | Yes | **T1** left done; right T1 |
| `getColumnState` / `applyColumnState` | Yes | Yes | **T2** |
| Column groups | Yes | Yes | **T2** |
| Column reorder (drag) | Yes | Yes | **T2** |
| Auto-size columns | Yes | Yes | **T2** |
| `sizeColumnsToFit` | Yes | Yes | **T2** |
| Column tool panel | No | Yes | **T3** — uses ColumnApi |
| Marry children / advanced header templates | Yes | Yes | **T2** basic / **T3** rich |

---

## 6. Competitive analysis

| Library | Column model approach | ol-grid implication |
|---------|----------------------|---------------------|
| **AG Grid** | `ColumnController` + `ColumnState`; mature pin/flex/auto-size | Primary parity reference; adopt `applyColumnState` shape |
| **TanStack Table** | `column.getSize()`, `column.resize()` — user wires DOM | ol-grid must own geometry; expose similar sizing hooks |
| **MUI X Data Grid** | `flex`, `minWidth`, pin via Pro tier | Match Community-tier pin without license gate |
| **Glide Data Grid** | Imperative column width array; no groups in core | Simpler model; ol-grid needs richer defs for enterprise |
| **Tabulator** | `columns` array with `frozen` | Map `frozen` mental model to `pinned` in migration guide |

---

## 7. Tier and priority

| Phase | Scope | Priority |
|-------|-------|----------|
| **Tier 1** | Defs, flex, resize, pin-left, `getColumnState`, selection column | P0 — mostly complete |
| **Tier 1 completion** | Pin-right, `applyColumnState` read path, `columnResized` event completeness | P0 |
| **Tier 2** | Groups, reorder, hide, auto-size, `sizeColumnsToFit`, persistence, controlled state | P1 |
| **Tier 3** | Tool panel integration, marry children, col span | P2 |

---

## 8. Acceptance criteria

1. **Flex layout:** Given 3 columns (72px fixed, 140px fixed, `flex: 1`) and 800px viewport, center flex column width equals `800 - 72 - 140 - pinned extras` within 1px.
2. **Resize clamp:** Dragging below `minWidth` stops at min; above `maxWidth` stops at max.
3. **Pin scroll:** With 20 center columns, horizontal scroll does not move pinned-left cells; vertical scroll moves all regions together.
4. **State round-trip:** `applyColumnState(getColumnState())` after resize + hide + reorder produces identical rendered layout.
5. **Auto-size:** `autoSizeColumn('name')` on column with longest cell 240px text yields width ≥ measured text + padding.
6. **Group headers:** Two-level group renders correct colspan; leaf `colId` order matches data column order.
7. **No thrash:** 60 resize events in one frame produce one store notification (batched).

---

## 9. Dependencies

| Dependency | Relationship |
|------------|----------------|
| [virtualization.md](./virtualization.md) | Consumes column widths, pin regions, visible column range |
| [client-side-row-model.md](./client-side-row-model.md) | Uses `colId` for sort keys and `valueGetter` resolution |
| [infinite-row-model.md](./infinite-row-model.md) | Sort/filter model passed to datasource; column changes may purge cache |
| [server-side-row-model.md](./server-side-row-model.md) | Column state changes trigger server refresh |
| `@ol-grid/sort` | Writes `sort` / `sortIndex` into `ColumnState` |
| `@ol-grid/dom-renderer` | Resize handles, group header DOM, drag UI |

---

## 10. Open questions

| # | Question | Options | Notes |
|---|----------|---------|-------|
| OQ-COL-1 | Persist `flex` in `ColumnState` or derive from defs only? | Persist / def-only | AG Grid does not persist flex as state |
| OQ-COL-2 | Auto-size samples all rows or visible rows only? | Visible / all loaded / CSRM sample | Performance vs accuracy |
| OQ-COL-3 | Column reorder across pin boundaries? | Disallow drag / auto-pin API | AG Grid disallows without pin change |
| OQ-COL-4 | Merge `ColumnApi` into `GridApi`? | Single api / split | AG Grid merged in v31+ |
| OQ-COL-5 | `initialState` vs `applyColumnState` on ready? | Both / initialState only | Align with AG Grid v32+ |

---

## 11. References

- [AG Grid — Column Definitions](https://www.ag-grid.com/javascript-data-grid/column-definitions/)
- [AG Grid — Column State](https://www.ag-grid.com/javascript-data-grid/column-state/)
- [AG Grid — Column Sizing](https://www.ag-grid.com/javascript-data-grid/column-sizing/)
- [AG Grid — Column Pinning](https://www.ag-grid.com/javascript-data-grid/column-pinning/)
- [AG Grid — Column Groups](https://www.ag-grid.com/javascript-data-grid/column-groups/)
- [ol-grid ARCHITECTURE.md §3.2](../ARCHITECTURE.md)
- [ol-grid REQUIREMENTS.md §4.1.2, §4.2.4](../REQUIREMENTS.md)

---

*Column model requirements — authoritative for `@ol-grid/core` column subsystem.*

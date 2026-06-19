# Feature Requirements: Selection

> **Package target:** `@ol-grid/core` (selection manager); range selection in `@ol-grid/selection` or core T3 slice  
> **Parent spec:** [REQUIREMENTS.md](../REQUIREMENTS.md) §3.4, §4.1.4, §4.3.3  
> **Architecture:** [ARCHITECTURE.md](../ARCHITECTURE.md) §3.5  
> **Document version:** 1.0  
> **Last updated:** June 2026  
> **Status:** Draft

---

## Table of Contents

1. [Overview](#1-overview)
2. [Current Implementation Status](#2-current-implementation-status)
3. [User Stories](#3-user-stories)
4. [Functional Requirements](#4-functional-requirements)
5. [API & Events](#5-api--events)
6. [AG Grid Parity](#6-ag-grid-parity)
7. [Competitive Analysis](#7-competitive-analysis)
8. [Tier Assignment](#8-tier-assignment)
9. [Acceptance Criteria](#9-acceptance-criteria)
10. [Dependencies](#10-dependencies)
11. [Open Questions](#11-open-questions)
12. [References](#12-references)

---

## 1. Overview

Selection governs which rows and/or cells are highlighted, focused, and included in bulk operations (delete, export, clipboard). ol-grid supports **row selection** (single and multi) as a Tier 1 requirement, with **cell range selection** as a Tier 3 Enterprise-pattern feature offered under MIT.

Selection state lives in `GridStore.selection` and is managed by `SelectionManager` in core — not delegated to framework adapters.

### 1.1 Selection modes

| Mode | Description | Tier |
|------|-------------|------|
| `singleRow` | At most one row selected | T1 |
| `multiRow` | Multiple rows via Ctrl/Cmd+click, checkbox, Shift+click range | T1 |
| `singleCell` | Focus-only cell navigation (no row highlight) | T1 (focus) |
| `range` | Rectangular cell range(s), Excel-like | T3 |

### 1.2 Separation of concerns

| Concept | Owner |
|---------|-------|
| **Focused cell** | Keyboard navigation anchor; may exist without row selection |
| **Row selection** | `selectedRowIds` set; drives row CSS and `getSelectedRows()` |
| **Cell range** | `selectedRanges: CellRange[]`; drives fill handle, clipboard |
| **Checkbox column** | Column type in `ColumnModel`; delegates toggle to `SelectionManager` |

---

## 2. Current Implementation Status

| Capability | Status | Location |
|------------|--------|----------|
| `rowSelection: 'single' \| 'multiple'` | **Implemented** | `options.ts`, `selection-manager.ts` |
| Row click selection | **Implemented** | `handleRowClickSelection` |
| Ctrl/Cmd multi-toggle on row click | **Implemented** | `multiSelect` param |
| Checkbox selection column | **Implemented** | `column-model.ts`, `dom-renderer.ts` |
| `getSelectedRows()` API | **Implemented** | `grid-engine.ts` |
| `selectionChanged` event | **Implemented** | `events.ts` |
| `focusedCell` in store | **Implemented** | `state.ts`, `grid-engine.ts` |
| `setFocusedCell` API | **Implemented** | `api.ts` |
| Shift+click row range selection | **Not implemented** | |
| Header checkbox select-all | **Not implemented** | |
| Filtered-aware select-all | **Not implemented** | |
| `deselectAll` / `selectAll` API | **Not implemented** | |
| `isRowSelected` / `getSelectedNodes` | **Not implemented** | |
| Cell range selection (mouse drag) | **Not implemented** | |
| Shift+arrow range extension | **Not implemented** | |
| `cellSelection` / `enableRangeSelection` option | **Not implemented** | |
| `onRowSelected` / `onCellSelectionChanged` | **Not implemented** | |
| `suppressRowClickSelection` | **Not implemented** | |
| `rowMultiSelectWithClick` | **Not implemented** | |

---

## 3. User Stories

### Tier 1 — Row selection & focus

| ID | Story | Priority |
|----|-------|----------|
| US-SEL-01 | As a user, I click a row to select it in single-selection mode | Must |
| US-SEL-02 | As a user, I Ctrl+click rows to add/remove from selection in multi mode | Must |
| US-SEL-03 | As a user, I use checkboxes in the first column to toggle row selection | Must |
| US-SEL-04 | As a user, arrow keys move a visible focus ring between cells without always selecting the row | Must |
| US-SEL-05 | As an app developer, I listen to `selectionChanged` to enable a bulk-delete toolbar | Must |
| US-SEL-06 | As an app developer, I call `api.getSelectedRows()` to get selected row data objects | Must |

### Tier 2 — Enhanced row selection

| ID | Story | Priority |
|----|-------|----------|
| US-SEL-07 | As a user, I Shift+click to select a contiguous range of rows | Should |
| US-SEL-08 | As a user, I click the header checkbox to select all visible (filtered) rows | Should |
| US-SEL-09 | As an app developer, I set `suppressRowClickSelection: true` so only checkboxes select | Should |
| US-SEL-10 | As an app developer, I use `rowSelection.selectAll: 'filtered'` so select-all skips hidden rows | Should |
| US-SEL-11 | As a user, Space toggles row selection when focus is on a row | Should |
| US-SEL-12 | As an app developer, I programmatically `selectAll()` / `deselectAll()` | Should |

### Tier 3 — Cell range selection

| ID | Story | Priority |
|----|-------|----------|
| US-SEL-13 | As a user, I drag across cells to select a rectangular range | Must |
| US-SEL-14 | As a user, I Shift+arrow extends the range from an anchor cell | Must |
| US-SEL-15 | As a user, I Ctrl+drag to add a second non-contiguous range | Should |
| US-SEL-16 | As an app developer, I read `api.getCellRanges()` for selected ranges | Must |
| US-SEL-17 | As a user, I copy a selected range with Ctrl+C (see clipboard.md) | Must |
| US-SEL-18 | As an app developer, `enableCellTextSelection` lets me select text inside a cell without range mode | Should |

---

## 4. Functional Requirements

### 4.1 Tier 1 — Row selection

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-SEL-01 | `rowSelection: 'single'` MUST allow at most one selected row ID in `selectedRowIds` | Must |
| REQ-SEL-02 | `rowSelection: 'multiple'` MUST allow multiple selected row IDs | Must |
| REQ-SEL-03 | Row click without modifier MUST replace selection with clicked row (multi mode) | Must |
| REQ-SEL-04 | Ctrl/Cmd+click MUST toggle row in multi mode without clearing others | Must |
| REQ-SEL-05 | Checkbox column MUST toggle row selection without triggering row click handler side effects | Must |
| REQ-SEL-06 | `api.getSelectedRows()` MUST return `TData[]` for selected IDs in current display order | Must |
| REQ-SEL-07 | `onSelectionChanged` MUST fire when selection set changes; batched once per tick | Must |
| REQ-SEL-08 | `focusedCell: { rowIndex, colId }` MUST update on click and keyboard nav independently of row selection | Must |
| REQ-SEL-09 | `api.setFocusedCell(rowIndex, colKey)` MUST scroll cell into view if needed | Must |
| REQ-SEL-10 | Selected rows MUST render with `--ol-grid-row-selected-bg` token | Must |
| REQ-SEL-11 | `aria-selected="true"` MUST be set on selected row elements | Must |
| REQ-SEL-12 | Re-clicking only selected row in single mode MUST NOT deselect (AG Grid behavior) | Must |
| REQ-SEL-13 | Selection MUST persist across scroll (selected IDs, not DOM state) | Must |
| REQ-SEL-14 | `getRowId` MUST be required when selection enabled and row data can reorder | Should |

### 4.2 Tier 2 — Enhanced row selection

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-SEL-20 | Shift+click MUST select inclusive row index range from anchor to target in multi mode | Should |
| REQ-SEL-21 | Selection anchor MUST update on plain click (non-shift) in multi mode | Should |
| REQ-SEL-22 | Header checkbox MUST toggle all rows matching `selectAll` scope | Should |
| REQ-SEL-23 | `rowSelection.selectAll: 'all' \| 'filtered' \| 'currentPage'` MUST control header checkbox scope | Should |
| REQ-SEL-24 | `suppressRowClickSelection: true` MUST prevent row click from changing selection | Should |
| REQ-SEL-25 | `rowMultiSelectWithClick: true` MUST toggle row on click without Ctrl in multi mode | Could |
| REQ-SEL-26 | Space key on focused row MUST toggle selection in multi mode | Should |
| REQ-SEL-27 | `api.selectAll()` / `api.deselectAll()` MUST update selection set | Should |
| REQ-SEL-28 | `api.setSelectedRows(ids)` MUST set selection by row ID | Should |
| REQ-SEL-29 | `onRowSelected` MUST fire per row with `{ node, isSelected }` | Should |
| REQ-SEL-30 | When filter changes, `rowSelection.clearSelectionOnFilter` MAY clear selection (default false) | Should |
| REQ-SEL-31 | Checkbox column `checkboxSelection` callback MAY disable checkbox per row | Should |
| REQ-SEL-32 | `headerCheckboxSelection` MUST support callback for disabled header checkbox | Should |

### 4.3 Tier 3 — Cell range selection

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-SEL-40 | `cellSelection: true` MUST enable mouse drag to define `CellRange` | Must |
| REQ-SEL-41 | `CellRange` MUST be `{ startRow, endRow, startColId, endColId, columns[] }` in display coordinates | Must |
| REQ-SEL-42 | Shift+arrow MUST extend range from `anchorCell` while `cellSelection` enabled | Must |
| REQ-SEL-43 | Ctrl+drag MUST add additional ranges to `selectedRanges[]` | Should |
| REQ-SEL-44 | Range selection MUST render semi-transparent overlay via `.ol-grid__range-selection` | Must |
| REQ-SEL-45 | `api.getCellRanges()` MUST return current ranges | Must |
| REQ-SEL-46 | `api.clearCellSelection()` MUST remove all ranges | Must |
| REQ-SEL-47 | `onCellSelectionChanged` MUST fire on range change | Must |
| REQ-SEL-48 | Range selection MUST work across pinned and center columns (split ranges if needed) | Should |
| REQ-SEL-49 | `enableCellTextSelection: true` MUST use native text selection; disable grid range + Ctrl+C cell copy | Should |
| REQ-SEL-50 | Canvas renderer MUST mirror range state in companion a11y DOM | Must |
| REQ-SEL-51 | Column header keyboard shortcuts (Ctrl+Enter select column) MAY match AG Grid | Could |

---

## 5. API & Events

### 5.1 Grid options

```typescript
type RowSelectionMode = 'single' | 'multiple';

interface RowSelectionOptions {
  mode: RowSelectionMode;
  selectAll?: 'all' | 'filtered' | 'currentPage';
  copySelectedRows?: boolean;           // clipboard integration
  enableClickSelection?: boolean;       // default true
  checkboxes?: boolean;                 // auto checkbox column
  headerCheckbox?: boolean;
  clearSelectionOnFilter?: boolean;
}

interface GridOptions<TData> {
  rowSelection?: RowSelectionMode | RowSelectionOptions;
  cellSelection?: boolean;
  suppressRowClickSelection?: boolean;
  rowMultiSelectWithClick?: boolean;
  enableCellTextSelection?: boolean;
  onSelectionChanged?: (event: SelectionChangedEvent) => void;
  onRowSelected?: (event: RowSelectedEvent<TData>) => void;
  onCellSelectionChanged?: (event: CellSelectionChangedEvent) => void;
}
```

### 5.2 Column definition (checkbox)

```typescript
interface ColumnDef<TData> {
  checkboxSelection?: boolean | ((params: CheckboxSelectionCallbackParams<TData>) => boolean);
  headerCheckboxSelection?: boolean | ((params: HeaderCheckboxSelectionCallbackParams) => boolean);
  showDisabledCheckboxes?: boolean;
}
```

### 5.3 State shape

```typescript
interface CellRange {
  id: string;
  startRow: number;
  endRow: number;
  columns: string[];  // colIds left-to-right
}

interface SelectionState {
  mode: 'singleRow' | 'multiRow' | 'singleCell' | 'range';
  selectedRowIds: Set<string>;
  selectedRanges: CellRange[];
  focusedCell: CellPosition | null;
  anchorCell: CellPosition | null;
  selectionAnchorRowId: string | null;  // for shift+click row range
}
```

### 5.4 GridApi

```typescript
interface GridApi<TData> {
  getSelectedRows(): TData[];
  getSelectedNodes(): RowNode<TData>[];
  isRowSelected(rowNode: RowNode<TData>): boolean;
  selectAll(mode?: 'all' | 'filtered' | 'currentPage'): void;
  deselectAll(): void;
  setSelectedRows(rowIds: string[]): void;
  setFocusedCell(rowIndex: number, colKey: string): void;
  getFocusedCell(): CellPosition | null;
  // T3
  getCellRanges(): CellRange[];
  clearCellSelection(): void;
  addCellRange(range: Partial<CellRange>): void;
}
```

### 5.5 Events

| Event | Payload | Tier |
|-------|---------|------|
| `selectionChanged` | `{ api, source, selectedRowIds }` | T1 |
| `rowSelected` | `{ api, node, isSelected, source }` | T2 |
| `cellSelectionChanged` | `{ api, ranges, finished }` | T3 |

---

## 6. AG Grid Parity

Reference: [AG Grid Row Selection](https://www.ag-grid.com/javascript-data-grid/row-selection/), [Cell Selection](https://www.ag-grid.com/javascript-data-grid/cell-selection/) (Enterprise)

| AG Grid feature | AG Grid tier | ol-grid | Notes |
|-----------------|--------------|---------|-------|
| `rowSelection.mode: singleRow` | Community | T1 | Map `single` → `singleRow` |
| `rowSelection.mode: multiRow` | Community | T1 | |
| Checkbox selection column | Community | T1 | |
| Header checkbox | Community | T2 | |
| `suppressRowClickSelection` | Community | T2 | |
| `rowMultiSelectWithClick` | Community | T2 | |
| `selectAll: 'filtered'` | Community | T2 | |
| `copySelectedRows` | Enterprise | T3 | With clipboard module |
| Cell range selection | **Enterprise** | **T3** | MIT differentiator |
| `enableCellTextSelection` | Community | T3 | Conflicts with range |
| Group row selection | Enterprise | T3 | With grouping module |

**Naming:** ol-grid uses `rowSelection: 'single' | 'multiple'` in current code; public API SHOULD alias AG Grid's `singleRow` / `multiRow` in docs.

---

## 7. Competitive Analysis

| Library | Selection model | ol-grid differentiation |
|---------|-----------------|-------------------------|
| **AG Grid** | Row + Enterprise cell range | MIT cell range at T3 |
| **TanStack Table** | `rowSelection` state only | Built-in checkbox column + UX |
| **MUI Data Grid** | Checkbox, row click, cell (Pro) | Framework-agnostic parity |
| **Glide Data Grid** | Range-native | ol-grid DOM + optional canvas |
| **Handsontable** | Spreadsheet selection default | Data grid mode less opinionated |

---

## 8. Tier Assignment

| Capability | Tier |
|------------|------|
| Single/multi row, checkbox, focus, getSelectedRows | T1 |
| Shift+click range, header checkbox, selectAll API, rowSelected | T2 |
| Cell range selection, multi-range, getCellRanges | T3 |

---

## 9. Acceptance Criteria

### 9.1 Tier 1

- [ ] Single mode: click row A, then row B → only B selected
- [ ] Multi mode: Ctrl+click A, B, C → three selected; Ctrl+click B → deselects B
- [ ] Checkbox toggles selection; row click still works per config
- [ ] `getSelectedRows()` returns correct `TData` objects
- [ ] Focus ring moves with arrow keys; `setFocusedCell` works
- [ ] `aria-selected` on selected rows; axe-core clean
- [ ] Selection survives scroll out and back

### 9.2 Tier 2

- [ ] Shift+click row 3 to 7 selects five rows
- [ ] Header checkbox selects all filtered rows when `selectAll: 'filtered'`
- [ ] `suppressRowClickSelection`: only checkbox changes selection
- [ ] `selectAll()` / `deselectAll()` API works

### 9.3 Tier 3

- [ ] Drag selects 3×4 cell block with visible overlay
- [ ] Shift+arrow extends range from anchor
- [ ] `getCellRanges()` matches visual selection
- [ ] Ctrl+C copies range (clipboard.md)
- [ ] Canvas renderer: range visible + a11y DOM in sync

---

## 10. Dependencies

| Dependency | Role |
|------------|------|
| `@ol-grid/core` | `SelectionManager`, store slice |
| `@ol-grid/dom-renderer` | Checkbox UI, focus ring, range overlay |
| `@ol-grid/filter` | Filtered select-all scope |
| `@ol-grid/clipboard` | Copy selected rows/ranges |
| `@ol-grid/keyboard-navigation` | Space, Shift+arrow |
| `getRowId` option | Stable IDs across reorder |

---

## 11. Open Questions

| # | Question | Options | Recommendation |
|---|----------|---------|----------------|
| OQ-SEL-01 | Deselect on second click in single mode? | AG Grid no / some grids yes | Match AG Grid (no deselect) |
| OQ-SEL-02 | Auto-add checkbox column vs explicit colDef | Auto / explicit | Explicit `checkboxSelection: true` on column (current) |
| OQ-SEL-03 | Cell range + row selection simultaneous? | Independent / mutually exclusive | Independent; clipboard prefers range |
| OQ-SEL-04 | Selection store `Set` serialization | Array in JSON snapshot | Serialize as `string[]` |
| OQ-SEL-05 | Group row selection semantics | Select children / select group row | Defer to grouping module |

---

## 12. References

- [REQUIREMENTS.md §4.1.4](../REQUIREMENTS.md) — T1-SEL-* IDs
- [REQUIREMENTS.md §4.3.3](../REQUIREMENTS.md) — T3-SEL-01 range selection
- [ARCHITECTURE.md §3.5](../ARCHITECTURE.md) — SelectionManager
- [AG Grid Row Selection](https://www.ag-grid.com/javascript-data-grid/row-selection/)
- [AG Grid Cell Selection](https://www.ag-grid.com/javascript-data-grid/cell-selection/)
- Implementation: `packages/core/src/selection/`

---

*Authoritative for selection scope.*

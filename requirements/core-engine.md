# ol-grid — Core Engine Requirements

> Package: `@ol-grid/core`  
> Parent: [REQUIREMENTS.md](../REQUIREMENTS.md) · [ARCHITECTURE.md](../ARCHITECTURE.md)  
> **Document version:** 1.0 · **Last updated:** June 2026 · **Status:** Draft

---

## 1. Overview

The core engine is the **headless, framework-agnostic** foundation of ol-grid. It owns all grid logic: state, column model, row models, virtualization math, selection, editing control, events, and the imperative `GridApi`. Renderers and framework adapters consume core output; they MUST NOT duplicate business rules.

### 1.1 Scope

| In scope | Out of scope |
|----------|--------------|
| `GridStore`, `GridEngine`, `GridApi` | DOM nodes, CSS, canvas paint |
| Column model & column state | Framework reactivity |
| Client-side row model (CSRM) | Infinite / server-side row models (Tier 2–3) |
| Row virtualization math | Column virtualization (Tier 3) |
| Selection & focus state machine | Clipboard serialization (Tier 3 module) |
| Edit state machine (commit/cancel) | Editor UI mounting |
| Event bus & lifecycle | Theme tokens application |
| Module registry skeleton | Full plugin host (Tier 3) |
| Quick filter (basic) | Per-column filter UI (Tier 2 `@ol-grid/filter`) |
| CSV generation helpers | File download (renderer concern) |

### 1.2 Design constraints (non-negotiable)

| ID | Constraint |
|----|------------|
| CE-NFR-01 | Zero third-party **runtime** dependencies in `@ol-grid/core` |
| CE-NFR-02 | All state mutations via `GridStore.dispatch` — no renderer writes to store |
| CE-NFR-03 | Serializable state slices (JSON-safe except `Set` → array on export) |
| CE-NFR-04 | Tree-shakeable; `sideEffects: false` in package.json |
| CE-NFR-05 | Strict TypeScript; generics preserve `TData` end-to-end |

---

## 2. AG Grid Parity Reference

| AG Grid capability | ol-grid REQ | Tier | Current status |
|--------------------|-------------|------|----------------|
| `GridOptions` / `GridApi` | CE-API-* | T1 | Partial — subset implemented |
| Client-side row model | CE-RM-* | T1 | Implemented |
| Column defs & state | CE-COL-* | T1 | Partial — no groups, no right pin |
| Row virtualization | CE-VIRT-* | T1 | Row-only; no column virt |
| Single-column sort | CE-SORT-* | T1 | Implemented |
| Multi-column sort | CE-SORT-10 | T2 | Not started |
| Row selection | CE-SEL-* | T1 | Partial — single/multi row |
| Cell focus & keyboard nav | CE-SEL-08 | T1 | Partial — engine only |
| Inline editing | CE-EDIT-* | T2 | Partial — text commit path |
| `ModuleRegistry` | CE-MOD-* | T1 | Skeleton only |
| `forEachNode` / `getRowNode` | CE-RM-06 | T2 | Partial |
| Quick filter | CE-FLT-01 | T2 | Implemented |
| Transactions | CE-RM-07 | T2 | Not started |
| Infinite / SSRM | CE-RM-10+ | T2–T3 | Not started |

---

## 3. GridStore Requirements

### 3.1 State shape

**REQ-CE-STORE-01** — `GridState` MUST include at minimum:

```
gridId, rowDataVersion, rowCount, columns, columnGroupState,
scrollTop, scrollLeft, viewportWidth, viewportHeight,
focusedCell, editing, quickFilterText, rowModelType, rowModelMeta
```

**REQ-CE-STORE-02** — Optional slices (`selection`, `sorting`, `filtering`, `pagination`, `expansion`) MUST be added only when the corresponding feature is active; absent slices MUST NOT be required for render.

**REQ-CE-STORE-03** — `rowDataVersion` MUST increment on full data replace and successful cell commits to allow renderers to detect stale cell content.

### 3.2 Store API

**REQ-CE-STORE-04** — `GridStore` MUST expose: `getState()`, `subscribe(listener)`, `dispatch(action)`, `batch(fn)`, `select(selector)`.

**REQ-CE-STORE-05** — `batch()` MUST coalesce subscriber notifications to a single flush when nested batch depth returns to zero.

**REQ-CE-STORE-06** — `select()` MUST read current state synchronously; memoization of selectors is adapter/renderer responsibility in v1.

**REQ-CE-STORE-07** — Reducers MUST be pure functions: `(state, action) => state`; no side effects inside reducers.

### 3.3 Actions (minimum set)

| REQ-ID | Action | Payload |
|--------|--------|---------|
| REQ-CE-STORE-10 | `SET_SCROLL` | `scrollTop`, `scrollLeft` |
| REQ-CE-STORE-11 | `SET_VIEWPORT` | `width`, `height` |
| REQ-CE-STORE-12 | `SET_ROW_COUNT` | `rowCount` |
| REQ-CE-STORE-13 | `SET_COLUMNS` | `columns: ColumnState[]` |
| REQ-CE-STORE-14 | `SET_SELECTION` | `selection: SelectionState` |
| REQ-CE-STORE-15 | `SET_FOCUSED_CELL` | `focusedCell \| null` |
| REQ-CE-STORE-16 | `SET_EDITING` | `editing \| null` |
| REQ-CE-STORE-17 | `SET_QUICK_FILTER` | `quickFilterText` |
| REQ-CE-STORE-18 | `BUMP_ROW_DATA_VERSION` | — |

**REQ-CE-STORE-19** — Feature modules MAY register additional action types via documented extension; core MUST NOT hard-code module-specific branches in the base reducer (target: slice reducers composed at registration).

### 3.4 Controlled / uncontrolled mode

**REQ-CE-STORE-20** — Each state slice (sort, filter, selection) MUST support controlled mode: external value passed via `GridOptions` overrides store on change; uncontrolled mode when option omitted.

**REQ-CE-STORE-21** — `getStateSnapshot()` MUST return a JSON-serializable object (Sets converted to arrays) for persistence and SSR hydration planning.

---

## 4. GridEngine Requirements

### 4.1 Lifecycle

**REQ-CE-ENG-01** — `GridEngine` constructor accepts `GridOptions<TData>` and initializes store, column model, row model, and `GridApi`.

**REQ-CE-ENG-02** — `mount(host, renderer)` MUST: subscribe store → `refresh()`, call `renderer.mount()`, fire `onGridReady`, call initial `refresh()`.

**REQ-CE-ENG-03** — `unmount()` MUST unsubscribe, call `renderer.unmount()`, clear `lastFrame`; MUST NOT destroy engine.

**REQ-CE-ENG-04** — `destroy()` MUST be idempotent; unmount + clear event bus; subsequent `mount` MUST throw.

**REQ-CE-ENG-05** — `setGridOption(key, value)` MUST update internal options and apply side effects (e.g. `rowData` → row model refresh).

### 4.2 Render frame pipeline

**REQ-CE-ENG-06** — `refresh()` MUST compute `VirtualRange` (rows), resolve visible columns, build `RenderFrame`, and call `renderer.renderFrame(frame)`.

**REQ-CE-ENG-07** — `RenderFrame` MUST include: `virtualRange`, `rowHeight`, `rowOffset`, `totalHeight`, `totalWidth`, `pinnedLeftWidth`, `centerWidth`, `columns`, `pinnedLeftColumns`, `centerColumns`, `rows`, `selectedRowIds`, `focusedCell`, `editing`.

**REQ-CE-ENG-08** — Row cells MUST carry: `colId`, `value`, optional `editable`, optional `isSelectionColumn`, optional `selected` (checkbox).

**REQ-CE-ENG-09** — `refresh()` MUST skip renderer call when `destroyed` or renderer not mounted.

**REQ-CE-ENG-10** — Viewport change events (`viewportChanged`) MUST emit only when virtual row range or total dimensions change.

### 4.3 Value pipeline

**REQ-CE-ENG-11** — Display path: `valueGetter` → `valueFormatter` (formatter MUST NOT mutate data).

**REQ-CE-ENG-12** — Edit path: raw input → optional `valueParser` (T2) → `valueSetter` → `onCellValueChanged`.

**REQ-CE-ENG-13** — `valueSetter` returning `false` MUST reject commit and preserve prior value.

**REQ-CE-ENG-14** — Default cell display MUST escape HTML; raw HTML only when `dangerouslyAllowHtml: true` on column def (security REQ from parent NFR-S-01).

---

## 5. Column Model Requirements

**REQ-CE-COL-01** — Accept `columnDefs` with `field`, `headerName`, `width`, `minWidth`, `maxWidth`, `flex`, `pinned`, `hide`, `sortable`, `editable`, value pipeline callbacks.

**REQ-CE-COL-02** — Every column MUST have stable `colId` (explicit `id` or derived from `field` + index).

**REQ-CE-COL-03** — `ColumnState` tracks runtime: `width`, `hide`, `pinned`, `sort`, `sortIndex`.

**REQ-CE-COL-04** — Pin regions: `left` pinned + `center` scrollable; **right pin** — REQ-CE-COL-05 (T1, not yet implemented).

**REQ-CE-COL-05** — Right-pinned columns MUST mirror left-pin viewport split (Tier 1 completion item).

**REQ-CE-COL-06** — Flex columns MUST distribute remaining viewport width after fixed-width columns.

**REQ-CE-COL-07** — Selection checkbox column (`__selection__`) MUST be injected when `rowSelection: 'multiple'`; excluded from navigable columns.

**REQ-CE-COL-08** — `resizeColumn(colId, width, finished)` MUST respect `minWidth` / `maxWidth` and emit `onColumnResized`.

**REQ-CE-COL-09** — `autoSizeColumn(colId)` MUST measure header + cell content (canvas measure or DOM probe) and set width.

**REQ-CE-COL-10** — Column groups (`children` in defs) — Tier 2; flatten to leaves with group header state.

**REQ-CE-COL-11** — `applyColumnState()` on `GridApi` — Tier 2; merge programmatic width/order/pin/visibility.

---

## 6. Row Model Requirements (CSRM)

**REQ-CE-RM-01** — Default `rowModelType` is `clientSide`; accepts in-memory `rowData: TData[]`.

**REQ-CE-RM-02** — Pipeline order: raw data → quick filter → sort → (future: group) → displayed rows.

**REQ-CE-RM-03** — `RowNode` MUST expose: `id`, `data`, `rowIndex`, `selected` (derived), `level`, `group`, `expanded`, `parent`, `childrenAfterGroup`, `aggData`, `stub`.

**REQ-CE-RM-04** — Row IDs from `getRowId` callback or fallback `String(index)`.

**REQ-CE-RM-05** — `getRowAt(displayIndex)` returns node after pipeline transforms.

**REQ-CE-RM-06** — `getRowById`, `forEachNode`, `getAllFilteredNodes` MUST traverse displayed row set.

**REQ-CE-RM-07** — `applyTransaction({ add, update, remove })` — Tier 2; targeted mutations without full array replace.

**REQ-CE-RM-08** — Infinite row model — Tier 2; block cache, LRU, stale request tokens.

**REQ-CE-RM-09** — Server-side row model — Tier 3; sparse store, group keys, loading stubs.

---

## 7. Virtualizer Requirements

**REQ-CE-VIRT-01** — `computeRowVirtualRange` MUST return `rowStart`, `rowEnd`, `rowOffset`, `totalHeight` for fixed row height.

**REQ-CE-VIRT-02** — Default `overscanRowCount` = 5 (configurable via `GridOptions`).

**REQ-CE-VIRT-03** — Dynamic row height — Tier 2; prefix-sum + binary search + measurement cache fed by `renderer.reportRowHeight`.

**REQ-CE-VIRT-04** — Column virtualization — Tier 3; `colStart`/`colEnd` in `VirtualRange` currently stubbed to all columns.

**REQ-CE-VIRT-05** — Imperative scroll API: `ensureIndexVisible`, `scrollToRow` — Tier 2.

---

## 8. Sorting Requirements

**REQ-CE-SORT-01** — Single-column sort cycle: none → asc → desc → none on header action.

**REQ-CE-SORT-02** — Sort state stored in `ColumnState.sort` and `sortIndex`.

**REQ-CE-SORT-03** — Custom `comparator` per column def supported.

**REQ-CE-SORT-04** — `getSortModel()` / `setSortModel()` on `GridApi` — Tier 1 (setSortModel not yet on API).

**REQ-CE-SORT-05** — Emit `onSortChanged` with `source` discriminator.

**REQ-CE-SORT-06** — Sort module (`@ol-grid/sort`) MAY be extracted; until then sort lives in core.

**REQ-CE-SORT-10** — Multi-column sort (shift-click, sort index) — Tier 2.

---

## 9. Selection & Focus Requirements

**REQ-CE-SEL-01** — Modes: `singleRow`, `multiRow` (T1); `singleCell`, `range` (T3).

**REQ-CE-SEL-02** — `rowSelection: 'single' | 'multiple'` maps to modes.

**REQ-CE-SEL-03** — Row click with Ctrl/Cmd toggles multi-select; single mode replaces selection.

**REQ-CE-SEL-04** — Checkbox column toggles row in multi mode only.

**REQ-CE-SEL-05** — `getSelectedRows()` returns `TData[]` for selected IDs.

**REQ-CE-SEL-06** — `setFocusedCell(rowIndex, colKey)` clamps to valid range; syncs `selection.focusedCell`.

**REQ-CE-SEL-07** — `moveFocusedCell(deltaRow, deltaCol)` for keyboard navigation.

**REQ-CE-SEL-08** — Page Up/Down, Home/End — Tier 1 completion (renderer dispatches; engine implements).

**REQ-CE-SEL-09** — Emit `onSelectionChanged` with `source`.

---

## 10. Editing Requirements

**REQ-CE-EDIT-01** — Single active edit cell; state in `EditingState { activeCell, editValue }`.

**REQ-CE-EDIT-02** — `startEditingCell(rowIndex, colKey)` returns `false` if not editable or selection column.

**REQ-CE-EDIT-03** — `updateEditValue(string)` during active edit.

**REQ-CE-EDIT-04** — `stopEditing(cancel)` — cancel discards; commit runs value pipeline.

**REQ-CE-EDIT-05** — `editable` boolean or callback per column.

**REQ-CE-EDIT-06** — Tab / Shift+Tab to next editable cell — Tier 2.

**REQ-CE-EDIT-07** — Type-to-edit (printable key starts edit) — Tier 2.

---

## 11. Events & EventBus

**REQ-CE-EVT-01** — `EventBus` supports `on`, `off`, `emit`, `clear`.

**REQ-CE-EVT-02** — Grid option callbacks (`onGridReady`, `onCellValueChanged`, etc.) AND internal handlers MUST both run.

**REQ-CE-EVT-03** — Event payloads MUST include `api` and typed context (`node`, `colDef`, `data` as applicable).

**REQ-CE-EVT-04** — Batched store updates MUST emit at most one event per concern per batch.

---

## 12. Module Registry

**REQ-CE-MOD-01** — `ModuleRegistry.register(...modules)` stores modules by `name`.

**REQ-CE-MOD-02** — `GridModule` interface MUST expand to: `onGridCreate`, `onGridDestroy`, `storeSlices`, `reducers`, `rowModelStages`, `apiExtensions` (Tier 1 skeleton → Tier 2 full).

**REQ-CE-MOD-03** — Importing a module without registering MUST NOT add runtime cost (tree-shaking).

**REQ-CE-MOD-04** — TypeScript module augmentation for `GridApi` per feature package.

---

## 13. Current Implementation Notes

As of June 2026, `@ol-grid/core` implements:

- Custom `createGridStore` (not `@tanstack/store` — OQ-3 in parent doc open)
- `GridEngine` with CSRM, single-column sort, quick filter, selection, basic editing
- Row virtualization only; pinned-left + center columns
- `ModuleRegistry` name-only registration
- `exportDataAsCsv` on API delegating to `generateCsv` + `downloadCsvContent`
- Default row height 32px; overscan 5

**Gaps vs this spec:** right pin, multi-sort, `setSortModel`, column groups, controlled slices, full module hooks, `applyColumnState`, transactions, infinite/SSRM, Page Up/Down navigation in engine.

---

## 14. Acceptance Criteria

### Tier 1 exit (core)

- [ ] AC-CE-01: Unit tests ≥90% coverage on store, virtualizer, column model, CSRM
- [ ] AC-CE-02: 100k rows × 20 cols — `refresh()` completes within frame budget when only range changes
- [ ] AC-CE-03: `pnpm why` shows zero runtime deps for `@ol-grid/core`
- [ ] AC-CE-04: `destroy()` leaves zero store subscribers
- [ ] AC-CE-05: Sort, select, focus behavior identical whether driven by `GridApi` or options sync

### Tier 2 exit (core extensions)

- [ ] AC-CE-06: Infinite row model passes stale-response integration test
- [ ] AC-CE-07: `applyTransaction` updates visible range without full re-sort unless needed
- [ ] AC-CE-08: Controlled `sortModel` / `filterModel` props match imperative API

---

## 15. Open Questions

| ID | Question | Recommendation |
|----|----------|----------------|
| OQ-CE-01 | Adopt `@tanstack/store` vs custom | Evaluate at Tier 2; custom sufficient for T1 |
| OQ-CE-02 | `Set` in state vs array | Keep `Set` internally; snapshot converts |
| OQ-CE-03 | Sort in core vs `@ol-grid/sort` | Extract when module registry supports stages |

---

*Authoritative for `@ol-grid/core`. Conflicts with [REQUIREMENTS.md](../REQUIREMENTS.md) resolved by amending parent doc.*

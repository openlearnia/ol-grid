# Feature: Grid API & Events

> **Status:** Draft  
> **Tier:** T1 (core API); T2–T3 (extended methods via modules)  
> **Package(s):** `@ol-grid/core`, framework adapters  
> **Parent:** [REQUIREMENTS.md](../REQUIREMENTS.md) §4, §6  
> **Architecture:** [ARCHITECTURE.md](../ARCHITECTURE.md) §3, §4, Appendix A  
> **Last updated:** 2026-06-18

---

## 1. Summary

ol-grid exposes a **dual control surface**: declarative configuration via `GridOptions<TData>` and imperative control via `GridApi<TData>`. Every state slice (sort, filter, selection, column state, etc.) MUST be reachable through both paths with identical outcomes. Events provide a typed, AG Grid–familiar callback layer; a complementary `subscribe` API enables programmatic listeners without prop drilling. This document specifies the public contract for `GridOptions`, `GridApi`, `ColDef`, `ColumnState`, `RowNode`, and the full event system.

## 2. Goals

| ID | Goal |
|----|------|
| G-01 | Provide a single, framework-agnostic configuration surface (`GridOptions`) usable from React, Vue, Angular, Svelte, and vanilla JS |
| G-02 | Expose imperative `GridApi` methods that mirror declarative options and controlled-mode props |
| G-03 | Maintain AG Grid–aligned naming for familiar types (`columnDefs`, `rowData`, `onGridReady`, `colDef`, `rowNode`) where semantics match |
| G-04 | Support both callback (`onX`) and subscribe (`api.addEventListener`) patterns for all lifecycle and interaction events |
| G-05 | Preserve end-to-end row data typing via `GridOptions<TData>` generics |
| G-06 | Allow feature modules to extend `GridApi` via TypeScript module augmentation without breaking core types |

## 3. Non-Goals

| Item | Rationale |
|------|-----------|
| Framework-specific prop naming (e.g. `onGrid-ready` vs `onGridReady`) | Adapter concern; core uses camelCase |
| Duplicate state in framework adapters | Store is single source of truth per ARCHITECTURE.md §4 |
| AG Grid Enterprise-only APIs in core | Provided by Tier 3 modules or compat shim (see `ag-grid-migration.md`) |
| Synchronous DOM access from `GridApi` | Renderers own DOM; API returns data/state only |

## 4. User Stories

| ID | As a… | I want… | So that… |
|----|-------|---------|----------|
| US-01 | Application developer | to configure the grid with `columnDefs` and `rowData` | I can render a table in under 30 minutes |
| US-02 | Application developer | to call `api.setSortModel()` after mount | I can drive the grid from external UI (toolbar, URL params) |
| US-03 | React developer | `onGridReady` to receive `api` and controlled `sorting` prop to stay in sync | I can use declarative or imperative patterns interchangeably |
| US-04 | Library author | to subscribe to `sortChanged` without GridOptions callbacks | I can compose plugins without modifying app config |
| US-05 | AG Grid migrator | `colDef.field`, `valueGetter`, `valueFormatter` to work as expected | migration requires minimal mapping |
| US-06 | TypeScript user | `GridOptions<MyRow>` to type-check `valueGetter` params | I catch data shape errors at compile time |

## 5. Functional Requirements

### 5.1 GridOptions — core

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| API-GO-01 | `GridOptions<TData>` MUST accept `columnDefs: ColDef<TData>[]` | Must | T1 |
| API-GO-02 | `GridOptions<TData>` MUST accept `rowData: TData[]` for client-side row model | Must | T1 |
| API-GO-03 | `GridOptions` MUST accept `rowModelType: 'clientSide' \| 'infinite' \| 'serverSide'` (default `'clientSide'`) | Must | T1 |
| API-GO-04 | `GridOptions` MUST accept `context: unknown` passed unchanged to all callbacks | Must | T1 |
| API-GO-05 | `GridOptions` MUST accept `getRowId: (params) => string` for stable row identity | Must | T1 |
| API-GO-06 | `GridOptions` MUST accept `defaultColDef: ColDef<TData>` merged into every column | Must | T1 |
| API-GO-07 | `GridOptions` MUST accept `theme` / `className` / `style` for renderer theming | Must | T1 |
| API-GO-08 | `GridOptions` MUST accept `modules: GridModule[]` for explicit module registration | Must | T1 |
| API-GO-09 | `GridOptions` MUST accept `rowHeight: number` and optional `getRowHeight: (params) => number` | Must | T1 / T2 |
| API-GO-10 | `GridOptions` MUST accept `localeText: Partial<LocaleText>` for i18n overrides | Must | T2 |
| API-GO-11 | `GridOptions` MUST accept `suppressVirtualization: boolean` escape hatch for small datasets | Should | T2 |

### 5.2 GridOptions — selection & interaction

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| API-GO-20 | `rowSelection: 'single' \| 'multiple' \| 'none'` (maps to `singleRow` / `multiRow`) | Must | T1 |
| API-GO-21 | `suppressRowClickSelection: boolean` | Must | T1 |
| API-GO-22 | `enableCellTextSelection: boolean` | Should | T2 |
| API-GO-23 | `navigateToNextCell` / `tabToNextCell` custom navigation callbacks | Should | T2 |
| API-GO-24 | `rowSelection: 'range'` for cell range selection | Must | T3 |

### 5.3 GridOptions — controlled mode slices

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| API-GO-30 | Each state slice MUST support controlled mode via dedicated option + change callback | Must | T2 |
| API-GO-31 | `sortModel` + `onSortModelChange` controlled pair | Must | T1/T2 |
| API-GO-32 | `filterModel` + `onFilterModelChange` controlled pair | Must | T2 |
| API-GO-33 | `selectedRowIds` + `onSelectionChange` controlled pair | Must | T2 |
| API-GO-34 | `columnState` + `onColumnStateChange` controlled pair | Should | T2 |
| API-GO-35 | Controlled value MUST win over internal store on each render tick | Must | T2 |
| API-GO-36 | Imperative API calls in controlled mode MUST invoke change callback with new value | Must | T2 |

### 5.4 GridApi — core methods

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| API-GA-01 | `getGridOption<K>(key: K): GridOptions[K]` | Must | T1 |
| API-GA-02 | `setGridOption<K>(key: K, value: GridOptions[K]): void` | Must | T1 |
| API-GA-03 | `updateGridOptions(partial: Partial<GridOptions>): void` batched | Must | T1 |
| API-GA-04 | `getDisplayedRowCount(): number` | Must | T1 |
| API-GA-05 | `getRowNode(id: string): RowNode<TData> \| undefined` | Must | T1 |
| API-GA-06 | `forEachNode(callback): void` — all nodes in display order | Must | T1 |
| API-GA-07 | `forEachNodeAfterFilterAndSort(callback): void` | Must | T2 |
| API-GA-08 | `setFocusedCell(rowIndex, colKey): void` | Must | T1 |
| API-GA-09 | `getFocusedCell(): CellPosition \| null` | Must | T1 |
| API-GA-10 | `ensureIndexVisible(rowIndex, position?): void` | Must | T1 |
| API-GA-11 | `ensureColumnVisible(colKey): void` | Must | T1 |
| API-GA-12 | `refreshCells(params?: RefreshCellsParams): void` | Must | T1 |
| API-GA-13 | `redrawRows(params?: RedrawRowsParams): void` | Must | T2 |
| API-GA-14 | `applyTransaction(transaction: RowDataTransaction<TData>): RowDataTransactionResult` | Should | T2 |
| API-GA-15 | `setRowData(rowData: TData[]): void` | Must | T1 |
| API-GA-16 | `showLoadingOverlay() / hideOverlay() / showNoRowsOverlay()` | Should | T2 |
| API-GA-17 | `sizeColumnsToFit(): void` | Should | T2 |
| API-GA-18 | `autoSizeColumns(colKeys?: string[]): void` | Should | T2 |
| API-GA-19 | `getState(): GridState` — serializable snapshot | Must | T2 |
| API-GA-20 | `setState(state: GridState): void` — restore snapshot | Must | T2 |
| API-GA-21 | `destroy(): void` — cleanup listeners, unmount renderer | Must | T1 |

### 5.5 ColumnApi (subset on GridApi or separate)

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| API-CA-01 | `getColumnDef(colKey): ColDef \| null` | Must | T1 |
| API-CA-02 | `getColumnState(): ColumnState[]` | Must | T1 |
| API-CA-03 | `applyColumnState(params: ApplyColumnStateParams): boolean` | Must | T1 |
| API-CA-04 | `setColumnWidth(colKey, width, finished?: boolean)` | Must | T1 |
| API-CA-05 | `moveColumn(colKey, toIndex): void` | Should | T2 |
| API-CA-06 | `setColumnVisible(colKey, visible): void` | Must | T2 |
| API-CA-07 | `getAllDisplayedColumns(): Column[]` | Must | T1 |
| API-CA-08 | `getDisplayedLeft/Center/RightColumns()` | Must | T1 |

> **Decision:** `ColumnApi` methods MAY be namespaced on `GridApi` (AG Grid v28+ style) or exposed as `api.columnApi` for migration. Both MUST be supported in compat shim.

### 5.6 ColDef

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| API-CD-01 | `field?: keyof TData & string` for direct property access | Must | T1 |
| API-CD-02 | `colId?: string` — explicit stable id; default derived from `field` | Must | T1 |
| API-CD-03 | `headerName?: string`; fallback to `field` | Must | T1 |
| API-CD-04 | `width`, `minWidth`, `maxWidth`, `flex`, `initialWidth` | Must | T1 |
| API-CD-05 | `pinned?: 'left' \| 'right' \| null` | Must | T1 |
| API-CD-06 | `hide?: boolean` | Must | T1 |
| API-CD-07 | `sortable?: boolean` (default true when sort module registered) | Must | T1 |
| API-CD-08 | `filter?: boolean \| string \| FilterDef` | Must | T2 |
| API-CD-09 | `editable?: boolean \| EditableCallback` | Must | T2 |
| API-CD-10 | `valueGetter`, `valueSetter`, `valueFormatter`, `valueParser` | Must | T1/T2 |
| API-CD-11 | `cellRenderer`, `cellEditor`, `headerComponent` (string key or component def) | Must | T1/T2 |
| API-CD-12 | `cellClass`, `cellStyle`, `headerClass` (string or callback) | Should | T2 |
| API-CD-13 | `tooltipValueGetter`, `headerTooltip` | Should | T2 |
| API-CD-14 | `children?: ColDef[]` for column groups | Must | T2 |
| API-CD-15 | `marryChildren?: boolean` for column groups | Should | T2 |
| API-CD-16 | `checkboxSelection`, `headerCheckboxSelection` | Must | T1 |
| API-CD-17 | `rowGroup`, `enableRowGroup`, `aggFunc` | Must | T3 |
| API-CD-18 | `pivot`, `enablePivot` | Must | T3 |
| API-CD-19 | `resizable?: boolean` (default true) | Must | T1 |
| API-CD-20 | `suppressMovable`, `lockPosition`, `lockVisible` | Should | T2 |
| API-CD-21 | `comparator?: (a, b, nodeA, nodeB, isDescending) => number` | Must | T1 |
| API-CD-22 | `type?: string \| string[]` — column type presets (`numericColumn`, etc.) | Should | T2 |
| API-CD-23 | `meta?: Record<string, unknown>` for app-specific metadata | Must | T1 |

### 5.7 RowNode

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| API-RN-01 | `id: string`, `data: TData`, `rowIndex: number` | Must | T1 |
| API-RN-02 | `selected: boolean`, `displayed: boolean` | Must | T1 |
| API-RN-03 | `group: boolean`, `expanded: boolean`, `level: number` | Must | T3 |
| API-RN-04 | `parent`, `childrenAfterGroup`, `aggData` | Must | T3 |
| API-RN-05 | `stub: boolean` for loading placeholders (infinite/SSRM) | Must | T2/T3 |
| API-RN-06 | `setData(data)`, `setDataValue(colKey, value)` imperative helpers | Should | T2 |

### 5.8 Events — callback API (`GridOptions`)

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| API-EV-01 | All events use `on[EventName]` camelCase on `GridOptions` | Must | T1 |
| API-EV-02 | Handler signature: `(event: TypedEvent) => void` | Must | T1 |
| API-EV-03 | Event object MUST include `api: GridApi`, `context`, and type-specific payload | Must | T1 |
| API-EV-04 | User handlers and internal handlers MUST both run (no mutual exclusion) | Must | T1 |
| API-EV-05 | Multiple handlers via `onX` + `addEventListener` MUST all fire | Must | T1 |
| API-EV-06 | Batched state changes emit one event per concern, not per cell | Must | T1 |

### 5.9 Events — subscribe API (`GridApi`)

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| API-EV-10 | `addEventListener(type, listener): void` | Must | T1 |
| API-EV-11 | `removeEventListener(type, listener): void` | Must | T1 |
| API-EV-12 | `addGlobalListener(listener): void` — receives all events | Should | T2 |
| API-EV-13 | Listener MUST receive same typed payload as callback API | Must | T1 |
| API-EV-14 | Listeners MUST be removed on `destroy()` | Must | T1 |
| API-EV-15 | `once` option or `addEventListener(type, fn, { once: true })` | Should | T2 |

### 5.10 Tier 1 event catalog

| Event | GridOptions callback | Priority |
|-------|---------------------|----------|
| `gridReady` | `onGridReady` | Must |
| `gridSizeChanged` | `onGridSizeChanged` | Must |
| `firstDataRendered` | `onFirstDataRendered` | Must |
| `rowDataUpdated` | `onRowDataUpdated` | Must |
| `cellClicked` | `onCellClicked` | Must |
| `cellDoubleClicked` | `onCellDoubleClicked` | Must |
| `rowClicked` | `onRowClicked` | Must |
| `rowDoubleClicked` | `onRowDoubleClicked` | Must |
| `selectionChanged` | `onSelectionChanged` | Must |
| `sortChanged` | `onSortChanged` | Must |
| `columnResized` | `onColumnResized` | Must |
| `columnMoved` | `onColumnMoved` | Should (T2) |
| `displayedColumnsChanged` | `onDisplayedColumnsChanged` | Must |
| `bodyScroll` | `onBodyScroll` | Should |
| `cellFocused` | `onCellFocused` | Must |

### 5.11 Tier 2+ event catalog

| Event | GridOptions callback | Tier |
|-------|---------------------|------|
| `filterChanged` | `onFilterChanged` | T2 |
| `cellValueChanged` | `onCellValueChanged` | T2 |
| `cellEditingStarted` | `onCellEditingStarted` | T2 |
| `cellEditingStopped` | `onCellEditingStopped` | T2 |
| `rowValueChanged` | `onRowValueChanged` | T3 |
| `paginationChanged` | `onPaginationChanged` | T2 |
| `modelUpdated` | `onModelUpdated` | T2 |
| `viewportChanged` | `onViewportChanged` | T2 |
| `beforeCopy` / `beforePaste` | hooks with veto | T3 |
| `rangeSelectionChanged` | `onRangeSelectionChanged` | T3 |
| `rowGroupOpened` | `onRowGroupOpened` | T3 |
| `columnRowGroupChanged` | `onColumnRowGroupChanged` | T3 |

## 6. API Surface

### 6.1 Core types (exported from `@ol-grid/core`)

```typescript
interface GridOptions<TData = unknown> {
  // Data
  columnDefs?: ColDef<TData>[];
  rowData?: TData[];
  rowModelType?: 'clientSide' | 'infinite' | 'serverSide';
  getRowId?: (params: GetRowIdParams<TData>) => string;
  defaultColDef?: ColDef<TData>;
  context?: unknown;

  // Layout
  rowHeight?: number;
  getRowHeight?: (params: RowHeightParams<TData>) => number;
  headerHeight?: number;
  suppressVirtualization?: boolean;

  // Selection
  rowSelection?: 'single' | 'multiple' | 'none';
  suppressRowClickSelection?: boolean;

  // Modules
  modules?: GridModule[];

  // Theming
  theme?: string;
  className?: string;

  // Controlled slices (T2)
  sortModel?: SortModel;
  onSortModelChange?: (model: SortModel) => void;
  filterModel?: FilterModel;
  onFilterModelChange?: (model: FilterModel) => void;

  // Events (subset — full list in §5.10–5.11)
  onGridReady?: (event: GridReadyEvent<TData>) => void;
  onCellClicked?: (event: CellClickedEvent<TData>) => void;
  onSelectionChanged?: (event: SelectionChangedEvent<TData>) => void;
  onSortChanged?: (event: SortChangedEvent) => void;
  // …
}

interface GridApi<TData = unknown> {
  // Options
  getGridOption<K extends keyof GridOptions<TData>>(key: K): GridOptions<TData>[K];
  setGridOption<K extends keyof GridOptions<TData>>(key: K, value: GridOptions<TData>[K]): void;
  updateGridOptions(options: Partial<GridOptions<TData>>): void;

  // Rows
  getDisplayedRowCount(): number;
  getRowNode(id: string): RowNode<TData> | undefined;
  forEachNode(callback: (node: RowNode<TData>, index: number) => void): void;
  setRowData(rowData: TData[]): void;
  applyTransaction(transaction: RowDataTransaction<TData>): RowDataTransactionResult;

  // Focus & scroll
  setFocusedCell(rowIndex: number, colKey: string): void;
  getFocusedCell(): CellPosition | null;
  ensureIndexVisible(rowIndex: number, position?: 'top' | 'bottom' | 'middle'): void;

  // Columns
  getColumnState(): ColumnState[];
  applyColumnState(params: ApplyColumnStateParams): boolean;
  getAllDisplayedColumns(): Column[];

  // State
  getState(): GridState;
  setState(state: GridState): void;

  // Events
  addEventListener<T extends GridEventType>(
    type: T,
    listener: (event: GridEventMap[T]) => void,
  ): void;
  removeEventListener<T extends GridEventType>(
    type: T,
    listener: (event: GridEventMap[T]) => void,
  ): void;

  destroy(): void;
}

interface ColDef<TData = unknown, TValue = unknown> {
  colId?: string;
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
  editable?: boolean | ((params: EditableCallbackParams<TData>) => boolean);
  valueGetter?: (params: ValueGetterParams<TData>) => TValue;
  valueSetter?: (params: ValueSetterParams<TData, TValue>) => boolean;
  valueFormatter?: (params: ValueFormatterParams<TData, TValue>) => string;
  valueParser?: (params: ValueParserParams<TData, TValue>) => TValue;
  cellRenderer?: string | CellRendererDef;
  cellEditor?: string | CellEditorDef;
  children?: ColDef<TData>[];
  checkboxSelection?: boolean | ((params: CheckboxSelectionCallbackParams<TData>) => boolean);
  comparator?: (
    valueA: TValue,
    valueB: TValue,
    nodeA: RowNode<TData>,
    nodeB: RowNode<TData>,
    isDescending: boolean,
  ) => number;
  meta?: Record<string, unknown>;
}
```

### 6.2 Standard event payload shape

```typescript
interface GridReadyEvent<TData = unknown> {
  type: 'gridReady';
  api: GridApi<TData>;
  context: unknown;
}

interface CellClickedEvent<TData = unknown> {
  type: 'cellClicked';
  api: GridApi<TData>;
  context: unknown;
  data: TData;
  node: RowNode<TData>;
  rowIndex: number;
  colDef: ColDef<TData>;
  column: Column;
  value: unknown;
  event: MouseEvent | KeyboardEvent;
}

interface SortChangedEvent {
  type: 'sortChanged';
  api: GridApi;
  context: unknown;
  // sort model readable via api.getSortModel() when sort module present
}
```

### 6.3 Dual API equivalence contract

| Declarative | Imperative | Controlled callback |
|-------------|------------|---------------------|
| `sortModel` prop | `api.setSortModel(model)` | `onSortModelChange(model)` |
| `filterModel` prop | `api.setFilterModel(model)` | `onFilterModelChange(model)` |
| `columnDefs` | `api.setGridOption('columnDefs', defs)` | — |
| `rowData` | `api.setRowData(data)` | — |
| `onSortChanged` | `api.addEventListener('sortChanged', fn)` | — |

**Invariant:** After any mutation path, `gridStore.getState()` MUST reflect the same values regardless of whether the mutation came from options diff, imperative API, or user interaction.

### 6.4 Batching semantics

| ID | Requirement | Priority |
|----|-------------|----------|
| API-BT-01 | `api.batch(() => { ... })` coalesces store notifications to one subscriber flush | Must |
| API-BT-02 | Multiple `setGridOption` calls in same macrotask without batch still coalesce to one render | Must |
| API-BT-03 | Events emit after batch completes, not mid-batch | Must |

## 7. Behavior & Edge Cases

| Scenario | Expected behavior |
|----------|-------------------|
| `columnDefs` updated while grid mounted | Diff by `colId`; preserve column state (width, sort) where colId matches |
| `rowData` replaced with new array | Bump `rowDataVersion`; re-run row model pipeline; preserve selection by `getRowId` |
| `api.destroy()` called twice | Second call is no-op; no thrown error |
| Event listener throws | Error logged; other listeners still run; grid remains functional |
| `onGridReady` and `addEventListener('gridReady')` both registered | Both fire, in registration order after internal setup |
| Controlled `sortModel` out of sync with user click | External prop wins on next adapter sync; user click also calls `onSortModelChange` |
| Missing sort module + `api.setSortModel` | Throw descriptive error: "SortModule not registered" |
| `colDef` without `field` or `colId` | Auto-generate `colId` from index with dev warning |
| `valueGetter` returns undefined | Cell displays empty string unless formatter handles it |

## 8. Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-API-01 | `GridApi` method call overhead | < 0.1 ms median for sync methods |
| NFR-API-02 | Event dispatch for 100 listeners | < 5 ms total |
| NFR-API-03 | Public API surface documented in TypeDoc | 100% method coverage T2 |
| NFR-API-04 | Breaking API changes | Semver major only; deprecate one minor |
| NFR-API-05 | `GridState` snapshot round-trip | Lossless for serializable slices |

## 9. Dependencies

| Dependency | Type | Notes |
|------------|------|-------|
| `@ol-grid/core` | Required | GridStore, ColumnModel, EventBus |
| `@ol-grid/sort` | Optional | `setSortModel`, `getSortModel`, `onSortChanged` |
| `@ol-grid/filter` | Optional | Filter model APIs and events |
| Framework adapters | Required for components | Bridge options ↔ engine |
| `ag-grid-migration.md` | Related | Compat aliases and mapping |

## 10. Acceptance Criteria

- [ ] `createGrid(host, options)` and React `<OlGrid />` produce identical behavior for Tier 1 options
- [ ] `api.setSortModel(x)` and `sortModel={x}` controlled prop produce identical store state
- [ ] All Tier 1 events fire with typed payloads verified by type tests (`tstyche`)
- [ ] `addEventListener` / `removeEventListener` lifecycle verified in unit tests
- [ ] `applyColumnState` round-trips width, order, pin, visibility, sort
- [ ] `getState` / `setState` restores grid after unmount/remount
- [ ] AG Grid getting-started tutorial reproducible with ≤ 20% API changes (per REQUIREMENTS.md §8.1)
- [ ] Module augmentation: installing `@ol-grid/sort` adds `setSortModel` to `GridApi` type

## 11. Test Plan

| Test type | Coverage |
|-----------|----------|
| Unit | EventBus dispatch, batching, options merge, ColDef flattening |
| Unit | Controlled vs uncontrolled slice sync |
| Type | `expect-type` / `tstyche` for `GridOptions<MyRow>` inference |
| Integration | React: ref API, callback + listener on same event |
| Integration | Vanilla: `createGrid` lifecycle, destroy cleanup |

## 12. Migration Notes (AG Grid)

| AG Grid API | ol-grid equivalent | Breaking? |
|-------------|-------------------|-----------|
| `gridOptions.api` | `event.api` / ref | No |
| `gridOptions.columnApi` | `event.api` (column methods on api) | Maybe |
| `onGridReady(params)` | `onGridReady({ api, context })` | No |
| `headerName` | `headerName` | No |
| `valueGetter` | `valueGetter` | No |
| `suppressColumnVirtualisation` | `suppressColumnVirtualization` | Spelling |
| `rowSelection: 'single'` | `rowSelection: 'single'` | No |
| `animateRows` | Not in v1 | Yes — document |
| `frameworkComponents` | Adapter-specific component registry | Yes |

See [ag-grid-migration.md](./ag-grid-migration.md) for full mapping.

## 13. Open Questions

| # | Question | Options | Decision |
|---|----------|---------|----------|
| OQ-1 | Separate `ColumnApi` object vs methods on `GridApi` | Merged (AG v31+) / separate `api.columnApi` | Recommend merged + shim |
| OQ-2 | `onGridReady` vs `whenGridReady(api)` promise helper | Callback only / also export helper | TBD |
| OQ-3 | Global event bus across multiple grid instances | Per-grid only / optional global | Per-grid only |

## 14. References

- [REQUIREMENTS.md](../REQUIREMENTS.md) §4.1, §6.2–6.5, §6.9
- [ARCHITECTURE.md](../ARCHITECTURE.md) §3.2, §4, Appendix A
- [plugin-module-system.md](./plugin-module-system.md)
- [ag-grid-migration.md](./ag-grid-migration.md)
- [AG Grid Grid Options](https://www.ag-grid.com/javascript-data-grid/grid-options/)

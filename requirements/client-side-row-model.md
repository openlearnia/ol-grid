# Client-Side Row Model (CSRM) — Feature Requirements

> **Package:** `@ol-grid/core` (`ClientSideRowModel`, row pipeline)  
> **Document version:** 1.0  
> **Last updated:** June 2026  
> **Status:** Draft — partial implementation in `packages/core/src/row/`

Parent documents: [REQUIREMENTS.md](../REQUIREMENTS.md), [ARCHITECTURE.md](../ARCHITECTURE.md)

---

## 1. Overview

### 1.1 Summary

The **Client-Side Row Model (CSRM)** is the default row model for ol-grid. All row data resides in browser memory; the grid applies an ordered **pipeline** of transforms (filter → sort → group → paginate) to produce the **display row list** that virtualization and selection consume. CSRM is the foundation for Tier 1 MVP and the reference implementation for shared `RowNode` semantics used by infinite and server-side models.

### 1.2 Goals

| ID | Goal |
|----|------|
| G-CSRM-01 | Load arbitrary in-memory arrays via `rowData` with predictable display indexing |
| G-CSRM-02 | Stable row identity via `getRowId` for selection, updates, and animation |
| G-CSRM-03 | Targeted mutations via `applyTransaction` without full array replacement |
| G-CSRM-04 | Immutable data mode for React/state-library users who replace arrays by reference |
| G-CSRM-05 | Compose with optional modules (`@ol-grid/sort`, `@ol-grid/filter`, `@ol-grid/grouping`) as pipeline stages |

### 1.3 Non-goals

| Item | Rationale |
|------|-----------|
| Server fetch / block cache | [infinite-row-model.md](./infinite-row-model.md), [server-side-row-model.md](./server-side-row-model.md) |
| Viewport-based partial loading | Infinite / SSRM |
| Web Worker sort/filter offload | Tier 3 performance module; CSRM defines main-thread contract first |
| Formula engine / calculated fields | Out of scope v1 |

### 1.4 Current implementation snapshot

| Capability | Status |
|------------|--------|
| `rowData` → `RowNode[]` rebuild | **Done** |
| `getRowId` callback | **Done** |
| Quick filter (`quickFilterText`) | **Done** |
| Single-column sort integration | **Done** |
| `getRowNode`, `forEachNode`, `getDisplayedRowCount` | **Done** |
| `updateNodeData` after cell edit | **Done** |
| Multi-column sort | **Not started** |
| `applyTransaction` / `applyTransactionAsync` | **Not started** |
| Immutable mode (`immutableData`, `getRowId`+reference equality) | **Not started** |
| Row grouping pipeline stage | **Not started** (T3 `@ol-grid/grouping`) |
| Pagination pipeline stage | **Not started** — see [pagination.md](./pagination.md) |

---

## 2. User stories

### US-CSRM-01 — Bind local data

As a developer, I pass `rowData={users}` and the grid displays all rows with virtualization so only visible rows mount in the DOM.

### US-CSRM-02 — Stable IDs for selection

As a developer integrating with a REST API, I set `getRowId={({ data }) => data.id}` so row selection and updates target the correct entity after sort or filter reorders display indices.

### US-CSRM-03 — Surgical updates

As a developer receiving WebSocket patches, I call `applyTransaction({ update: [changedRow], add: [newRow], remove: [deletedRow] })` so the grid updates without flashing or losing scroll position.

### US-CSRM-04 — Immutable React state

As a React developer using Immer or Redux, I enable `immutableData` and replace `rowData` with a new array reference; the grid diffs by `getRowId` and preserves expanded/selected state where possible.

### US-CSRM-05 — Filtered row awareness

As a developer, `forEachNode` after filter iterates only displayed rows, while `forEachLeafNode` (T3 grouping) traverses the hierarchy — selection and export use the same displayed set.

---

## 3. Functional requirements

### 3.1 Core data loading

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| REQ-CSRM-01 | Default `rowModelType` MUST be `'clientSide'` when unset | Must | T1 |
| REQ-CSRM-02 | Setting `rowData` MUST rebuild internal row store and bump `rowDataVersion` in grid state | Must | T1 |
| REQ-CSRM-03 | `getDisplayedRowCount()` MUST return post-pipeline row count (after filter/sort/group/paginate) | Must | T1 |
| REQ-CSRM-04 | `getRowAt(displayIndex)` MUST return `RowNode` at display index or `undefined` | Must | T1 |
| REQ-CSRM-05 | Replacing `rowData` MUST emit `rowDataUpdated` once per replace | Must | T1 |

### 3.2 Row identity (`getRowId`)

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| REQ-CSRM-10 | `getRowId({ data, index })` MUST return unique string per logical row | Must | T1 |
| REQ-CSRM-11 | Default `getRowId` when unset MUST use `String(index)` — documented as unstable under reorder | Must | T1 |
| REQ-CSRM-12 | Duplicate IDs from `getRowId` MUST log dev warning and dedupe (last wins) | Should | T2 |
| REQ-CSRM-13 | `getRowNode(id)` MUST be O(1) via internal map | Must | T1 |
| REQ-CSRM-14 | Changing `getRowId` at runtime MUST trigger full rebuild with warning | Should | T2 |

### 3.3 Pipeline composition

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| REQ-CSRM-20 | Pipeline order MUST be: `core → filter → sort → group → paginate` (stages optional by module) | Must | T1 |
| REQ-CSRM-21 | Each stage MUST receive previous stage output and return new `RowNode[]` or mutate nodes in place with version bump | Must | T1 |
| REQ-CSRM-22 | Disabling a module MUST skip its stage without breaking indices | Must | T1 |
| REQ-CSRM-23 | Quick filter (`quickFilterText`) MUST filter across stringified cell values before column filters | Must | T2 |
| REQ-CSRM-24 | Paginate stage MUST be skipped when virtual scroll is active — see [pagination.md](./pagination.md) | Must | T2 |

### 3.4 Transactions

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| REQ-CSRM-30 | `applyTransaction({ add?, update?, remove? })` MUST apply add/update/remove by `getRowId` | Must | T2 |
| REQ-CSRM-31 | `add` rows MUST insert at `addIndex` when provided, else append to source data | Should | T2 |
| REQ-CSRM-32 | `update` MUST merge into existing row by id; no-op if id missing (optional dev warning) | Must | T2 |
| REQ-CSRM-33 | `remove` MUST accept `RowNode` or data objects; resolve id via `getRowId` | Must | T2 |
| REQ-CSRM-34 | Transaction MUST re-run pipeline and emit single `rowDataUpdated` with `transaction` context | Must | T2 |
| REQ-CSRM-35 | `applyTransactionAsync` MUST batch rapid calls and return `Promise` resolving after apply | Could | T2 |
| REQ-CSRM-36 | Transactions MUST preserve vertical scroll when display index of focused row unchanged | Should | T2 |

### 3.5 Immutable mode

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| REQ-CSRM-40 | `immutableData: true` MUST diff new `rowData` array against previous by `getRowId` | Must | T2 |
| REQ-CSRM-41 | Unchanged row references (same id, same object reference) MUST skip cell refresh | Must | T2 |
| REQ-CSRM-42 | Changed reference with same id MUST run `update` path and refresh affected cells | Must | T2 |
| REQ-CSRM-43 | New ids in array MUST be treated as `add`; missing ids as `remove` | Must | T2 |
| REQ-CSRM-44 | `immutableData` without `getRowId` MUST throw meaningful config error at runtime | Must | T2 |

### 3.6 RowNode contract

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| REQ-CSRM-50 | `RowNode` MUST expose: `id`, `data`, `rowIndex`, `level`, `parent`, `childrenAfterGroup`, `expanded`, `selected`, `group`, `aggData`, `stub` | Must | T1 |
| REQ-CSRM-51 | `rowIndex` MUST reflect display index after pipeline; update when sort/filter changes | Must | T1 |
| REQ-CSRM-52 | `data` MAY be `undefined` for stub rows (SSRM parity on interface only) | Must | T1 |
| REQ-CSRM-53 | `selected` on node MUST sync with selection manager state | Must | T1 |

### 3.7 Cell value access

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| REQ-CSRM-60 | Cell value resolution: `valueGetter` → `field` on `data` — see [column-model.md](./column-model.md) | Must | T1 |
| REQ-CSRM-61 | `valueFormatter` applied at render time only; does not mutate `data` | Must | T1 |
| REQ-CSRM-62 | `setCellValue` / `valueSetter` on commit MUST update source `rowData` and node | Must | T2 |

---

## 4. API surface

### 4.1 Types

```typescript
interface RowNode<TData = unknown> {
  id: string;
  data: TData | undefined;
  rowIndex: number;
  level: number;
  parent?: RowNode<TData>;
  childrenAfterGroup?: RowNode<TData>[];
  expanded: boolean;
  selected: boolean;
  group: boolean;
  aggData?: Record<string, unknown>;
  stub?: boolean;
}

interface GetRowIdParams<TData> {
  data: TData;
  index: number;
}

interface RowDataTransaction<TData> {
  add?: TData[];
  addIndex?: number;
  update?: TData[];
  remove?: TData[] | RowNode<TData>[];
}

interface RowDataUpdatedEvent<TData> {
  api: GridApi<TData>;
  type: 'full' | 'transaction' | 'immutable';
  transaction?: RowDataTransaction<TData>;
}
```

### 4.2 GridOptions

| Option | Default | Tier |
|--------|---------|------|
| `rowData` | `[]` | T1 |
| `rowModelType` | `'clientSide'` | T1 |
| `getRowId` | index-based | T1 |
| `immutableData` | `false` | T2 |
| `quickFilterText` | `''` | T2 |

### 4.3 GridApi methods

| Method | Tier | Description |
|--------|------|-------------|
| `getDisplayedRowCount()` | T1 | Post-pipeline count |
| `getRowNode(id)` | T1 | Lookup by stable id |
| `forEachNode(callback)` | T1 | All displayed nodes |
| `forEachLeafNode(callback)` | T3 | With grouping |
| `applyTransaction(tx)` | T2 | Sync mutation |
| `applyTransactionAsync(tx)` | T2 | Batched async |
| `setRowData(data)` | T1 | Via `setGridOption('rowData', data)` |
| `refreshCells({ rowNodes?, columns?, force? })` | T2 | Invalidate render |
| `redrawRows({ rowNodes? })` | T2 | Re-render rows |

### 4.4 Events

| Event | When | Tier |
|-------|------|------|
| `rowDataUpdated` | After data replace, transaction, or immutable diff | T1 |
| `modelUpdated` | After pipeline recompute (sort/filter) | T2 |
| `cellValueChanged` | After successful edit commit | T2 |

---

## 5. AG Grid parity matrix

| Feature | AG Grid Community | AG Grid Enterprise | ol-grid target |
|---------|-------------------|--------------------|----------------|
| Client-side row model | Yes | Yes | **T1** |
| `getRowId` | Yes | Yes | **T1** — done |
| `applyTransaction` | Yes | Yes | **T2** |
| `immutableData` | Yes | Yes | **T2** |
| `forEachNode` / `getRowNode` | Yes | Yes | **T1** — done |
| Row grouping (CSRM) | No | Yes | **T3** `@ol-grid/grouping` |
| Tree data | No | Yes | **T3** |
| Async transactions | Yes | Yes | **T2** optional |

---

## 6. Competitive analysis

| Library | Approach | ol-grid takeaway |
|---------|----------|------------------|
| **AG Grid CSRM** | In-memory + transaction API + immutable mode | Primary API parity target |
| **TanStack Table** | `getRowId` + manual `data` updates; user runs `table.setOptions` | ol-grid automates diff with `immutableData` |
| **MUI Data Grid** | `rows` + `getRowId`; Pro adds tree | Match Community transaction patterns |
| **Glide** | `getCellContent` callback; no row objects | ol-grid keeps explicit `RowNode` for enterprise features |
| **Tabulator** | `addRow` / `updateRow` / `deleteRow` | Map to `applyTransaction` in migration guide |

---

## 7. Tier and priority

| Phase | Deliverables | Priority |
|-------|--------------|----------|
| **Tier 1** | `rowData`, `getRowId`, pipeline core+sort+quick filter, `RowNode` API | P0 — largely done |
| **Tier 2** | Transactions, immutable mode, multi-sort, `refreshCells`, `modelUpdated` | P1 |
| **Tier 3** | Grouping stage integration, tree data, worker offload hook | P2 |

---

## 8. Acceptance criteria

1. **10k rows:** `rowData` with 10,000 objects renders with `getDisplayedRowCount() === 10000` in &lt; 50ms pipeline rebuild.
2. **getRowId:** After sort, `getRowNode('user-42')` returns same node with updated `rowIndex`.
3. **Transaction add:** `applyTransaction({ add: [row] })` increases count by 1; scroll position unchanged.
4. **Transaction remove:** Removing selected row clears selection for that id.
5. **Immutable diff:** New array with one changed object reference updates one row DOM/cell; others skip `refresh`.
6. **immutableData error:** `immutableData: true` without `getRowId` throws error naming both options.
7. **Pipeline order:** With sort and filter active, filter reduces set before sort comparator runs.

---

## 9. Dependencies

| Feature | Relationship |
|---------|--------------|
| [column-model.md](./column-model.md) | `colId`, `valueGetter`, `field` for sort/filter |
| [virtualization.md](./virtualization.md) | Consumes `rowCount` and `getRowAt` |
| [pagination.md](./pagination.md) | Optional pipeline terminal stage |
| `@ol-grid/sort` | Sort stage |
| `@ol-grid/filter` | Filter stage |
| `@ol-grid/grouping` | Group stage (T3) |

---

## 10. Open questions

| # | Question | Options |
|---|----------|---------|
| OQ-CSRM-1 | `forEachNode` includes group rows? | Display only / all nodes |
| OQ-CSRM-2 | Transaction `addIndex` with active sort — honor index or sort position? | Source index / re-sort |
| OQ-CSRM-3 | Expose raw `sourceData` on API? | Never / debug only |
| OQ-CSRM-4 | `async` transactions flush on `requestAnimationFrame` or microtask? | rAF / queueMicrotask |

---

## 11. References

- [AG Grid — Row Models](https://www.ag-grid.com/javascript-data-grid/row-models/)
- [AG Grid — Updating Data](https://www.ag-grid.com/javascript-data-grid/data-update/)
- [AG Grid — Immutable Data](https://www.ag-grid.com/javascript-data-grid/immutable-data/)
- [AG Grid — Accessing Data](https://www.ag-grid.com/javascript-data-grid/accessing-data/)
- [TanStack Table — Row IDs](https://tanstack.com/table/latest/docs/guide/rows)
- [ol-grid ARCHITECTURE.md §3.3](../ARCHITECTURE.md)

---

*CSRM requirements — authoritative for in-memory row handling in `@ol-grid/core`.*

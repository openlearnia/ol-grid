# Server-Side Row Model (SSRM) — Feature Requirements

> **Package:** `@ol-grid/core` + `@ol-grid/grouping` (group expand)  
> **Document version:** 1.0  
> **Last updated:** June 2026  
> **Status:** Draft — not yet implemented

Parent documents: [REQUIREMENTS.md](../REQUIREMENTS.md), [ARCHITECTURE.md](../ARCHITECTURE.md)

---

## 1. Overview

### 1.1 Summary

The **Server-Side Row Model (SSRM)** is ol-grid's Tier 3 solution for **very large and hierarchical datasets** where sort, filter, grouping, aggregation, and pivot metadata are computed on the server. The client maintains a **sparse row store** keyed by `rowId`, loads data in **blocks** per hierarchy level, and renders **group rows** with expand/collapse that trigger lazy child fetches. SSRM is the MIT-licensed alternative to AG Grid Enterprise's server-side features (excluding integrated charts).

### 1.2 Goals

| ID | Goal |
|----|------|
| G-SSRM-01 | Functional parity with AG Grid Enterprise SSRM for sort, filter, group, expand, and block cache |
| G-SSRM-02 | Datasource contract compatible enough for AG Grid migrators to adapt servers with minimal changes |
| G-SSRM-03 | Sparse in-memory store — only fetched rows resident; eviction under memory limits |
| G-SSRM-04 | Server-driven pivot column generation (T3) with client column model refresh |
| G-SSRM-05 | Loading stubs, error recovery, and request sequencing identical discipline to infinite model |

### 1.3 Non-goals

| Item | Rationale |
|------|-----------|
| Building server implementations | Application responsibility; datasource is the boundary |
| Integrated charts / sparklines | Out of scope v1 |
| Advanced filter builder UI | N/A v1 |
| Replacing infinite model for flat lists | Use [infinite-row-model.md](./infinite-row-model.md) when no grouping |
| Excel export of unloaded rows | Export uses loaded + server endpoint pattern |

### 1.4 Current implementation snapshot

| Capability | Status |
|------------|--------|
| `RowModelType` includes `'serverSide'` | **Type only** |
| `RowNode` group/stub fields | **Interface only** |
| SSRM engine, datasource, sparse store | **Not started** |
| `@ol-grid/grouping` module | **Not started** |

---

## 2. User stories

### US-SSRM-01 — Enterprise admin grid

As an enterprise developer, I enable `rowModelType: 'serverSide'` with row grouping on `country` and `state` so the server returns group rows and leaf rows lazily as users expand groups.

### US-SSRM-02 — Server sort and filter

As a backend engineer, I receive `IServerSideGetRowsRequest` containing sort, filter, group keys, and pivot mode so my SQL/OLAP query returns the correct page without shipping the full dataset.

### US-SSRM-03 — Expand/collapse hierarchy

As an end user, I expand "USA" to see state groups, then expand "California" to see leaf rows, with loading indicators while children fetch.

### US-SSRM-04 — Pivot mode

As an analyst, I enable pivot mode so the server returns `pivotResultFields` and the grid generates dynamic pivot columns — see grouping module.

### US-SSRM-05 — Refresh after server mutation

As a developer, I call `refreshServerSide({ route?, purge })` after a server-side delete so affected cache routes reload.

---

## 3. Functional requirements

### 3.1 Model activation

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| REQ-SSRM-01 | `rowModelType: 'serverSide'` MUST activate SSRM; exclusive with CSRM and infinite | Must | T3 |
| REQ-SSRM-02 | `serverSideDatasource` MUST be provided; missing MUST error at init | Must | T3 |
| REQ-SSRM-03 | `treeData` + `getDataPath` MAY use SSRM store with path keys — coordinate grouping module | Should | T3 |
| REQ-SSRM-04 | `getRowId` MUST be required for SSRM | Must | T3 |

### 3.2 Datasource contract

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| REQ-SSRM-10 | Datasource MUST implement `getRows(params)` with server request object | Must | T3 |
| REQ-SSRM-11 | Request MUST include: `startRow`, `endRow`, `rowGroupCols`, `groupKeys`, `sortModel`, `filterModel`, `pivotMode`, `pivotCols`, `valueCols` | Must | T3 |
| REQ-SSRM-12 | Success callback MUST accept `{ rowData, rowCount?, pivotResultFields?, storeInfo? }` | Must | T3 |
| REQ-SSRM-13 | Group rows MUST be identifiable (`group: true`, `data` with group field values) | Must | T3 |
| REQ-SSRM-14 | Leaf rows MUST include full data objects | Must | T3 |
| REQ-SSRM-15 | `fail()` MUST mark route block failed with retry | Must | T3 |

### 3.3 Sparse row store

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| REQ-SSRM-20 | Rows MUST be stored by `rowId` in `Map<string, RowNode>` | Must | T3 |
| REQ-SSRM-21 | Display list MUST be materialized per expanded state as flat `rowIndex` sequence | Must | T3 |
| REQ-SSRM-22 | Unloaded display slots MUST use stub `RowNode` with `stub: true` | Must | T3 |
| REQ-SSRM-23 | `getRowNode(id)` MUST return cached node regardless of display index | Must | T3 |
| REQ-SSRM-24 | `forEachNode` MUST iterate displayed nodes unless `includeChildren` API flag | Should | T3 |

### 3.4 Server-side cache (per route)

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| REQ-SSRM-30 | Cache MUST be partitioned by **route** (group key path); root route `[]` is top level | Must | T3 |
| REQ-SSRM-31 | `cacheBlockSize` (default 100) and `maxBlocksInCache` apply per route | Must | T3 |
| REQ-SSRM-32 | Expanding group MUST create child route cache and fetch first block | Must | T3 |
| REQ-SSRM-33 | Collapsing group MUST hide child rows from display list without necessarily evicting cache | Should | T3 |
| REQ-SSRM-34 | `maxBlocksInCache` eviction MUST prefer least-recently-used routes/blocks | Must | T3 |
| REQ-SSRM-35 | `getCacheBlockState()` MUST expose debug map of block load states | Should | T3 |

### 3.5 Server-driven operations

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| REQ-SSRM-40 | Sort change MUST purge affected routes and re-request visible blocks | Must | T3 |
| REQ-SSRM-41 | Filter change MUST purge all routes (configurable `purgeOnFilterChange`) | Must | T3 |
| REQ-SSRM-42 | Row group column change MUST purge and rebuild group hierarchy | Must | T3 |
| REQ-SSRM-43 | Pivot mode toggle MUST purge and request pivot fields from server | Must | T3 |
| REQ-SSRM-44 | Client MUST NOT re-sort or re-filter loaded rows when server mode enabled | Must | T3 |
| REQ-SSRM-45 | Aggregation values on group rows MUST display `aggData` from server response | Must | T3 |

### 3.6 Expand / collapse

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| REQ-SSRM-50 | Click expand on group row MUST toggle `expanded` and trigger child route load | Must | T3 |
| REQ-SSRM-51 | `api.expandAll()` / `collapseAll()` MUST walk tree with batched requests | Should | T3 |
| REQ-SSRM-52 | `isServerSideGroupOpenByDefault` callback MAY auto-expand on first load | Should | T3 |
| REQ-SSRM-53 | Group row renderer MUST show expand chevron and aggregate summary | Must | T3 |

### 3.7 Async safety and refresh

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| REQ-SSRM-60 | Request sequencing MUST match [infinite-row-model.md](./infinite-row-model.md) REQ-INF-30–32 | Must | T3 |
| REQ-SSRM-61 | `refreshServerSide({ route?, purge: true })` MUST purge specified route or entire store | Must | T3 |
| REQ-SSRM-62 | `applyServerSideTransaction` MUST apply add/update/remove from server push (optional) | Could | T3 |
| REQ-SSRM-63 | `retryServerSideLoads()` MUST re-request failed blocks | Must | T3 |

### 3.8 Column model integration

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| REQ-SSRM-70 | `pivotResultFields` MUST generate dynamic column defs merged with base defs | Must | T3 |
| REQ-SSRM-71 | Row group columns MUST sync `rowGroup` / `rowGroupIndex` in column state | Must | T3 |
| REQ-SSRM-72 | See [column-model.md](./column-model.md) for `applyColumnState` triggering SSRM refresh | Must | T3 |

---

## 4. API surface

### 4.1 Types

```typescript
interface ServerSideDatasource<TData = unknown> {
  getRows(params: ServerSideGetRowsParams<TData>): void | Promise<void>;
  destroy?(): void;
}

interface ServerSideGetRowsRequest {
  startRow: number;
  endRow: number;
  rowGroupCols: ColumnVO[];
  valueCols: ColumnVO[];
  pivotCols: ColumnVO[];
  pivotMode: boolean;
  groupKeys: string[];
  filterModel: FilterModel;
  sortModel: SortModel;
}

interface ServerSideGetRowsParams<TData = unknown> {
  request: ServerSideGetRowsRequest;
  parentNode: RowNode<TData> | null;
  success: (result: ServerSideSuccessResult<TData>) => void;
  fail: () => void;
  requestId: number;
}

interface ServerSideSuccessResult<TData> {
  rowData: TData[];
  rowCount?: number;
  pivotResultFields?: string[];
  storeInfo?: unknown;
}

interface RefreshServerSideParams {
  route?: string[];
  purge?: boolean;
}
```

### 4.2 GridOptions

| Option | Default | Tier |
|--------|---------|------|
| `rowModelType` | — | `'serverSide'` |
| `serverSideDatasource` | — | Required |
| `cacheBlockSize` | `100` | T3 |
| `maxBlocksInCache` | unlimited | T3 |
| `serverSideSortAllLevels` | `false` | T3 |
| `serverSideFilterAllLevels` | `false` | T3 |
| `purgeClosedRowNodes` | `false` | T3 |
| `isServerSideGroupOpenByDefault` | — | T3 |
| `getServerSideGroupKey` | — | T3 |

### 4.3 GridApi methods

| Method | Tier |
|--------|------|
| `refreshServerSide(params?)` | T3 |
| `getServerSideGroupLevelState()` | T3 |
| `retryServerSideLoads()` | T3 |
| `applyServerSideRowData(route, rowData)` | T3 |
| `getCacheBlockState()` | T3 |
| `expandAll()` / `collapseAll()` | T3 |
| `setRowGroupColumns(colIds)` | T3 |

### 4.4 Events

| Event | Tier |
|-------|------|
| `storeRefreshed` | T3 |
| `rowGroupOpened` | T3 |
| `columnRowGroupChanged` | T3 |
| `modelUpdated` | T3 |
| `asyncTransactionsFlushed` | T3 |

---

## 5. AG Grid parity matrix

| Feature | AG Grid Community | AG Grid Enterprise | ol-grid target |
|---------|-------------------|--------------------|----------------|
| Server-side row model | No | Yes | **T3** MIT |
| Lazy group expand | No | Yes | **T3** |
| Server sort/filter | No | Yes | **T3** |
| SSRM block cache | No | Yes | **T3** |
| Pivot mode (server) | No | Yes | **T3** |
| `refreshServerSide` | No | Yes | **T3** |
| `applyServerSideTransaction` | No | Yes | **T3** optional |
| Tree data (server) | No | Yes | **T3** |
| Set filter values from server | No | Yes | **T3** with filter module |
| Master/detail server | No | Yes | **T3** separate spec |

---

## 6. Competitive analysis

| Library | Server-side model | ol-grid positioning |
|---------|-------------------|---------------------|
| **AG Grid Enterprise** | Full SSRM + pivot + tree | Primary parity target; MIT Tier 3 |
| **MUI X Premium** | Server row count + filter | ol-grid broader hierarchy |
| **TanStack Table** | Manual server pagination | ol-grid provides cache + group UX |
| **Tabulator** | `ajaxURL` progressive load | Less hierarchy; ol-grid deeper SSRM |
| **Handsontable** | Server formulas | Different domain |

---

## 7. Tier and priority

| Phase | Scope | Priority |
|-------|-------|----------|
| **Tier 3 MVP** | Flat SSRM (no groups), server sort/filter, block cache | P1 |
| **Tier 3 full** | Row grouping, expand lazy load, aggregation display | P0 |
| **Tier 3 advanced** | Pivot, tree data, transactions, set filter server values | P1 |

---

## 8. Acceptance criteria

1. **Root load:** SSRM grid calls `getRows` with `groupKeys: []` on init; displays first block.
2. **Group expand:** Expanding group row triggers `getRows` with `groupKeys: ['USA']`.
3. **Sort purge:** Column sort purges root cache; new request includes `sortModel`.
4. **Sparse store:** 1M logical rows with 100 loaded uses &lt; 5MB row object memory (excluding data).
5. **Stale request:** Rapid expand/collapse discards stale child responses.
6. **Pivot columns:** Server returns `pivotResultFields`; grid adds dynamic columns without manual defs.
7. **refreshServerSide:** `purge: true` clears route; visible rows show stubs until reload completes.
8. **Parity demo:** AG Grid SSRM tutorial scenario reproducible with ol-grid datasource adapter ≤ 25% code change.

---

## 9. Dependencies

| Feature | Relationship |
|---------|--------------|
| [infinite-row-model.md](./infinite-row-model.md) | Shared block cache, sequencing patterns |
| [column-model.md](./column-model.md) | Pivot columns, group column state |
| [virtualization.md](./virtualization.md) | Display row count, stub rendering |
| [client-side-row-model.md](./client-side-row-model.md) | `RowNode` shape |
| `@ol-grid/grouping` | Group column UI, agg func types |
| `@ol-grid/filter` | `filterModel` serialization |
| `@ol-grid/sort` | `sortModel` serialization |

---

## 10. Open questions

| # | Question | Options |
|---|----------|---------|
| OQ-SSRM-1 | AG Grid `IServerSideGetRowsRequest` field-for-field compat? | Max compat / simplified subset |
| OQ-SSRM-2 | License: SSRM fully MIT? | Yes per REQUIREMENTS.md / dual license |
| OQ-SSRM-3 | `purgeClosedRowNodes` default? | true / false |
| OQ-SSRM-4 | Flat SSRM without grouping in T3 MVP? | Yes stepping stone / wait for groups |
| OQ-SSRM-5 | Server pagination panel integration? | [pagination.md](./pagination.md) |

---

## 11. References

- [AG Grid — Server-Side Row Model](https://www.ag-grid.com/javascript-data-grid/server-side-model/)
- [AG Grid — SSRM Datasource](https://www.ag-grid.com/javascript-data-grid/server-side-model-datasource/)
- [AG Grid — SSRM Configuration](https://www.ag-grid.com/javascript-data-grid/server-side-model-configuration/)
- [AG Grid — SSRM API Reference](https://www.ag-grid.com/javascript-data-grid/server-side-model-api-reference/)
- [AG Grid — Community vs Enterprise](https://www.ag-grid.com/javascript-data-grid/community-vs-enterprise/)
- [ol-grid REQUIREMENTS.md §4.3.2](../REQUIREMENTS.md)
- [ol-grid ARCHITECTURE.md §3.3](../ARCHITECTURE.md)

---

*SSRM requirements — authoritative for server-driven hierarchical data in ol-grid Tier 3.*

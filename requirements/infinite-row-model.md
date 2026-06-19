# Infinite Row Model — Feature Requirements

> **Package:** `@ol-grid/core` (`InfiniteRowModel`, block cache)  
> **Document version:** 1.0  
> **Last updated:** June 2026  
> **Status:** Draft — not yet implemented (types only in `RowModelType`)

Parent documents: [REQUIREMENTS.md](../REQUIREMENTS.md), [ARCHITECTURE.md](../ARCHITECTURE.md)

---

## 1. Overview

### 1.1 Summary

The **Infinite Row Model** loads row data in **blocks** as the user scrolls, caching a configurable number of blocks in memory with LRU eviction. It targets datasets too large to hold entirely in the browser while avoiding the hierarchical complexity of the Server-Side Row Model. The application provides a **datasource** with `getRows`; the grid manages block indices, in-flight deduplication, stale-response discard, and loading UI.

### 1.2 Goals

| ID | Goal |
|----|------|
| G-INF-01 | Scroll through millions of logical rows with bounded memory via block cache |
| G-INF-02 | AG Grid–compatible datasource contract (`getRows` + success/fail callbacks or Promise) |
| G-INF-03 | Integrate sort and filter models into datasource requests |
| G-INF-04 | Safe async: discard stale responses when scroll or sort changes mid-flight |
| G-INF-05 | Clear loading and error affordances for unfetched blocks |

### 1.3 Non-goals

| Item | Rationale |
|------|-----------|
| Hierarchical grouping / lazy group expand | [server-side-row-model.md](./server-side-row-model.md) |
| Client-side full dataset | [client-side-row-model.md](./client-side-row-model.md) |
| Viewport row model (page-at-a-time without cache) | AG Grid legacy; not planned |
| Server-side pivot metadata | SSRM only |
| Writing datasource pagination UI | [pagination.md](./pagination.md) — infinite scroll is the default UX |

### 1.4 Current implementation snapshot

| Capability | Status |
|------------|--------|
| `RowModelType` includes `'infinite'` | **Type only** |
| `ClientSideRowModel` as sole active model | **Done** |
| Block cache, datasource, loading stubs | **Not started** |

---

## 2. User stories

### US-INF-01 — Large remote dataset

As a developer, I set `rowModelType: 'infinite'` and implement `datasource.getRows` to fetch 100-row blocks from my API so users can scroll through a 2M-row table without loading all data upfront.

### US-INF-02 — Sort and filter with server

As a developer, when the user sorts or filters, the grid purges its cache and calls `getRows` with updated `sortModel` and `filterModel` so the server returns the correct slice.

### US-INF-03 — Unknown row count

As a developer, my API does not return total count initially; I omit `rowCount` in the success response so the grid shows an expanding scrollbar until the server provides a definitive count.

### US-INF-04 — Recover from errors

As an end user, when a block fails to load, I see an error state on that region and can retry without reloading the entire page.

### US-INF-05 — Refresh after mutation

As a developer, after creating a record on the server, I call `refreshInfiniteCache()` so stale blocks are purged and re-fetched.

---

## 3. Functional requirements

### 3.1 Model selection and exclusivity

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| REQ-INF-01 | `rowModelType: 'infinite'` MUST activate `InfiniteRowModel`; mutually exclusive with CSRM and SSRM | Must | T2 |
| REQ-INF-02 | Setting `rowData` while infinite model active MUST warn and ignore (or throw in strict mode) | Must | T2 |
| REQ-INF-03 | `datasource` MUST be required when infinite model active; missing datasource MUST error on `gridReady` | Must | T2 |

### 3.2 Datasource contract

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| REQ-INF-10 | Datasource MUST implement `getRows(params)` where params include `startRow`, `endRow`, `sortModel`, `filterModel`, `context` | Must | T2 |
| REQ-INF-11 | Success path MUST accept `{ rows: TData[], rowCount?: number }` via callback or returned Promise | Must | T2 |
| REQ-INF-12 | Failure path MUST call `fail()` or reject Promise; grid marks block failed | Must | T2 |
| REQ-INF-13 | `rowCount` when provided MUST set logical row count for scrollbar; when omitted, grid uses "unknown count" mode | Must | T2 |
| REQ-INF-14 | Rows returned MUST map to block range `[startRow, endRow)`; short arrays pad with stubs or reduce count per config | Must | T2 |
| REQ-INF-15 | `getRowId` MUST be used to assign node ids for returned rows | Must | T2 |

### 3.3 Block cache

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| REQ-INF-20 | `cacheBlockSize` (default 100) MUST define rows per block and per `getRows` request alignment | Must | T2 |
| REQ-INF-21 | `maxBlocksInCache` MUST limit retained blocks; LRU evict blocks farthest from viewport | Must | T2 |
| REQ-INF-22 | `infiniteInitialRowCount` SHOULD set placeholder count before first response | Should | T2 |
| REQ-INF-23 | Block key MUST be `floor(startRow / cacheBlockSize)` | Must | T2 |
| REQ-INF-24 | Duplicate in-flight requests for same block MUST dedupe to single network call | Must | T2 |
| REQ-INF-25 | `purgeInfiniteCache()` MUST clear all blocks and reset scroll row count to initial | Must | T2 |
| REQ-INF-26 | `refreshInfiniteCache()` MUST purge and re-request visible blocks | Must | T2 |

### 3.4 Async safety

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| REQ-INF-30 | Each `getRows` invocation MUST receive monotonic `requestId` or sequence token | Must | T2 |
| REQ-INF-31 | Responses for superseded requests MUST be discarded silently | Must | T2 |
| REQ-INF-32 | Sort, filter, or datasource change MUST increment sequence and purge cache | Must | T2 |
| REQ-INF-33 | `applyColumnState` with sort change MUST trigger cache refresh — coordinate with [column-model.md](./column-model.md) | Must | T2 |

### 3.5 Loading and error states

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| REQ-INF-40 | Unloaded rows in visible range MUST render as loading stubs (`RowNode.stub === true`) | Must | T2 |
| REQ-INF-41 | Failed block MUST show error overlay or row-level error stub with retry action | Must | T2 |
| REQ-INF-42 | `gridOptions.overlayLoadingTemplate` / `loading` store flag MUST show global loading on first fetch | Should | T2 |
| REQ-INF-43 | `rowModelMeta.loading` in grid state MUST reflect any in-flight block requests | Must | T2 |
| REQ-INF-44 | Scrollbar thumb size MUST reflect known `rowCount` or indeterminate mode when unknown | Must | T2 |

### 3.6 Integration with virtualization

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| REQ-INF-50 | Virtualizer `rowCount` MUST use logical row count from infinite model | Must | T2 |
| REQ-INF-51 | `getRowAt(i)` MUST return stub node if block not loaded, else materialized node | Must | T2 |
| REQ-INF-52 | Scroll into unloaded range MUST trigger block fetch before paint when possible | Should | T2 |
| REQ-INF-53 | See [virtualization.md](./virtualization.md) for overscan triggering prefetch of adjacent blocks | Must | T2 |

### 3.7 Sort and filter

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| REQ-INF-60 | Client sort MUST NOT run on infinite model unless `suppressServerSideSort: true` (discouraged) | Must | T2 |
| REQ-INF-61 | `sortModel` changes MUST purge cache and re-fetch visible blocks | Must | T2 |
| REQ-INF-62 | `filterModel` / `quickFilter` changes MUST purge cache and pass model to datasource | Must | T2 |
| REQ-INF-63 | Datasource owns authoritative ordering when server-side sort enabled | Must | T2 |

---

## 4. API surface

### 4.1 Types

```typescript
interface InfiniteDatasource<TData = unknown> {
  getRows(params: InfiniteGetRowsParams<TData>): void | Promise<void>;
  destroy?(): void;
}

interface InfiniteGetRowsParams<TData = unknown> {
  startRow: number;
  endRow: number;
  sortModel: SortModel;
  filterModel: FilterModel;
  context: unknown;
  success: (result: { rows: TData[]; rowCount?: number }) => void;
  fail: () => void;
  requestId: number;
}

interface InfiniteRowModelConfig {
  cacheBlockSize?: number;        // default 100
  maxBlocksInCache?: number;      // default unlimited
  infiniteInitialRowCount?: number; // default 1
  datasource: InfiniteDatasource;
}
```

### 4.2 GridOptions

| Option | Default | Tier |
|--------|---------|------|
| `rowModelType` | — | `'infinite'` T2 |
| `datasource` | — | Required T2 |
| `cacheBlockSize` | `100` | T2 |
| `maxBlocksInCache` | unlimited | T2 |
| `infiniteInitialRowCount` | `1` | T2 |
| `maxConcurrentDatasourceRequests` | `2` | T2 |
| `blockLoadDebounceMillis` | `0` | T2 |

### 4.3 GridApi methods

| Method | Description | Tier |
|--------|-------------|------|
| `setGridOption('datasource', ds)` | Replace datasource; purge cache | T2 |
| `refreshInfiniteCache()` | Purge + reload visible | T2 |
| `purgeInfiniteCache()` | Purge only | T2 |
| `getInfiniteRowCount()` | Current logical count | T2 |
| `isLastRowIndexKnown()` | Whether `rowCount` definitive | T2 |

### 4.4 Events

| Event | When | Tier |
|-------|------|------|
| `storeRefreshed` | After cache purge | T2 |
| `bodyScrollEnd` | Debounced scroll end; optional prefetch hook | T2 |
| `modelUpdated` | Row count or block loaded | T2 |
| `asyncTransactionsFlushed` | N/A infinite — reserved | — |

---

## 5. AG Grid parity matrix

| Feature | AG Grid Community | AG Grid Enterprise | ol-grid target |
|---------|-------------------|--------------------|----------------|
| Infinite row model | Yes | Yes | **T2** |
| `IDatasource.getRows` | Yes | Yes | **T2** |
| Block cache (`cacheBlockSize`) | Yes | Yes | **T2** |
| `maxBlocksInCache` | Yes | Yes | **T2** |
| Unknown row count | Yes | Yes | **T2** |
| `refreshInfiniteCache` | Yes | Yes | **T2** |
| Server-side sort/filter in datasource | Yes | Yes | **T2** |
| SSRM lazy groups | No | Yes | **T3** — SSRM spec |
| Viewport row model | Yes (legacy) | Yes | **N/A** |

---

## 6. Competitive analysis

| Library | Infinite / lazy loading | ol-grid implication |
|---------|------------------------|---------------------|
| **AG Grid** | Mature infinite model + docs | Primary contract reference |
| **TanStack Table** | Manual `fetchNextPage` + Virtual | ol-grid bundles cache + scroll trigger |
| **MUI Data Grid** | Pro: `rows` + `rowCount` server mode | ol-grid MIT Tier 2 target |
| **RevoGrid** | Viewport datasource | Similar block pattern; adopt LRU naming |
| **Glide** | Async `getCellContent` per cell | Coarser block API is more network-efficient |

---

## 7. Tier and priority

| Phase | Scope | Priority |
|-------|-------|----------|
| **Tier 2** | Full infinite model, datasource, cache, loading/error, sort/filter integration | P1 |
| **Tier 2 polish** | Debounce, concurrent request limit, retry UX | P2 |
| **Tier 3** | Optional Web Worker request queue | P3 |

---

## 8. Acceptance criteria

1. **Block fetch:** Scroll to row 500 with `cacheBlockSize: 100` triggers `getRows({ startRow: 500, endRow: 600 })` exactly once per block.
2. **LRU:** With `maxBlocksInCache: 2`, scrolling past 200 rows evicts block 0; scrolling back re-fetches block 0.
3. **Stale discard:** Fast scroll A→B discards in-flight response for A; only B's data applied.
4. **Sort purge:** `setSortModel` purges cache and issues new `getRows` with sort in params.
5. **Unknown count:** Omitting `rowCount` allows scroll expansion; providing it on later call resizes scrollbar.
6. **Stub render:** Visible rows in loading block show stub cells without throwing.
7. **Datasource swap:** `setGridOption('datasource', newDs)` clears cache and loads block 0 from new source.

---

## 9. Dependencies

| Feature | Relationship |
|---------|--------------|
| [virtualization.md](./virtualization.md) | Row count, scroll range, prefetch overscan |
| [column-model.md](./column-model.md) | Sort state, column changes triggering refresh |
| [client-side-row-model.md](./client-side-row-model.md) | Shared `RowNode` interface |
| `@ol-grid/sort` | Produces `sortModel` for datasource |
| `@ol-grid/filter` | Produces `filterModel` for datasource |
| [server-side-row-model.md](./server-side-row-model.md) | Superset for hierarchical data — do not merge implementations |

---

## 10. Open questions

| # | Question | Options |
|---|----------|---------|
| OQ-INF-1 | Promise-based `getRows` only vs callback + Promise? | Both / Promise-only |
| OQ-INF-2 | Prefetch next block on scroll end by default? | On / off / configurable |
| OQ-INF-3 | `maxConcurrentDatasourceRequests` default? | 1 / 2 / unlimited |
| OQ-INF-4 | Support AG Grid legacy `IGetRowsParams` naming aliases? | Yes migration / no |
| OQ-INF-5 | Infinite + pagination mode interaction? | Disallow / see pagination spec |

---

## 11. References

- [AG Grid — Infinite Row Model](https://www.ag-grid.com/javascript-data-grid/infinite-scrolling/)
- [AG Grid — Row Models Overview](https://www.ag-grid.com/javascript-data-grid/row-models/)
- [AG Grid — Accessing Data](https://www.ag-grid.com/javascript-data-grid/accessing-data/)
- [AG Grid GitHub #4406 — applyColumnState + infinite cache](https://github.com/ag-grid/ag-grid/issues/4406)
- [ol-grid ARCHITECTURE.md §3.3](../ARCHITECTURE.md)
- [ol-grid REQUIREMENTS.md §4.2.3](../REQUIREMENTS.md)

---

*Infinite row model requirements — authoritative for block-loading data in `@ol-grid/core`.*

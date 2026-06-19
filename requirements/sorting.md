# Feature Requirements: Sorting

> **Package target:** `@ol-grid/sort` (optional module; partial implementation in `@ol-grid/core` today)  
> **Parent spec:** [REQUIREMENTS.md](../REQUIREMENTS.md) §3.3, §4.1.3, §4.2.4  
> **Architecture:** [ARCHITECTURE.md](../ARCHITECTURE.md) §3.3, §3.8  
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

Sorting is a foundational data-grid capability that reorders displayed rows based on one or more column values. In ol-grid, sorting is implemented as an **opt-in row-model pipeline stage** registered by `@ol-grid/sort`, keeping `@ol-grid/core` free of sort algorithms when the feature is not imported.

### 1.1 Goals

| Goal | Description |
|------|-------------|
| **Familiar UX** | Click column header cycles asc → desc → none; visual and ARIA indicators match AG Grid expectations |
| **Correctness** | Stable sort; null/undefined handling documented; custom comparators per column |
| **Performance** | O(n log n) client-side sort; optional Web Worker offload for >100k rows (Tier 3) |
| **Composability** | Sort composes with filter, grouping, pagination, and infinite/SSRM datasources |
| **Dual control** | Declarative (`sortModel` prop) and imperative (`api.setSortModel`) surfaces stay equivalent |

### 1.2 Non-goals (v1)

- Server-side sort logic (owned by infinite/SSRM datasource contracts; sort module only passes `sortModel`)
- Locale-aware collation beyond optional `accentedSort` flag (Tier 2)
- Animated row reorder on sort (`animateRows`) — deferred to renderer polish

### 1.3 Scope boundary

Sorting affects **display order** of rows in the row model pipeline. It does not mutate underlying `rowData`. Sort state is part of `ColumnState` / `SortingState` and is serializable for grid-state persistence.

---

## 2. Current Implementation Status

Audit of `packages/` as of June 2026:

| Capability | Status | Location |
|------------|--------|----------|
| Single-column header click sort | **Implemented** | `grid-engine.ts`, `dom-renderer.ts` |
| asc → desc → none cycle | **Implemented** | `sort.ts` → `toggleColumnSort` |
| `compareValues` default comparator | **Implemented** | `compare-values.ts` |
| `getSortModel` from column state | **Implemented** | `sort.ts`, `grid-engine.ts` |
| CSRM pipeline integration | **Implemented** | `client-side-row-model.ts` → `applySort` |
| Sort indicator in header + `aria-sort` | **Partial** | DOM shows ▲/▼; `aria-sort` not verified in tests |
| `sortChanged` event | **Implemented** | `events.ts`, emitted on toggle |
| Custom `comparator` on `ColumnDef` | **Not implemented** | Type missing on `ColumnDef` |
| Multi-column sort | **Not implemented** | `sortIndex` exists on `ColumnState` but unused |
| `setSortModel` / `getSortModel` on `GridApi` | **Not implemented** | Only internal helpers |
| `@ol-grid/sort` package | **Not created** | Logic lives in core today |
| `sortable: false` per column | **Partial** | Honored in renderer; no defaultColDef |
| `initialSort` / `sort` on colDef | **Not implemented** | |
| `postSortRows` callback | **Not implemented** | |
| `accentedSort` locale option | **Not implemented** | |
| Worker offload for large datasets | **Not implemented** | Tier 3 |

**Migration note:** Sort logic should move from `@ol-grid/core` into `@ol-grid/sort` per architecture, with core retaining only pipeline registration hooks.

---

## 3. User Stories

### Tier 1 (MVP)

| ID | Story | Priority |
|----|-------|----------|
| US-SORT-01 | As an app developer, I click a column header to sort rows ascending so I can quickly find lowest values | Must |
| US-SORT-02 | As an app developer, I click again to sort descending, and a third time to clear sort | Must |
| US-SORT-03 | As an app developer, I provide a custom comparator on a column so domain-specific ordering (e.g. severity levels) works | Must |
| US-SORT-04 | As an app developer, I call `api.setSortModel([{ colId, sort }])` to sort programmatically on page load | Must |
| US-SORT-05 | As a screen-reader user, I hear the current sort direction via `aria-sort` on the active column header | Must |
| US-SORT-06 | As an app developer, I set `sortable: false` on a column to disable sorting for action/button columns | Must |

### Tier 2

| ID | Story | Priority |
|----|-------|----------|
| US-SORT-07 | As an app developer, I hold Shift and click multiple headers to sort by Country then City | Should |
| US-SORT-08 | As an app developer, I configure `multiSortKey: 'ctrl'` to match Windows Excel muscle memory | Should |
| US-SORT-09 | As an app developer, I set `initialSort` on a column so the grid loads pre-sorted | Should |
| US-SORT-10 | As an app developer, I use `postSortRows` to pin specific rows (e.g. "Totals") at the bottom after sort | Should |
| US-SORT-11 | As an app developer, I enable `accentedSort` for locale-aware string collation in non-English locales | Should |
| US-SORT-12 | As an app developer, sorting on infinite row model re-fetches blocks with updated `sortModel` in datasource params | Must |

### Tier 3

| ID | Story | Priority |
|----|-------|----------|
| US-SORT-13 | As an app developer with 200k+ rows, sort completes without blocking the UI via Web Worker | Should |
| US-SORT-14 | As an app developer using SSRM, server receives sort model and returns correctly ordered sparse rows | Must |

---

## 4. Functional Requirements

### 4.1 Tier 1 — Single-column sort

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-SORT-01 | Clicking a sortable column header MUST cycle sort: `null` → `asc` → `desc` → `null` | Must |
| REQ-SORT-02 | Only one column MAY be actively sorted when multi-sort is disabled (default) | Must |
| REQ-SORT-03 | Sorting MUST use cell values resolved via `valueGetter` if present, else `field` | Must |
| REQ-SORT-04 | Default comparator MUST order `null`/`undefined` consistently (documented: always last in asc, first in desc) | Must |
| REQ-SORT-05 | `ColumnDef.comparator(valueA, valueB, nodeA, nodeB, isDescending)` MUST override default compare | Must |
| REQ-SORT-06 | `GridApi.setSortModel(model)` and `GridApi.getSortModel()` MUST read/write the same state as declarative `sortModel` option | Must |
| REQ-SORT-07 | `onSortChanged` MUST fire once per user or API sort change with `{ api, source }` | Must |
| REQ-SORT-08 | Active sort column header MUST expose `aria-sort="ascending"` or `"descending"`; others `"none"` or attribute removed | Must |
| REQ-SORT-09 | `sortable: false` on column def MUST prevent sort on that column | Must |
| REQ-SORT-10 | Sort MUST re-run when `rowData` updates; row indices MUST reflect new order | Must |
| REQ-SORT-11 | Sort MUST compose with quick filter: only filtered rows are sorted | Must |
| REQ-SORT-12 | Sort state MUST be included in serializable grid state snapshot | Should |

### 4.2 Tier 2 — Multi-column & advanced

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-SORT-13 | Shift+click (default) on additional headers MUST add secondary sort keys with incrementing `sortIndex` | Should |
| REQ-SORT-14 | `multiSortKey: 'ctrl' \| 'shift'` MUST configure the modifier key (default `'shift'`) | Should |
| REQ-SORT-15 | `suppressMultiSort: true` MUST disable multi-column sort entirely | Should |
| REQ-SORT-16 | `alwaysMultiSort: true` MUST treat every header click as additive without modifier | Could |
| REQ-SORT-17 | Multi-sort MUST apply comparators in `sortIndex` order; earlier keys break ties for later keys | Should |
| REQ-SORT-18 | `colDef.sort` / `colDef.initialSort` MUST set sort on grid init without API call | Should |
| REQ-SORT-19 | `colDef.sortingOrder` MUST allow custom cycle (e.g. desc-only columns) | Could |
| REQ-SORT-20 | `postSortRows({ nodes })` callback MAY reorder nodes after primary sort (stable relative order preserved within equal keys) | Should |
| REQ-SORT-21 | `accentedSort: true` grid option MUST use `localeCompare` with sensitivity `'base'` for strings | Should |
| REQ-SORT-22 | Infinite row model datasource `getRows` MUST receive current `sortModel` | Must |
| REQ-SORT-23 | `defaultColDef.sortable` MUST cascade to columns unless overridden | Should |

### 4.3 Tier 3 — Scale & server

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-SORT-24 | CSRM sort of ≥100k rows SHOULD offload to Web Worker when `@ol-grid/sort/worker` entry is imported | Should |
| REQ-SORT-25 | SSRM MUST NOT client-sort; sort model passed to server only | Must |
| REQ-SORT-26 | Group rows MUST sort within group level per AG Grid grouping semantics (deferred to `@ol-grid/grouping`) | Must |

---

## 5. API & Events

### 5.1 Column definition extensions

```typescript
interface ColumnDef<TData, TValue> {
  sortable?: boolean;                    // default true
  sort?: 'asc' | 'desc' | SortDef;       // initial sort
  initialSort?: 'asc' | 'desc' | SortDef;
  comparator?: SortComparatorFn<TData, TValue>;
  sortingOrder?: Array<'asc' | 'desc' | null>;
}

type SortComparatorFn<TData, TValue> = (
  valueA: TValue,
  valueB: TValue,
  nodeA: RowNode<TData>,
  nodeB: RowNode<TData>,
  isDescending: boolean,
) => number;
```

### 5.2 Grid options

```typescript
interface GridOptions<TData> {
  sortModel?: SortModel;                 // controlled
  defaultColDef?: Partial<ColumnDef<TData>>;
  multiSortKey?: 'shift' | 'ctrl';
  suppressMultiSort?: boolean;
  alwaysMultiSort?: boolean;
  accentedSort?: boolean;
  postSortRows?: (params: PostSortRowsParams<TData>) => void;
  onSortChanged?: (event: SortChangedEvent) => void;
}

type SortModel = Array<{ colId: string; sort: 'asc' | 'desc' }>;
```

### 5.3 GridApi (module augmentation via `@ol-grid/sort`)

```typescript
interface GridApi<TData> {
  setSortModel(model: SortModel): void;
  getSortModel(): SortModel;
  onSortChanged(listener: (e: SortChangedEvent) => void): Unsubscribe;
}
```

### 5.4 Events

| Event | Payload | When |
|-------|---------|------|
| `sortChanged` | `{ api, source: 'ui' \| 'api' \| 'rowDataUpdated' }` | Sort model changes |
| `columnHeaderClicked` | `{ colId, event }` | Header click (before sort applied; cancellable in future) |

### 5.5 Module registration

```typescript
import { SortModule } from '@ol-grid/sort';
ModuleRegistry.register(SortModule);
```

`SortModule` registers:
- `sorting` store slice
- `sortedRowModel` pipeline stage (after filter, before group)
- `GridApi` extensions
- Reducers: `SET_SORT_MODEL`, `TOGGLE_COLUMN_SORT`

---

## 6. AG Grid Parity

Reference: [AG Grid Row Sorting](https://www.ag-grid.com/javascript-data-grid/row-sorting/)

| AG Grid feature | AG Grid tier | ol-grid target | Parity notes |
|-----------------|--------------|----------------|--------------|
| Click header to sort | Community | T1 | Match asc/desc/none cycle |
| `sortable` per column | Community | T1 | |
| `comparator` | Community | T1 | Same 5-arg signature |
| Multi-column sort (Shift+click) | Community | T2 | |
| `multiSortKey` | Community | T2 | |
| `suppressMultiSort` / `alwaysMultiSort` | Community | T2 | |
| `sort` / `initialSort` on colDef | Community | T2 | |
| `sortingOrder` custom cycle | Community | T2 | |
| `postSortRows` | Community | T2 | |
| `accentedSort` | Community | T2 | Document perf trade-off |
| `animateRows` on sort | Community | N/A v1 | Renderer concern |
| Absolute sort (`SortDef.type`) | Community | T3+ | Low priority |
| `deltaSort` optimization | Community | T3+ | Internal optimization |
| Server-side sort (SSRM) | Enterprise | T3 | Via datasource, not client |
| Sort in grid state persistence | Community | T2 | Part of serializable state |

**Intentional differences:**

- ol-grid exposes explicit `SortModel` array (AG Grid uses column state); both map to same semantics
- Worker offload is ol-grid value-add (AG Grid handles large sorts on main thread)

---

## 7. Competitive Analysis

| Library | Sort model | Strengths | ol-grid opportunity |
|---------|------------|-----------|----------------------|
| **AG Grid** | Column state + API | Mature, locale sort, post-sort | Match API; MIT multi-sort without Enterprise |
| **TanStack Table** | `SortingState` | Headless, composable | Adopt state shape; add default header UX |
| **MUI Data Grid** | `sortModel` prop | React-native controlled mode | Match controlled `sortModel` ergonomics |
| **Tabulator** | `initialSort`, header click | Simple API | Less type-safe; ol-grid wins on TS |
| **Glide Data Grid** | Limited column sort | Canvas perf | ol-grid DOM default + optional canvas |

**Positioning:** ol-grid sorting MUST feel identical to AG Grid Community for the 90% case (single + multi column, comparator, API) while remaining tree-shakeable.

---

## 8. Tier Assignment

| Capability | Tier | Rationale |
|------------|------|-----------|
| Single-column sort, comparator, API, events | **T1** | MVP grid unusable without sort |
| Multi-column sort, initialSort, postSortRows, accentedSort | **T2** | AG Grid Community parity |
| Worker offload, SSRM pass-through, grouping sort | **T3** | Scale + enterprise row models |

---

## 9. Acceptance Criteria

### 9.1 Tier 1 exit

- [ ] Click "Name" header → rows A–Z; click again → Z–A; third click → source order
- [ ] Custom comparator on "Priority" column orders Critical > High > Low > Info
- [ ] `api.setSortModel([{ colId: 'age', sort: 'desc' }])` sorts without header click
- [ ] `getSortModel()` returns active model; matches after `onSortChanged`
- [ ] `sortable: false` column ignores clicks; no indicator shown
- [ ] axe-core: active header has valid `aria-sort`
- [ ] 100k row CSRM sort completes ≤ 200 ms on M1 MacBook (main thread)
- [ ] Unit tests: `compareValues`, `toggleColumnSort`, `sortRowNodes`, stable sort
- [ ] Integration test: React adapter header click reorders DOM cells

### 9.2 Tier 2 exit

- [ ] Shift+click Country then City → multi-key sort with correct `sortIndex`
- [ ] `initialSort: 'desc'` on Athlete column applies on load
- [ ] `postSortRows` keeps "Summary" row at bottom after any sort
- [ ] Infinite model mock datasource receives `sortModel` on re-fetch
- [ ] `accentedSort` demo: `a à b` order vs default Unicode order

### 9.3 Tier 3 exit

- [ ] 200k row worker sort: UI remains responsive (no >50ms long tasks)
- [ ] SSRM demo: server sort reflected without client reorder

---

## 10. Dependencies

| Dependency | Relationship |
|------------|--------------|
| `@ol-grid/core` | Row model pipeline, `ColumnState`, `GridStore`, `GridApi` base |
| `@ol-grid/dom-renderer` | Header click dispatch, sort indicator rendering, `aria-sort` |
| `@ol-grid/filter` | Sort runs on filtered row set |
| `@ol-grid/grouping` | Within-group sort rules (T3) |
| Infinite / SSRM row models | Pass `sortModel` to datasource (T2/T3) |
| `@ol-grid/react` (etc.) | Controlled `sortModel` prop binding |

**Blocked by:** Column model stable `colId` resolution (implemented).

**Blocks:** Filtered select-all, CSV export order, clipboard row order.

---

## 11. Open Questions

| # | Question | Options | Recommendation |
|---|----------|---------|----------------|
| OQ-SORT-01 | Keep sort in core vs extract to `@ol-grid/sort` immediately | Extract now / defer | Extract before T1 exit to honor tree-shaking |
| OQ-SORT-02 | Default `sortable` value | `true` (AG Grid) / `false` | `true` with `defaultColDef` override |
| OQ-SORT-03 | Null placement in comparator | Always last / always first / configurable | Always last in asc (AG Grid default) |
| OQ-SORT-04 | Support `SortDef` absolute sort in T2? | Yes / defer T3+ | Defer — niche |
| OQ-SORT-05 | Emit `sortChanged` on `rowData` replace with same model? | Yes / no | No — only if order recomputed |

---

## 12. References

- [REQUIREMENTS.md §4.1.3](../REQUIREMENTS.md) — T1-SORT-* IDs
- [REQUIREMENTS.md §4.2.4](../REQUIREMENTS.md) — T2 multi-column sort
- [ARCHITECTURE.md §3.3](../ARCHITECTURE.md) — Row model pipeline
- [AG Grid Row Sorting](https://www.ag-grid.com/javascript-data-grid/row-sorting/)
- [AG Grid Grid Options — accentedSort, postSortRows](https://www.ag-grid.com/javascript-data-grid/grid-options/)
- Implementation: `packages/core/src/sort/`, `packages/core/src/engine/grid-engine.ts`

---

*This document is authoritative for sorting feature scope. Changes require amendment here and cross-reference update in REQUIREMENTS.md §3.3.*

# AG Grid → ol-grid migration guide (draft)

> **Status:** Sprint 9 draft — focused deltas for teams porting AG Grid Community apps.  
> **Full compatibility matrix:** [requirements/ag-grid-migration.md](../requirements/ag-grid-migration.md)  
> **Planned shim:** `@ol-grid/compat-ag-grid` (not shipped yet)

ol-grid uses the same vocabulary as AG Grid (`columnDefs`, `rowData`, `GridApi`, `onGridReady`) where semantics match. This guide covers **intentional differences** and **module wiring** for features shipped in Sprint 8–9.

## Quick mapping

| AG Grid | ol-grid | Notes |
|---------|---------|-------|
| `ag-grid-community` | `@ol-grid/core` + `@ol-grid/dom-renderer` | Headless core + default renderer |
| `AgGridReact` | `OlGrid` from `@ol-grid/react` | Registers sort/filter/pagination modules |
| `createGrid` (vanilla) | `createGrid` from `@ol-grid/vanilla` | Registers sort/filter; pagination manual |
| `gridOptions.api` | `onGridReady` → `event.api` | Same event name |
| `columnApi` | — | Use `GridApi` column methods (`applyColumnState`, etc.) |

---

## Module registration

Several features live in optional packages and **must be registered** before use.

| Feature | Package | Module | Auto-registered in |
|---------|---------|--------|-------------------|
| Sort | `@ol-grid/sort` | `SortModule` | React, Vue, Svelte, vanilla |
| Filters | `@ol-grid/filter` | `FilterModule` | React, Vue, Svelte, vanilla |
| Pagination | `@ol-grid/pagination` | `PaginationModule` | **React, Vue, Svelte only** |
| Infinite row model | `@ol-grid/infinite-row-model` | `InfiniteRowModelModule` | vanilla when `rowModelType: 'infinite'` |

**Vanilla / headless example** — add pagination explicitly:

```ts
import { createGridEngine, ModuleRegistry } from "@ol-grid/core";
import { SortModule } from "@ol-grid/sort";
import { PaginationModule } from "@ol-grid/pagination";
import { createDomRenderer } from "@ol-grid/dom-renderer";

ModuleRegistry.register(SortModule);
ModuleRegistry.register(PaginationModule);

const engine = createGridEngine({
  modules: [SortModule, PaginationModule],
  pagination: true,
  paginationPageSize: 25,
  columnDefs: [/* … */],
  rowData: [/* … */],
});
engine.mount(host, createDomRenderer());
```

Calling `api.paginationGoToNextPage()` without `PaginationModule` throws — same pattern as `setSortModel` without `SortModule`.

---

## Multi-column sort

### AG Grid

```ts
// Shift+click (default) or ctrl+click depending on gridOptions
gridOptions = {
  multiSortKey: 'ctrl',           // optional
  alwaysMultiSort: false,
  suppressMultiSort: false,
};
api.setSortModel([
  { colId: 'country', sort: 'asc', sortIndex: 0 },
  { colId: 'city', sort: 'asc', sortIndex: 1 },
]);
```

### ol-grid

```ts
import type { GridOptions } from "@ol-grid/core";

const options: GridOptions = {
  multiSortKey: 'shift',          // default; or 'ctrl'
  alwaysMultiSort: false,
  suppressMultiSort: false,
  columnDefs: [/* … */],
  rowData: [/* … */],
};

// Imperative API — sortIndex is stored on column state, not in SortModel entries
api.setSortModel([
  { colId: 'country', sort: 'asc' },
  { colId: 'city', sort: 'asc' },
]);
// Order in the array = sort priority (index 0 first)
```

| Topic | AG Grid | ol-grid |
|-------|---------|---------|
| Additive click | Shift or Ctrl per `multiSortKey` | Same (`multiSortKey: 'shift' \| 'ctrl'`) |
| `alwaysMultiSort` | Supported | Supported |
| `suppressMultiSort` | Supported | Supported |
| `sortIndex` on `setSortModel` | Explicit per entry | **Use array order**; `sortIndex` on `ColumnState` / `applyColumnState` |
| Sort indicators | Multi-number badges | Numeric badges + `aria-sort` on headers |
| `postSortRows` | Supported | **Not yet** — use `comparator` or pre-sort `rowData` |

**UI:** Shift+click column headers to add sort keys (React demo: *employees-small* dataset). Requires `SortModule`.

---

## Initial sort (`colDef.sort` / `colDef.initialSort`)

### AG Grid

```ts
columnDefs: [
  { field: 'name', sort: 'asc' },
  { field: 'age', initialSort: 'desc', sortIndex: 1 },
]
```

### ol-grid

```ts
columnDefs: [
  { field: 'name', initialSort: 'asc' },
  { field: 'country', initialSort: { sort: 'asc', sortIndex: 0 } },
  { field: 'city', initialSort: { sort: 'asc', sortIndex: 1 } },
]
```

| Topic | AG Grid | ol-grid |
|-------|---------|---------|
| `colDef.sort` on init | Initial sort | Same — alias for `initialSort` |
| `colDef.initialSort` | Initial sort | Supported |
| `SortDef` with `sortIndex` | Multi-key initial sort | Supported — `extractInitialSortModelFromColumnDefs` |
| `gridOptions.sortModel` | Wins over col defs | **Same** — explicit `sortModel` overrides colDef initial sort |
| Runtime `sort` on colDef | Can change live sort | **Init only** — use `api.setSortModel` after mount |

---

## Client-side pagination

### AG Grid

```ts
gridOptions = {
  pagination: true,
  paginationPageSize: 100,
  paginationPageSizeSelector: [20, 50, 100],
  suppressPaginationPanel: false,
};
api.paginationGoToPage(2);
```

### ol-grid

```ts
const options: GridOptions = {
  pagination: true,
  paginationPageSize: 100,
  paginationPageSizeSelector: [20, 50, 100],
  suppressPaginationPanel: false,
  suppressPaginationOnFilter: false,  // when false (default), filter/sort resets to page 0
  paginationPage: 0,                  // optional controlled 0-based page index
};
```

| Topic | AG Grid | ol-grid |
|-------|---------|---------|
| `pagination` | Enables panel + slicing | Same (CSRM only) |
| `paginationAutoPageSize` | Fits viewport | **Not supported** — set `paginationPageSize` explicitly |
| Row virtualization | Disabled when paginating | **Same** — pagination replaces virtual scroll for CSRM |
| Infinite / SSRM | Server-driven paging | **CSRM client pagination only** in v1; infinite model ignores `pagination` (console warning) |
| Events | `paginationChanged` | `paginationChanged` + `onPaginationChanged` |
| API methods | `paginationGetCurrentPage`, etc. | Same names on `GridApi` |

**React demo:** toggle *Pagination → On (25 / page)* in `examples/react`.

---

## Column groups

### AG Grid

```ts
columnDefs: [
  {
    headerName: 'Organization',
    children: [
      { field: 'role', headerName: 'Role' },
      { field: 'department', headerName: 'Department' },
    ],
  },
]
```

### ol-grid

```ts
columnDefs: [
  {
    headerName: 'Organization',
    groupId: 'organization',   // recommended for stable test IDs & future group state API
    children: [
      { field: 'role', headerName: 'Role' },
      { field: 'department', headerName: 'Department' },
    ],
  },
]
```

| Topic | AG Grid | ol-grid |
|-------|---------|---------|
| Nested `children` | Multi-row headers | Supported — `buildHeaderRows` + dom-renderer |
| `groupId` | Group expand/collapse | **ID for headers/test IDs**; expand/collapse API not yet |
| `marryChildren` | Pin groups together | **Not supported** |
| `columnGroupShow` | Open/closed groups | **Not supported** |
| Pinned groups | Supported | Leaf columns pin individually |
| Sort/filter on group | N/A | Sort/filter on **leaf** columns only |

**React demo:** *employees-small* shows *Organization* and *Timeline* groups.

---

## Test IDs (`data-testid`)

AG Grid does not standardize test hooks. ol-grid exposes stable `data-testid` attributes on the default DOM renderer for Playwright, OLTestStack, and similar tools.

### Grid shell

| Element | `data-testid` |
|---------|---------------|
| Root grid host | `ol-grid` |
| Body viewport | `ol-grid-body-viewport` |
| Center scroll viewport | `ol-grid-center-viewport` |
| Header select-all checkbox | `ol-grid-header-checkbox` |

### Dynamic helpers (`@ol-grid/dom-renderer`)

Import helpers from `@ol-grid/dom-renderer`:

```ts
import {
  headerCellTestId,
  headerGroupTestId,
  bodyCellTestId,
  rowTestId,
  sortIndicatorTestId,
  floatingFilterTestId,
  filterButtonTestId,
} from "@ol-grid/dom-renderer";
```

| Helper | Pattern | Example |
|--------|---------|---------|
| `headerCellTestId(colId)` | `ol-grid-header-{colId}` | `ol-grid-header-name` |
| `headerGroupTestId(groupId)` | `ol-grid-header-group-{groupId}` | `ol-grid-header-group-organization` |
| `bodyCellTestId(row, colId)` | `ol-grid-cell-{row}-{colId}` | `ol-grid-cell-0-name` |
| `rowTestId(row)` | `ol-grid-row-{row}` | `ol-grid-row-0` |
| `rowCheckboxTestId(row)` | `ol-grid-row-checkbox-{row}` | `ol-grid-row-checkbox-0` |
| `sortIndicatorTestId(colId)` | `ol-grid-sort-{colId}` | `ol-grid-sort-name` |
| `floatingFilterTestId(colId)` | `ol-grid-floating-filter-{colId}` | — |
| `filterButtonTestId(colId)` | `ol-grid-filter-button-{colId}` | — |

**Playwright example:**

```ts
await page.getByTestId('ol-grid-header-name').click();
await page.getByTestId('ol-grid-cell-2-role').dblclick();
```

**CSS classes:** ol-grid uses `ol-grid__*` BEM — not `ag-*` classes. Update selectors when migrating visual tests.

---

## What is not covered here

- Row grouping, pivot, SSRM, clipboard, range selection (Tier 3 — see [REQUIREMENTS.md](../REQUIREMENTS.md))
- `@ol-grid/compat-ag-grid` shim (planned)
- Full ColDef property matrix (~95% Community coverage target)
- Getting-started tutorial parity (≤20% mapping changes) — Tier 1 exit item

## See also

- [API reference](./api/index.html) — `GridOptions`, `GridApi`, modules
- [PLAN.md](../PLAN.md) — implementation status
- [requirements/sorting.md](../requirements/sorting.md), [pagination.md](../requirements/pagination.md), [column-model.md](../requirements/column-model.md)

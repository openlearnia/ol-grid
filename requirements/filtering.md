# Feature Requirements: Filtering

> **Package target:** `@ol-grid/filter`  
> **Parent spec:** [REQUIREMENTS.md](../REQUIREMENTS.md) §3.3, §4.2.2  
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

Filtering reduces the set of displayed rows based on column-level criteria, a global quick-filter string, or (optionally) external application logic. ol-grid implements filtering as a **row-model pipeline stage** ahead of sort and grouping, with UI components rendered by `@ol-grid/dom-renderer` or custom filter components supplied by the consumer.

### 1.1 Filter types in scope

| Type | Description | Tier |
|------|-------------|------|
| **Column filters** | Per-column predicate (text, number, date) | T2 |
| **Floating filters** | Inline filter inputs below column headers | T2 |
| **Quick filter** | Single text box matching any column | T2 |
| **Set filter** | Multi-select from unique values (Excel-style) | T3 |
| **Custom filter** | User-provided component + `doesFilterPass` | T2 |
| **External filter** | App-level callback outside grid | T2 (hook only) |

### 1.2 Design principles

- **AND composition:** Active column filters combine with logical AND (row must pass all)
- **Independent layers:** Quick filter AND column filters AND external filter all apply
- **Displayed vs source:** Filtering affects display indices; underlying `rowData` is unchanged
- **Datasource awareness:** Infinite/SSRM pass `filterModel` to server; client does not re-filter server rows
- **Headless logic:** Filter predicates live in `@ol-grid/filter`; UI is renderer/adapter concern

### 1.3 Non-goals (v1)

- Advanced Filter Builder UI (AG Grid Enterprise) — out of scope
- Multi Filter (stacked filters per column, Enterprise) — consider T3+
- OData / GraphQL query generation — app concern

---

## 2. Current Implementation Status

| Capability | Status | Location |
|------------|--------|----------|
| Quick filter text matching | **Implemented** | `filter/quick-filter.ts` |
| `setQuickFilterText` API | **Implemented** | `grid-engine.ts`, `api.ts` |
| `quickFilterText` grid option | **Implemented** | `options.ts`, CSRM |
| Quick filter + sort pipeline | **Implemented** | `client-side-row-model.ts` |
| `onFilterChanged` event type | **Defined** | `events.ts` (not emitted for column filters) |
| Text column filter | **Not implemented** | |
| Number column filter | **Not implemented** | |
| Date column filter | **Not implemented** | |
| Floating filter row | **Not implemented** | |
| Set filter | **Not implemented** | |
| `filterModel` / `setFilterModel` | **Not implemented** | |
| Custom filter components | **Not implemented** | |
| `filterable` on ColumnDef | **Type only** | `column.ts` |
| `@ol-grid/filter` package | **Not created** | |
| Filter UI in column menu | **Not implemented** | |
| External filter callback | **Not implemented** | |

---

## 3. User Stories

### Quick filter (Tier 2 — partial T1 foundation exists)

| ID | Story | Priority |
|----|-------|----------|
| US-FL-01 | As an app developer, I bind a search input to `quickFilterText` so users can search across all columns | Must |
| US-FL-02 | As an app developer, I call `api.setQuickFilterText('acme')` to filter imperatively | Must |
| US-FL-03 | As a user, quick filter matches formatted display values (via `valueFormatter`), not just raw fields | Should |

### Column filters (Tier 2)

| ID | Story | Priority |
|----|-------|----------|
| US-FL-04 | As a user, I open a text filter on "Name" and choose "Contains" + "John" to narrow rows | Must |
| US-FL-05 | As a user, I filter a number column with greater-than / less-than / equals operators | Must |
| US-FL-06 | As a user, I filter a date column with before / after / in-range presets | Must |
| US-FL-07 | As an app developer, I provide a custom React filter component for a status enum column | Must |
| US-FL-08 | As an app developer, I persist `filterModel` to URL query params and restore on load | Should |

### Floating filters (Tier 2)

| ID | Story | Priority |
|----|-------|----------|
| US-FL-09 | As a user, I type directly in a floating filter row under headers without opening a menu | Should |
| US-FL-10 | As an app developer, I disable floating filters per column with `floatingFilter: false` | Should |

### Set filter (Tier 3)

| ID | Story | Priority |
|----|-------|----------|
| US-FL-11 | As a user, I select multiple country values from a checkbox list to show only those rows | Should |
| US-FL-12 | As an app developer with 50k rows, set filter values load lazily with search-as-you-type | Should |
| US-FL-13 | As a user, "Select All" in set filter respects other active column filters | Should |

### Integration

| ID | Story | Priority |
|----|-------|----------|
| US-FL-14 | As an app developer, filtered row count updates and selection clears or respects filter per config | Must |
| US-FL-15 | As an app developer, infinite row model sends `filterModel` to `getRows` | Must |

---

## 4. Functional Requirements

### 4.1 Quick filter

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-FL-01 | `quickFilterText` grid option MUST filter rows where any visible column's formatted value contains the text (case-insensitive) | Must |
| REQ-FL-02 | `api.setQuickFilterText(text)` MUST be equivalent to controlled `quickFilterText` prop | Must |
| REQ-FL-03 | Empty or whitespace-only quick filter MUST show all rows (pass-through) | Must |
| REQ-FL-04 | Hidden columns (`hide: true`) MUST be excluded from quick filter scan | Must |
| REQ-FL-05 | `onFilterChanged` MUST fire when quick filter text changes | Must |
| REQ-FL-06 | Quick filter MUST use `valueGetter` + `valueFormatter` pipeline for match text | Should |

### 4.2 Column filters — provided types

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-FL-10 | `filter: true` or `filter: 'text'` MUST enable text filter with operators: contains, notContains, equals, notEqual, startsWith, endsWith | Must |
| REQ-FL-11 | `filter: 'number'` MUST support: equals, notEqual, lessThan, lessThanOrEqual, greaterThan, greaterThanOrEqual, inRange | Must |
| REQ-FL-12 | `filter: 'date'` MUST support: equals, notEqual, lessThan, greaterThan, inRange, with date parsing | Must |
| REQ-FL-13 | Multiple active column filters MUST combine with AND | Must |
| REQ-FL-14 | `filterParams` MUST configure defaults (e.g. `defaultOption`, `debounceMs`, `buttons: ['apply','clear']`) | Should |
| REQ-FL-15 | `filterValueGetter` on colDef MAY supply value distinct from display value for filtering | Should |
| REQ-FL-16 | `doesFilterPass` on custom filter MUST receive `{ node, data, filterModel }` | Must |
| REQ-FL-17 | Filter UI MUST be accessible: keyboard operable, labels via `localeText` | Must |

### 4.3 Floating filters

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-FL-20 | `floatingFilter: true` on colDef MUST render inline filter below header when column has filter | Should |
| REQ-FL-21 | `floatingFilterComponent` MUST allow custom floating UI | Should |
| REQ-FL-22 | Floating filter changes MUST debounce (default 500ms) before applying | Should |
| REQ-FL-23 | `suppressFloatingFilterButton: true` MUST hide filter menu button in floating cell | Could |
| REQ-FL-24 | Floating filter row height MUST be themable via `--ol-grid-floating-filter-height` | Should |
| REQ-FL-25 | Floating filter inputs MUST be focusable via click and Tab; grid keyboard handler MUST NOT steal keys while focused | Must |
| REQ-FL-26 | Filter popup inputs MUST be focusable and excluded from grid keyboard interception while open | Must |

### 4.4 Set filter (Tier 3)

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-FL-30 | `filter: 'set'` MUST show searchable list of unique values for column | Should |
| REQ-FL-31 | Set filter model MUST be `{ filterType: 'set', values: string[] }` | Should |
| REQ-FL-32 | `suppressSorting` on set filter params MUST disable value list sort | Could |
| REQ-FL-33 | For large datasets, `values` MAY be supplied async via `values: (params) => void` callback | Should |
| REQ-FL-34 | Excel mode: selected values = show only those; empty selection = show none | Should |
| REQ-FL-35 | Set filter MUST integrate with SSRM via server-side value list endpoint (callback) | Should |

### 4.5 API & model

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-FL-40 | `api.setFilterModel(model)` / `getFilterModel()` MUST round-trip all column filter state | Must |
| REQ-FL-41 | `api.onFilterChanged()` MUST subscribe to any filter layer change | Must |
| REQ-FL-42 | `filterModel` JSON MUST be serializable for grid state persistence | Must |
| REQ-FL-43 | `isExternalFilterPresent` + `doesExternalFilterPass` hooks MUST allow app-level filter | Should |
| REQ-FL-44 | `onFilterOpened` / `onFilterChanged` MUST include `source: 'ui' \| 'api' \| 'floating'` | Should |
| REQ-FL-45 | `api.destroyFilter(colKey)` MUST remove filter and refresh rows | Should |

### 4.6 Composition & side effects

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-FL-50 | Filter → sort pipeline order MUST be: filter first, then sort | Must |
| REQ-FL-51 | Row selection MUST operate on filtered indices; `getSelectedRows()` returns data for selected IDs regardless of filter visibility | Must |
| REQ-FL-52 | `selectAll` MUST respect `rowSelection.selectAll: 'filtered' \| 'all'` option | T2 |
| REQ-FL-53 | CSV export MUST export filtered+sorted displayed rows by default | Must |
| REQ-FL-54 | Infinite/SSRM `getRows` MUST include `filterModel` and `quickFilter` in params | Must |

---

## 5. API & Events

### 5.1 Column definition

```typescript
interface ColumnDef<TData> {
  filter?: boolean | 'text' | 'number' | 'date' | 'set' | FilterComponentDef;
  filterParams?: TextFilterParams | NumberFilterParams | DateFilterParams | SetFilterParams;
  filterValueGetter?: (params: ValueGetterParams<TData>) => unknown;
  floatingFilter?: boolean;
  floatingFilterComponent?: string | ComponentDef;
  floatingFilterComponentParams?: Record<string, unknown>;
}

interface TextFilterModel {
  filterType: 'text';
  type: 'contains' | 'notContains' | 'equals' | 'notEqual' | 'startsWith' | 'endsWith';
  filter: string;
}

interface NumberFilterModel {
  filterType: 'number';
  type: 'equals' | 'notEqual' | 'lessThan' | 'lessThanOrEqual' | 'greaterThan' | 'greaterThanOrEqual' | 'inRange';
  filter: number;
  filterTo?: number;
}

interface DateFilterModel {
  filterType: 'date';
  type: 'equals' | 'notEqual' | 'lessThan' | 'greaterThan' | 'inRange';
  dateFrom: string;
  dateTo?: string;
}

interface SetFilterModel {
  filterType: 'set';
  values: string[];
}

type FilterModel = Record<string, TextFilterModel | NumberFilterModel | DateFilterModel | SetFilterModel>;
```

### 5.2 Grid options

```typescript
interface GridOptions<TData> {
  quickFilterText?: string;
  filterModel?: FilterModel;
  isExternalFilterPresent?: () => boolean;
  doesExternalFilterPass?: (node: RowNode<TData>) => boolean;
  includeHiddenColumnsInQuickFilter?: boolean;  // default false
  onFilterChanged?: (event: FilterChangedEvent) => void;
  onFilterOpened?: (event: FilterOpenedEvent) => void;
}
```

### 5.3 GridApi (`@ol-grid/filter` augmentation)

```typescript
interface GridApi<TData> {
  setFilterModel(model: FilterModel | null): void;
  getFilterModel(): FilterModel;
  setQuickFilterText(text: string): void;
  getQuickFilterText(): string;
  onFilterChanged(listener: (e: FilterChangedEvent) => void): Unsubscribe;
  destroyFilter(colKey: string): void;
}
```

### 5.4 Custom filter component interface

```typescript
interface FilterComponent<TData> {
  init(params: FilterDisplayParams<TData>): void;
  getModel(): FilterModel[string] | null;
  setModel(model: FilterModel[string] | null): void;
  isFilterActive(): boolean;
  doesFilterPass(params: DoesFilterPassParams<TData>): boolean;
  destroy?(): void;
}
```

### 5.5 Module registration

```typescript
import { FilterModule } from '@ol-grid/filter';
ModuleRegistry.register(FilterModule);
```

Registers `filteredRowModel` stage, filter UI component registry, and store slice `filtering: { filterModel, quickFilterText }`.

---

## 6. AG Grid Parity

Reference: [AG Grid Filtering](https://www.ag-grid.com/javascript-data-grid/filtering/)

| AG Grid feature | AG Grid tier | ol-grid | Notes |
|-----------------|--------------|---------|-------|
| Text filter | Community | T2 | Match operator set |
| Number filter | Community | T2 | |
| Date filter | Community | T2 | |
| BigInt filter | Community | T3+ | Low priority |
| Custom filter component | Community | T2 | |
| Floating filters | Community | T2 | |
| Quick filter | Community | T2 | Partial impl exists |
| Set filter | **Enterprise** | **T3** | MIT — ol-grid differentiator |
| Multi filter | **Enterprise** | N/A v1 | |
| Advanced filter builder | **Enterprise** | N/A v1 | |
| External filter | Community | T2 | Hooks only |
| `filterModel` API | Community | T2 | |
| Filter tool panel | **Enterprise** | T3 | `@ol-grid/accessories` |
| Apply / Clear / Reset buttons | Community | T2 | Via `filterParams.buttons` |

**ol-grid value-add:** Set filter under MIT (AG Grid Enterprise only).

---

## 7. Competitive Analysis

AG Grid leads on filter depth (Enterprise set/multi filters). TanStack Table provides headless `columnFilters` only — ol-grid adds default UI. MUI Data Grid gates quick filter behind Pro; ol-grid includes it in T2 MIT. Tabulator and Handsontable offer comparable UX but weaker TypeScript integration.

---

## 8. Tier Assignment

| Feature | Tier |
|---------|------|
| Quick filter (complete, events, formatter-aware) | T2 (foundation in T1 codebase) |
| Text / number / date column filters | T2 |
| Custom filter components | T2 |
| Floating filters | T2 |
| External filter hooks | T2 |
| Set filter | T3 |
| Filter tool panel | T3 |
| Worker offload filter (100k+ rows) | T3 |

---

## 9. Acceptance Criteria

### 9.1 Quick filter

- [ ] Text match uses `valueFormatter`; `onFilterChanged` fires; clearing restores all rows

### 9.2 Column filters (T2)

- [ ] Text/number/date operators work; AND composition; custom React filter; `setFilterModel` round-trip; axe-core clean

### 9.3 Floating filters (T2)

- [ ] Floating row renders, debounces input, empty placeholder for non-floating columns

### 9.4 Set filter (T3)

- [ ] Searchable value list, multi-select filtering, async values for 50k rows, serializable model

### 9.5 Integration

- [ ] Filter + sort: filtered subset sorted correctly; infinite model receives `filterModel`; CSV export reflects filtered rows

---

## 10. Dependencies

| Package | Role |
|---------|------|
| `@ol-grid/core` | Pipeline stage registration, `RowNode`, store |
| `@ol-grid/dom-renderer` | Filter popup, floating row, column menu |
| `@ol-grid/sort` | Runs after filter stage |
| Framework adapters | Mount custom filter/editor components |
| `@ol-grid/themes` | Filter popup and floating row styles |
| `@ol-grid/i18n` | Operator labels, buttons (T2) |

**Blocked by:** Column menu / header component (T2), `localeText` (T2).

**Blocks:** Filtered select-all, SSRM filter pass-through, filter tool panel.

---

## 11. Open Questions

| # | Question | Options | Recommendation |
|---|----------|---------|----------------|
| OQ-FL-01 | Set filter in T2 or T3? | T2 / T3 | T3 per REQUIREMENTS.md OQ-4; quick filter suffices for T2 exit |
| OQ-FL-02 | Default filter apply mode | Instant / Apply button | Instant for floating; Apply button optional in popup |
| OQ-FL-03 | Date filter timezone handling | UTC / local / explicit | Local with `Intl`; document behavior |
| OQ-FL-04 | Cache unique values for set filter on CSRM? | Full scan / incremental | Full scan <10k; async callback above |
| OQ-FL-05 | Emit `filterChanged` on every keystroke or debounced? | Debounced default 500ms | Debounced for floating; immediate on Apply |

---

## 12. References

- [REQUIREMENTS.md §4.2.2](../REQUIREMENTS.md) — T2-FL-* IDs
- [ARCHITECTURE.md §3.3](../ARCHITECTURE.md) — `filteredRowModel` stage
- [AG Grid Column Filters](https://www.ag-grid.com/javascript-data-grid/filtering/)
- [AG Grid Floating Filters](https://www.ag-grid.com/javascript-data-grid/floating-filters/)
- [AG Grid Quick Filter](https://www.ag-grid.com/javascript-data-grid/filter-quick/)
- [AG Grid Set Filter](https://www.ag-grid.com/javascript-data-grid/filter-set/) (Enterprise reference)
- Implementation: `packages/core/src/filter/quick-filter.ts`

---

*Authoritative for filtering scope.*

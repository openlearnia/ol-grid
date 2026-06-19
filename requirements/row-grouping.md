# Row Grouping — Feature Requirements

> **Package:** `@ol-grid/grouping`  
> **Tier:** 3  
> **Status:** Draft — pre-implementation  
> **Parent:** [REQUIREMENTS.md](../REQUIREMENTS.md) · [ARCHITECTURE.md](../ARCHITECTURE.md)

**Document version:** 1.0  
**Last updated:** June 2026

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement & MIT Positioning](#2-problem-statement--mit-positioning)
3. [AG Grid Enterprise Parity Analysis](#3-ag-grid-enterprise-parity-analysis)
4. [User Stories](#4-user-stories)
5. [Functional Requirements](#5-functional-requirements)
6. [API Design](#6-api-design)
7. [Architecture Integration](#7-architecture-integration)
8. [Tier 3 Delivery Plan](#8-tier-3-delivery-plan)
9. [Non-Functional Requirements](#9-non-functional-requirements)
10. [Competitive Analysis](#10-competitive-analysis)
11. [Acceptance Criteria](#11-acceptance-criteria)
12. [Dependencies & Prerequisites](#12-dependencies--prerequisites)
13. [Open Questions](#13-open-questions)
14. [References](#14-references)

---

## 1. Executive Summary

Row grouping transforms a flat client-side or server-side dataset into a hierarchical display where rows are bucketed by one or more column values. Group rows show expand/collapse affordances, optional footers, and aggregate summaries. In AG Grid, row grouping is an **Enterprise-only** feature (~$999/developer/year). ol-grid delivers equivalent grouping under **MIT license** as the `@ol-grid/grouping` module, registered via `ModuleRegistry`.

This document specifies functional requirements, public API, integration with the row-model pipeline, SSRM lazy loading, UI accessories (row group panel), and parity targets against AG Grid Enterprise and Tabulator.

**Scope boundary:** Row grouping covers grouping mechanics, group row rendering, expand/collapse state, and integration with aggregation (see [aggregation.md](./aggregation.md)). Pivot mode is specified separately in [pivoting.md](./pivoting.md). Tree data (path-based hierarchy) is specified in [tree-data.md](./tree-data.md).

---

## 2. Problem Statement & MIT Positioning

### 2.1 User problem

Enterprise admin grids frequently need to summarize data by dimension — sales by region, tickets by status, inventory by warehouse. Without native grouping, teams either:

- Pre-aggregate on the server and lose drill-down UX
- Pay AG Grid Enterprise licensing per developer
- Build brittle custom UI on top of TanStack Table

### 2.2 ol-grid positioning

| Aspect | AG Grid Enterprise | ol-grid |
|--------|-------------------|---------|
| License | Commercial EULA | **MIT** (`@ol-grid/grouping`) |
| Bundle | Monolithic enterprise bundle | Tree-shakeable opt-in module |
| Framework | Strong adapters, heavy core | Equal-first React/Vue/Angular/Svelte/vanilla |
| SSRM grouping | Enterprise | Tier 3 MIT (see T3-SS-01) |

### 2.3 Design principles (grouping-specific)

| ID | Principle |
|----|-----------|
| RG-P-01 | Grouping logic lives in `@ol-grid/grouping`; core exposes pipeline hooks only |
| RG-P-02 | Group state is serializable (expand/collapse, group column order) |
| RG-P-03 | API names align with AG Grid where semantics match (`rowGroup`, `autoGroupColumnDef`) |
| RG-P-04 | Grouping composes with sort, filter, selection without order ambiguity |
| RG-P-05 | Default group row renderer ships in `@ol-grid/dom-renderer`; headless core emits group metadata |

---

## 3. AG Grid Enterprise Parity Analysis

Reference: [AG Grid Row Grouping](https://www.ag-grid.com/javascript-data-grid/grouping/) (Enterprise).

| AG Grid Enterprise Feature | ol-grid Target | Priority | Notes |
|----------------------------|----------------|----------|-------|
| Group by column (`rowGroup: true`) | REQ-RG-01 | Must | Declarative on `ColumnDef` |
| Multi-level grouping (column order) | REQ-RG-02 | Must | Group order = column order in model |
| Expand / collapse group | REQ-RG-03 | Must | Per-group + expand all / collapse all |
| Auto group column | REQ-RG-04 | Must | Dedicated column for group key + chevron |
| Custom group row renderer | REQ-RG-05 | Should | `groupRowRenderer` callback |
| Row group panel (drag columns) | REQ-RG-06 | Should | Side panel or top drop zone |
| `groupDefaultExpanded` | REQ-RG-07 | Must | Depth-based default expansion |
| `suppressRowGroup` / hide grouped columns | REQ-RG-08 | Should | Option to hide source columns |
| Server-side row group lazy load | REQ-RG-09 | Must | With SSRM; see SSRM spec |
| `showOpenedGroup` | REQ-RG-10 | Should | Show group value in leaf rows |
| `groupIncludeFooter` / total footer rows | REQ-RG-11 | Should | Requires aggregation module |
| `groupSelectsChildren` | REQ-RG-12 | Should | Selection propagates to children |
| `groupSelectsFiltered` | REQ-RG-13 | Should | Filter-aware group selection |
| `rowGroupPanelShow` (`always` / `onlyWhenGrouping`) | REQ-RG-06 | Should | Panel visibility modes |
| `isRowSelectable` on group rows | REQ-RG-14 | Should | Callback excludes group rows |
| Keyboard expand/collapse | REQ-RG-15 | Must | Left/Right arrows on focused group row |
| `onColumnRowGroupChanged` event | REQ-RG-16 | Must | Emitted when group model changes |

**Explicit non-parity (v1):**

- AG Grid "grouping bar" integrated charts — out of scope
- Row grouping with pivot simultaneously in SSRM — pivot handled in [pivoting.md](./pivoting.md); combined SSRM+pivot is Phase 3b

---

## 4. User Stories

### 4.1 Application developer

| ID | Story | Acceptance hint |
|----|-------|-----------------|
| US-RG-01 | As a developer, I mark `country` and `state` columns as row groups so the grid displays a two-level hierarchy | Two levels visible; expand/collapse works |
| US-RG-02 | As a developer, I call `api.setRowGroupColumns(['country', 'state'])` imperatively to change grouping at runtime | DOM updates; event fires |
| US-RG-03 | As a developer, I configure `groupDefaultExpanded: 1` so first level starts expanded | Level 0 collapsed, level 1 expanded |
| US-RG-04 | As a developer, I hide grouped source columns and rely on the auto group column | Source columns hidden; keys visible in group column |
| US-RG-05 | As a developer, I provide a custom `groupRowRenderer` to show icons per group type | Custom renderer receives `node`, `field`, `value` |

### 4.2 End user (grid consumer)

| ID | Story | Acceptance hint |
|----|-------|-----------------|
| US-RG-06 | As an analyst, I drag "Department" from the column list to the row group panel to group data | Group appears without code change |
| US-RG-07 | As an analyst, I double-click a group row to expand/collapse it | Toggle matches AG Grid behavior |
| US-RG-08 | As an analyst, I use keyboard Left/Right on a focused group row to collapse/expand | a11y announcement fires |
| US-RG-09 | As an analyst, I sort within a group and see child rows reorder | Sort applies within group scope |

### 4.3 Platform / enterprise team

| ID | Story | Acceptance hint |
|----|-------|-----------------|
| US-RG-10 | As a platform engineer, I lazy-load group children from a REST API via SSRM | Expand triggers `getRows` with group keys |
| US-RG-11 | As a platform engineer, I persist expand/collapse state in URL query params via serializable `ExpansionState` | `getState()` includes expansion slice |
| US-RG-12 | As a platform engineer, I import grouping only when needed to keep bundle small | No grouping code in bundle without import |

---

## 5. Functional Requirements

### 5.1 Core grouping engine

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-RG-01 | Support declaring row group columns via `columnDef.rowGroup: boolean \| number` (order index) | Must |
| REQ-RG-02 | Support multi-column grouping; group hierarchy depth equals number of active group columns | Must |
| REQ-RG-03 | Group rows MUST be `RowNode` instances with `group: true`, `level`, `key`, `field`, `expanded`, `childrenAfterGroup` | Must |
| REQ-RG-04 | Inject `groupedRowModel` stage after filter and sort in CSRM pipeline | Must |
| REQ-RG-05 | Leaf rows retain original `data`; group rows MAY have `data: undefined` and `key: string \| null` | Must |
| REQ-RG-06 | Changing group columns MUST rebuild group tree without full grid destroy | Must |
| REQ-RG-07 | Group keys MUST be derived from cell value (`valueGetter` → raw value); null/undefined → `"(Blanks)"` locale key | Must |
| REQ-RG-08 | Support `groupAllowUnbalanced` for ragged hierarchies (optional, v1 Should) | Should |

### 5.2 Expand / collapse

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-RG-03 | Toggle `expanded` on group row via click, double-click (configurable), or API | Must |
| REQ-RG-07 | `groupDefaultExpanded: number \| -1` controls initial expansion depth (`-1` = all expanded) | Must |
| REQ-RG-15 | Keyboard: Right expands, Left collapses focused group row | Must |
| REQ-RG-17 | `api.expandAll()` / `api.collapseAll()` expand or collapse entire tree | Must |
| REQ-RG-18 | `api.setRowNodeExpanded(node, expanded, expandParents?)` imperative control | Must |
| REQ-RG-19 | Collapsing parent hides descendant rows from virtualizer row count | Must |
| REQ-RG-20 | Emit `rowGroupOpened` event with `node`, `expanded` | Must |

### 5.3 Auto group column

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-RG-04 | When grouping active, auto-insert group column unless `autoGroupColumnDef` disabled | Must |
| REQ-RG-21 | Auto group column shows indent by `level`, expand icon, and formatted group key | Must |
| REQ-RG-22 | `autoGroupColumnDef` merges with defaults (`headerName`, `width`, `cellRenderer`, `pinned`) | Must |
| REQ-RG-23 | Auto group column participates in column pin model like any column | Must |
| REQ-RG-24 | `showOpenedGroup: true` repeats group value in leaf rows under expanded parent | Should |

### 5.4 UI — row group panel

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-RG-06 | Optional row group panel accepts drag-drop of columns to add/remove grouping | Should |
| REQ-RG-25 | `rowGroupPanelShow: 'always' \| 'onlyWhenGrouping' \| 'never'` | Should |
| REQ-RG-26 | Panel lists active group columns in order; drag reorders grouping levels | Should |
| REQ-RG-27 | Removing column from panel clears its `rowGroup` flag | Should |
| REQ-RG-28 | Panel requires `@ol-grid/ui-panels` plugin or built-in side bar (T3-UI-01) | Should |

### 5.5 Column visibility & display

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-RG-08 | `suppressRowGroupHidesColumns: true` keeps grouped columns visible | Should |
| REQ-RG-29 | Default: grouped columns auto-hidden from display (AG Grid default) | Must |
| REQ-RG-30 | `groupDisplayType: 'singleColumn' \| 'multipleColumns'` (multiple = show each group level in its own column) | Should |

### 5.6 Selection integration

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-RG-12 | `groupSelectsChildren: true` selects all descendant leaf rows when group row selected | Should |
| REQ-RG-13 | `groupSelectsFiltered: true` selects only filtered-visible children | Should |
| REQ-RG-14 | `isRowSelectable` callback receives group nodes; default group rows selectable | Should |
| REQ-RG-31 | Checkbox column indeterminate state when partial child selection | Should |

### 5.7 Server-side row model (SSRM)

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-RG-09 | SSRM: expanding group row requests child rows via datasource with `groupKeys: string[]` | Must |
| REQ-RG-32 | SSRM group rows include `rowCount` for scrollbar and "partial load" stubs | Must |
| REQ-RG-33 | SSRM supports multiple group levels with lazy fetch per level | Must |
| REQ-RG-34 | Stale SSRM group responses discarded via request sequence token | Must |

### 5.8 Events & state

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-RG-16 | Emit `columnRowGroupChanged` when group column set changes | Must |
| REQ-RG-35 | `ExpansionState` slice serializable: `{ expandedRowIds: string[] }` or equivalent | Must |
| REQ-RG-36 | Controlled mode: external `expansionState` prop syncs with store | Should |

---

## 6. API Design

### 6.1 GridOptions additions

```typescript
interface GroupingGridOptions<TData = unknown> {
  // Column-level (on ColumnDef)
  // rowGroup?: boolean | number;
  // rowGroupIndex?: number;
  // enableRowGroup?: boolean;

  autoGroupColumnDef?: ColumnDef<TData>;
  groupDefaultExpanded?: number;          // -1 = all
  groupDisplayType?: 'singleColumn' | 'multipleColumns';
  groupAllowUnbalanced?: boolean;
  groupHideOpenParents?: boolean;
  groupHideParentOfSingleChild?: boolean | 'leafGroupsOnly';
  groupSelectsChildren?: boolean;
  groupSelectsFiltered?: boolean;
  groupIncludeFooter?: boolean;
  groupIncludeTotalFooter?: boolean;
  groupRowRenderer?: string | GroupRowRendererDef;
  groupRowRendererParams?: Record<string, unknown>;
  rowGroupPanelShow?: 'always' | 'onlyWhenGrouping' | 'never';
  suppressRowGroupHidesColumns?: boolean;
  showOpenedGroup?: boolean;

  onColumnRowGroupChanged?(event: ColumnRowGroupChangedEvent): void;
  onRowGroupOpened?(event: RowGroupOpenedEvent): void;
}
```

### 6.2 GridApi extensions (module augmentation)

```typescript
declare module '@ol-grid/core' {
  interface GridApi {
    setRowGroupColumns(colKeys: (string | ColumnDef)[]): void;
    getRowGroupColumns(): ColumnDef[];
    addRowGroupColumn(colKey: string): void;
    removeRowGroupColumn(colKey: string): void;
    moveRowGroupColumn(fromIndex: number, toIndex: number): void;
    setRowNodeExpanded(node: RowNode, expanded: boolean, expandParents?: boolean): void;
    expandAll(): void;
    collapseAll(): void;
    isGroupExpanded(node: RowNode): boolean;
  }
}
```

### 6.3 RowNode extensions

```typescript
interface RowNode<TData = unknown> {
  group?: boolean;
  key?: string | null;           // group value
  field?: string;                // grouping column field
  level?: number;                // 0 = root group level
  expanded?: boolean;
  childrenAfterGroup?: RowNode<TData>[];
  allChildrenCount?: number;     // SSRM: total children on server
  uiLevel?: number;              // display indent level
}
```

### 6.4 Module registration

```typescript
import { ModuleRegistry } from '@ol-grid/core';
import { GroupingModule } from '@ol-grid/grouping';

ModuleRegistry.register(GroupingModule);
```

### 6.5 Row model pipeline position

```
rawData → filteredRowModel → sortedRowModel → groupedRowModel → virtualizer
```

Grouping MUST run after sort so group member order reflects sort model. Filter before sort ensures group keys reflect filtered population.

---

## 7. Architecture Integration

### 7.1 Package: `@ol-grid/grouping`

| Component | Responsibility |
|-----------|----------------|
| `groupedRowModel` stage | Build group tree from flat sorted rows (CSRM) |
| `GroupingStore` slice | Active group columns, expansion state |
| `GroupingController` | API methods, event dispatch |
| `groupKeyExtractor` | Value → string key with locale blank label |
| SSRM adapter hooks | Pass `groupKeys` to datasource |

### 7.2 Renderer contract

Core emits `RenderRow` discriminated union:

```typescript
type RenderRow =
  | { type: 'leaf'; node: RowNode; rowIndex: number }
  | { type: 'group'; node: RowNode; rowIndex: number; indent: number };
```

DOM renderer applies `.ol-grid__row--group`, indent padding, chevron rotation via CSS transform.

### 7.3 Virtualizer interaction

Display row count = flattened visible nodes (respecting collapse). Row indices are **display indices**, not data indices. `getRowNode(id)` uses stable row IDs independent of display index.

### 7.4 Worker offload (optional T3-SC-03)

For CSRM datasets >100k rows, group tree build MAY run in Web Worker; main thread receives immutable group tree snapshot.

---

## 8. Tier 3 Delivery Plan

| Phase | Deliverable | Exit criterion |
|-------|-------------|----------------|
| T3a | CSRM single + multi group, auto column, expand/collapse | Demo: Olympic athletes by country + sport |
| T3a | API + events + serializable state | Unit tests ≥90% for group tree builder |
| T3b | SSRM lazy group expand | Mock server demo |
| T3b | Row group panel UI | Drag column → group |
| T3c | Selection + footer integration with aggregation | Group footer shows sum |
| T3c | Keyboard a11y + axe clean | WCAG grid pattern for group rows |

**Estimated bundle impact:** `@ol-grid/grouping` ≤ 12 KB gzip (excluding aggregation).

---

## 9. Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-RG-01 | Build group tree for 50k rows × 2 group columns | ≤ 150 ms main thread |
| NFR-RG-02 | Expand/collapse single group | ≤ 16 ms frame (virtualizer recalc only) |
| NFR-RG-03 | Memory: group tree nodes ≤ 2× leaf count worst case | Documented |
| NFR-RG-04 | Module has zero runtime deps beyond `@ol-grid/core` | Must |
| NFR-RG-05 | Group row aria: `aria-expanded`, `aria-level`, `aria-setsize` | Must |
| NFR-RG-06 | Screen reader announces "Group expanded/collapsed" | Should |

---

## 10. Competitive Analysis

### 10.1 vs AG Grid Enterprise

| Dimension | AG Grid Enterprise | ol-grid |
|-----------|-------------------|---------|
| License cost | ~$999/dev/year | **$0** (MIT) |
| Feature depth | Mature; edge cases (unbalanced, SSRM pivot combo) | Target 95% parity v1 |
| Bundle | Enterprise modules increase bundle | Opt-in ~12 KB |
| Docs / support | Commercial support SLA | Community + docs |
| Migration | N/A | Familiar API (`rowGroup`, `autoGroupColumnDef`) |

**ol-grid advantage:** Zero license friction for grouping in internal tools, SaaS products, and OSS.

**AG Grid advantage:** Battle-tested SSRM+pivot+charts integration; enterprise support.

### 10.2 vs Tabulator

| Dimension | Tabulator | ol-grid |
|-----------|-----------|---------|
| License | MIT | MIT |
| Grouping | Built-in `groupBy`; multi-level supported | Parity target |
| API style | jQuery-era options object; less TS-native | Strict TS; AG Grid-like |
| Virtualization | Yes; performance varies | Viewport-bound DOM; canvas tier for scale |
| SSRM | "Ajax" progressive loading; less formal SSRM | Explicit SSRM contract |
| Row group panel | Not first-class; manual config | Drag-drop panel (T3) |

**Tabulator advantage:** Single package; quick prototypes.

**ol-grid advantage:** Headless core; framework adapters; formal SSRM; AG Grid migration path.

### 10.3 vs TanStack Table

TanStack Table v8 supports grouping via `getGroupedRowModel()` but provides **no default group row UI**, no SSRM grouping, and no row group panel. ol-grid exceeds TanStack for batteries-included enterprise grouping.

---

## 11. Acceptance Criteria

### 11.1 Functional

- [ ] Group by one column: correct row count, keys match distinct values
- [ ] Group by two columns: nested hierarchy with correct levels
- [ ] Expand/collapse updates visible rows and scrollbar extent
- [ ] `setRowGroupColumns` at runtime rebuilds tree
- [ ] Auto group column renders indent + chevron + formatted key
- [ ] Sort within groups preserves group structure
- [ ] Filter reduces groups to matching leaves only
- [ ] SSRM: expand group fetches children from mock API
- [ ] `expandAll` / `collapseAll` work on 10k-group dataset
- [ ] Events `columnRowGroupChanged`, `rowGroupOpened` fire with typed payloads

### 11.2 Non-functional

- [ ] 50k row × 2-level grouping demo completes tree build ≤ 150 ms
- [ ] axe-core: zero critical violations on grouped grid demo
- [ ] Keyboard-only expand/collapse operable
- [ ] Bundle: `@ol-grid/grouping` ≤ 12 KB gzip

### 11.3 Migration (AG Grid)

- [ ] AG Grid "Row Grouping" docs example reproducible with ≤ 3 API renames documented

---

## 12. Dependencies & Prerequisites

| Dependency | Reason |
|------------|--------|
| `@ol-grid/core` T1 complete | RowModel pipeline, RowNode, Virtualizer |
| `@ol-grid/sort` T1 | Sort before group |
| `@ol-grid/filter` T2 | Filter before group |
| `@ol-grid/aggregation` T3 | Group footers (optional coupling) |
| SSRM (core T3) | Lazy server groups |
| `@ol-grid/ui-panels` T3 | Row group panel (optional) |

---

## 13. Open Questions

| # | Question | Options | Deadline |
|---|----------|---------|----------|
| OQ-RG-1 | Default hide grouped columns? | AG Grid default (hide) / show | T3a kickoff |
| OQ-RG-2 | `groupTotalRow` placement | Fixed footer row vs inline group footer | T3b |
| OQ-RG-3 | Date grouping buckets (year/month/day) | v1 / v1.1 | T3 planning |
| OQ-RG-4 | Worker path for group tree build | Opt-in flag / auto threshold | T3c |

---

## 14. References

- [AG Grid Row Grouping (Enterprise)](https://www.ag-grid.com/javascript-data-grid/grouping/)
- [AG Grid Auto Group Column](https://www.ag-grid.com/javascript-data-grid/grouping-single-group-column/)
- [AG Grid SSRM Row Grouping](https://www.ag-grid.com/javascript-data-grid/server-side-model-grouping/)
- [Tabulator Grouping](http://tabulator.info/docs/6.3/group)
- [ol-grid REQUIREMENTS.md §4.3.1](../REQUIREMENTS.md)
- [ol-grid ARCHITECTURE.md §3.3](../ARCHITECTURE.md)
- [aggregation.md](./aggregation.md)
- [pivoting.md](./pivoting.md)

---

*This document is authoritative for row grouping scope. Changes require explicit amendment.*

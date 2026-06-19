# Master / Detail — Feature Requirements

> **Package:** `@ol-grid/master-detail`  
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

Master/detail displays expandable **master rows** that reveal embedded **detail panels** — typically a nested grid, form, or custom component showing related records (order → line items, user → permissions, invoice → payments). AG Grid Enterprise includes master/detail as a licensed feature with `masterDetail: true`, `detailCellRenderer`, and optional nested grid options.

ol-grid delivers **MIT-licensed master/detail** as `@ol-grid/master-detail` in Tier 3. Unlike row grouping or tree data, master/detail is a **presentation pattern** affecting row height, full-width rows, and nested grid lifecycle — not a data-transform pipeline stage. It integrates with dynamic row heights (T2), full-width row rendering (T3), and framework adapters' component mounting.

**Scope boundary:** Master/detail covers expand/collapse of detail rows, detail renderer contract, nested grid embedding, and lazy detail loading. Tree data hierarchies are [tree-data.md](./tree-data.md). Row grouping is [row-grouping.md](./row-grouping.md).

---

## 2. Problem Statement & MIT Positioning

### 2.1 User problem

Line-of-business grids constantly need drill-down without navigating away — orders with items, accounts with transactions, configs with audit logs. Building custom expand rows on TanStack Table requires manual row height management, nested component lifecycle, and keyboard/a11y handling.

### 2.2 ol-grid positioning

| Aspect | AG Grid Enterprise | ol-grid |
|--------|-------------------|---------|
| `masterDetail: true` | Enterprise | MIT `@ol-grid/master-detail` |
| Nested grid as detail | Enterprise `detailGridOptions` | Same pattern |
| Framework detail components | Supported | React/Vue/Angular/Svelte via adapter |
| Full-width detail row | Enterprise | T3 full-width row support |
| License | Commercial | **MIT** |

### 2.3 Design principles

| ID | Principle |
|----|-----------|
| MD-P-01 | Master/detail is a plugin module; core exposes full-width row hooks |
| MD-P-02 | Detail height: fixed default or dynamic via `detailRowAutoHeight` |
| MD-P-03 | Nested grids are separate `GridEngine` instances with isolated state |
| MD-P-04 | Only one detail row expanded per master optional (`keepDetailRows`) |
| MD-P-05 | Detail expand state serializable independently from tree/group expansion |

---

## 3. AG Grid Enterprise Parity Analysis

Reference: [AG Grid Master / Detail](https://www.ag-grid.com/javascript-data-grid/master-detail/) (Enterprise).

| AG Grid Enterprise Feature | ol-grid Target | Priority | Notes |
|----------------------------|----------------|----------|-------|
| `masterDetail: true` | REQ-MD-01 | Must | Master toggle |
| `isRowMaster` callback | REQ-MD-02 | Must | Which rows expandable |
| `detailCellRenderer` | REQ-MD-03 | Must | Custom detail UI |
| `detailGridOptions` nested grid | REQ-MD-04 | Must | Child grid |
| Expand icon on master row | REQ-MD-05 | Must | Default master cell renderer |
| `detailRowHeight` fixed | REQ-MD-06 | Must | Default 300px |
| `detailRowAutoHeight` | REQ-MD-07 | Should | Measure detail content |
| `keepDetailRows` / `keepDetailRowsCount` | REQ-MD-08 | Should | Cache DOM when collapsed |
| `embedFullWidthRows` | REQ-MD-09 | Must | Detail spans all columns |
| Lazy detail fetch on expand | REQ-MD-10 | Should | Async detail data |
| `template` string detail renderer | REQ-MD-11 | Could | Simple HTML template v1.1 |
| Keyboard expand master row | REQ-MD-12 | Must | Enter/Space on master |
| `onFirstDataRendered` in detail grid | REQ-MD-13 | Must | Nested grid lifecycle |
| SSRM master/detail | REQ-MD-14 | Should | Master from server class; detail client fetch |
| `detailCellRendererParams` | REQ-MD-15 | Must | Pass data to detail |

**Explicit non-parity (v1):** Detail grid sharing parent column state; master/detail with pivot mode.

---

## 4. User Stories

| ID | Story | Acceptance hint |
|----|-------|-----------------|
| US-MD-01 | As a developer, I enable master/detail and show line items grid when order row expands | Nested grid renders with correct data |
| US-MD-02 | As a developer, I use `isRowMaster` so only orders with items > 0 expand | Non-master rows have no chevron |
| US-MD-03 | As a developer, I provide React detail component showing a chart | Framework adapter mounts component |
| US-MD-04 | As an analyst, I click expand chevron to reveal order details | Detail row animates open (optional) |
| US-MD-05 | As a developer, I set `detailRowHeight: 400` for fixed detail panel | Detail area 400px tall |
| US-MD-06 | As a developer, I fetch detail data from API on first expand | Loading spinner in detail |
| US-MD-07 | As a developer migrating from AG Grid, I reuse `detailGridOptions` shape | Minimal API changes |
| US-MD-08 | As an analyst using keyboard, I press Enter on master row to toggle detail | Focus moves into detail grid |

---

## 5. Functional Requirements

### 5.1 Master/detail activation

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-MD-01 | `masterDetail: true` enables expand affordance on master rows | Must |
| REQ-MD-16 | Module `@ol-grid/master-detail` registers with `ModuleRegistry` | Must |
| REQ-MD-17 | Without module registered, `masterDetail` option logs meaningful error | Must |

### 5.2 Master row identification

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-MD-02 | `isRowMaster: (data) => boolean` determines expandable rows | Must |
| REQ-MD-18 | Default: all rows master if callback omitted | Should |
| REQ-MD-19 | Master rows show expand/collapse icon in designated column (auto or first column) | Must |
| REQ-MD-20 | `masterRowField` optional column for custom master indicator | Should |

### 5.3 Detail row rendering

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-MD-03 | `detailCellRenderer` renders detail content (component or functional renderer) | Must |
| REQ-MD-04 | `detailGridOptions` creates nested `GridEngine` instance in detail cell | Must |
| REQ-MD-09 | Detail row is **full-width row** spanning viewport width below master | Must |
| REQ-MD-06 | `detailRowHeight: number` sets fixed detail viewport height | Must |
| REQ-MD-07 | `detailRowAutoHeight: true` measures detail after render and updates row height | Should |
| REQ-MD-21 | Detail renderer receives `DetailCellRendererParams` with master data, api, node | Must |
| REQ-MD-22 | Nested grid receives `getDetailRowData` or master row data as `rowData` | Must |

### 5.4 Expand / collapse behavior

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-MD-23 | Click chevron or double-click master row toggles detail | Must |
| REQ-MD-24 | Expanded master inserts detail row immediately below in display list | Must |
| REQ-MD-25 | Collapse removes detail from display list (unless `keepDetailRows`) | Must |
| REQ-MD-08 | `keepDetailRows: true` preserves detail DOM/components when collapsed | Should |
| REQ-MD-26 | `keepDetailRowsCount` limits cached detail instances (LRU) | Should |
| REQ-MD-27 | `api.expandDetailRow(node)` / `collapseDetailRow(node)` imperative | Must |
| REQ-MD-28 | Emit `rowExpanded` / `detailGridReady` events | Must |

### 5.5 Nested grid lifecycle

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-MD-29 | Nested grid created on first expand; `onGridReady` fires on detail grid | Must |
| REQ-MD-30 | Nested grid destroyed on master row remove unless kept | Must |
| REQ-MD-31 | Nested grid does not inherit parent sort/filter unless configured | Must |
| REQ-MD-32 | `getDetailRowData(params, callback)` async data load pattern | Should |
| REQ-MD-33 | Detail grid `context` inherits parent `context` by default | Should |
| REQ-MD-34 | Multiple expanded masters allowed by default | Must |
| REQ-MD-35 | Option `singleDetailExpand: true` collapses others on expand | Should |

### 5.6 Virtualization, a11y, async & state

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-MD-36 | Detail rows in display list; virtualizer accounts for dynamic detail heights | Must |
| REQ-MD-39 | `embedFullWidthRows: true` default when module active | Must |
| REQ-MD-12 | Enter/Space toggles detail; `aria-expanded` on master | Must |
| REQ-MD-40 | Focus moves into detail on expand; Escape returns to master | Must/Should |
| REQ-MD-10 | Async detail fetch on expand with loading/error states | Should |
| REQ-MD-14 | SSRM masters from server; detail loads client-side on expand | Should |
| REQ-MD-45 | Serializable `DetailExpansionState` with controlled mode support | Should |

---

## 6. API Design

### 6.1 GridOptions

```typescript
interface MasterDetailGridOptions<TData = unknown> {
  masterDetail?: boolean;
  isRowMaster?: (dataItem: TData) => boolean;
  detailCellRenderer?: string | DetailCellRendererDef;
  detailCellRendererParams?: Record<string, unknown> | ((params: DetailCellRendererParams) => Record<string, unknown>);
  detailGridOptions?: GridOptions<TDetailData>;  // nested grid
  detailRowHeight?: number;
  detailRowAutoHeight?: boolean;
  keepDetailRows?: boolean;
  keepDetailRowsCount?: number;
  embedFullWidthRows?: boolean;
  singleDetailExpand?: boolean;

  getDetailRowData?: (
    params: GetDetailRowDataParams<TData>,
  ) => void | Promise<void>;

  onRowExpanded?(event: RowExpandedEvent): void;
  onDetailGridReady?(event: DetailGridReadyEvent): void;
}

interface DetailCellRendererParams<TData = unknown> {
  data: TData;
  node: RowNode<TData>;
  api: GridApi;
  context: unknown;
  eDetailGridHost: HTMLElement;   // mount point for nested grid
}

interface GetDetailRowDataParams<TData = unknown> {
  data: TData;
  node: RowNode<TData>;
  successCallback: (rowData: unknown[]) => void;
  failCallback: () => void;
}
```

### 6.2 GridApi extensions

```typescript
declare module '@ol-grid/core' {
  interface GridApi {
    expandDetailRow(rowNode: RowNode): void;
    collapseDetailRow(rowNode: RowNode): void;
    isDetailRowExpanded(rowNode: RowNode): boolean;
    getDetailGridInfo(rowNode: RowNode): DetailGridInfo | undefined;
    forEachDetailGridInfo(callback: (info: DetailGridInfo) => void): void;
  }
}

interface DetailGridInfo {
  id: string;
  api: GridApi;
  rowNode: RowNode;
}
```

### 6.3 RowNode extensions

```typescript
interface RowNode<TData = unknown> {
  master?: boolean;
  detail?: boolean;              // true for full-width detail row node
  detailExpanded?: boolean;
  detailGridInfo?: DetailGridInfo;
}
```

Master/detail inserts synthetic detail rows into the flattened display list immediately below expanded masters. Register via `ModuleRegistry.register(MasterDetailModule)`.

---

## 7. Architecture Integration

### 7.1 Package: `@ol-grid/master-detail`

| Component | Responsibility |
|-----------|----------------|
| `MasterDetailController` | Expand/collapse, API methods |
| `MasterDetailStore` slice | Expanded master IDs, cached detail heights |
| `DetailRowFactory` | Synthetic detail RowNode creation |
| `NestedGridHost` | Create/destroy child GridEngine |
| `MasterCellRenderer` | Default chevron in master column |

### 7.2 Full-width row support (core T3)

Core renderer must support `fullWidthCellRenderer` rows that bypass column cell layout:

```typescript
interface RenderRow {
  type: 'fullWidth';
  node: RowNode;
  rowIndex: number;
  height: number;
  rendererKey: 'detail' | string;
}
```

Master/detail module registers default full-width detail renderer.

### 7.3 Dynamic row height

When `detailRowAutoHeight: true`:

1. Detail renders at estimated height
2. Renderer measures `scrollHeight` of detail content
3. `reportRowHeight(detailRowIndex, height)` updates virtualizer
4. Parent grid scroll position preserved

Depends on T2 dynamic row height measurement cache.

### 7.4 Nested GridEngine

```typescript
function createDetailGrid(
  host: HTMLElement,
  masterContext: GridContext,
  options: GridOptions,
): GridEngine {
  // Inherit theme tokens, locale, context
  // Independent store instance
  // Parent api.getDetailGridInfo(node) returns child api
}
```

Child grid MUST NOT share parent's RowModel pipeline.

Child grid is an independent `GridEngine` (theme/locale/context inherited; store isolated). Framework adapters mount detail renderers and nested `<OlGrid>` via each adapter's component host.

---

## 8. Tier 3 Delivery Plan

| Phase | Deliverable | Exit criterion |
|-------|-------------|----------------|
| T3b | Core full-width row rendering | Unit tests for display list |
| T3b | Fixed height master/detail with nested grid | Order → line items demo |
| T3b | `isRowMaster`, expand/collapse, events | React example |
| T3c | `detailRowAutoHeight` | Detail content drives height |
| T3c | `keepDetailRows` cache | Re-expand without remount |
| T3c | Async `getDetailRowData` | Loading state demo |
| T3c | Keyboard a11y + axe clean | WCAG for expand pattern |
| T3c | Vue/Angular nested grid examples | Adapter parity |

**Bundle impact:** `@ol-grid/master-detail` ≤ 8 KB gzip (excludes nested grid instance).

---

## 9. Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-MD-01 | Expand detail with nested 100-row grid | ≤ 100 ms to interactive |
| NFR-MD-02 | Collapse detail | ≤ 16 ms display list update |
| NFR-MD-03 | Max 10 concurrent expanded details without memory leak | Integration test |
| NFR-MD-04 | Nested grid scroll independent of parent scroll | Must |
| NFR-MD-05 | Module zero deps beyond core + dom-renderer interfaces | Must |
| NFR-MD-06 | Detail grid destroy on parent destroy | Must |

---

## 10. Competitive Analysis

### 10.1 vs AG Grid Enterprise

| Dimension | AG Grid | ol-grid |
|-----------|---------|---------|
| License | Enterprise | MIT |
| Nested grid API | `detailGridOptions` mature | Match |
| Detail height auto | Supported | T3c |
| SSRM + master/detail | Supported | T3c Should |
| Ecosystem docs | Extensive | TBD |

AG Grid master/detail is production-proven. ol-grid targets API compatibility for migrators.

Tabulator requires custom expand logic via `rowFormatter`; MUI Data Grid Pro offers master/detail under paid React coupling. TanStack Table supports expanded rows but no nested grid lifecycle. ol-grid provides AG Grid-aligned MIT master/detail with native nested `GridEngine`.

---

## 11. Acceptance Criteria

### 11.1 Functional

- [ ] Master row with chevron expands detail row below
- [ ] Nested grid displays correct `rowData` from master
- [ ] `isRowMaster` hides chevron on non-master rows
- [ ] `detailRowHeight` sets fixed detail viewport
- [ ] `detailRowAutoHeight` adjusts to content
- [ ] `expandDetailRow` / `collapseDetailRow` API work
- [ ] `getDetailGridInfo` returns child `GridApi`
- [ ] `keepDetailRows: true` preserves detail on collapse
- [ ] Async `getDetailRowData` shows loading then data
- [ ] Multiple masters expanded simultaneously
- [ ] Parent grid destroy destroys all detail grids
- [ ] Events `rowExpanded`, `detailGridReady` fire

### 11.2 Non-functional

- [ ] Expand with nested grid ≤ 100 ms
- [ ] No memory leak after 100 expand/collapse cycles
- [ ] axe-core clean on master/detail demo
- [ ] Keyboard Enter toggles detail; focus management works

### 11.3 Migration

- [ ] AG Grid master/detail example reproducible with migration notes

---

## 12. Dependencies & Prerequisites

| Dependency | Reason |
|------------|--------|
| `@ol-grid/core` T1 | RowNode, Virtualizer, EventBus |
| T2 dynamic row height | `detailRowAutoHeight` |
| T3 full-width rows | Detail spans columns |
| `@ol-grid/dom-renderer` | Full-width cell rendering |
| Framework adapters T1+ | Nested component mounting |
| `@ol-grid/react` etc. | Nested grid in detail |

---

## 13. Open Questions

| # | Question | Options | Deadline |
|---|----------|---------|----------|
| OQ-MD-1 | Default expand column placement | First column / auto column / dedicated | T3b |
| OQ-MD-2 | Animate detail expand/collapse | CSS transition / instant | T3b |
| OQ-MD-3 | Share column defs from master to detail | Manual / helper API | T3c |
| OQ-MD-4 | Canvas renderer master/detail | DOM only v1 / overlay | T3 planning |

---

## 14. References

- [AG Grid Master / Detail](https://www.ag-grid.com/javascript-data-grid/master-detail/)
- [AG Grid Detail Grid](https://www.ag-grid.com/javascript-data-grid/master-detail-grids/)
- [AG Grid Detail Height](https://www.ag-grid.com/javascript-data-grid/master-detail-height/)
- [Tabulator Formatting Rows](http://tabulator.info/docs/6.3/format#row)
- [ol-grid REQUIREMENTS.md T3-UI-04](../REQUIREMENTS.md)
- [ol-grid ARCHITECTURE.md §3.4](../ARCHITECTURE.md)
- [tree-data.md](./tree-data.md)

---

*This document is authoritative for master/detail scope. Changes require explicit amendment.*

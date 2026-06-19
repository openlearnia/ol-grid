# Aggregation — Feature Requirements

> **Package:** `@ol-grid/grouping` (aggregation submodule) / `@ol-grid/aggregation` (optional split)  
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

Aggregation computes summary values (sum, average, count, min, max, etc.) for grouped rows, pivot columns, and grand totals. AG Grid Enterprise gates aggregation behind commercial licensing and integrates it deeply with row grouping and pivot mode. ol-grid provides **MIT-licensed aggregation** as part of the Tier 3 data-transform stack, colocated with `@ol-grid/grouping` initially with optional future split to `@ol-grid/aggregation` if bundle size warrants.

Aggregation runs as a **row-model stage** after grouping (CSRM) or is **server-provided** (SSRM). Results surface on `RowNode.aggData` and render in group rows, footers, and pivot cells via `valueFormatter` and dedicated agg cell renderers.

**Related specs:** [row-grouping.md](./row-grouping.md), [pivoting.md](./pivoting.md), [tree-data.md](./tree-data.md).

---

## 2. Problem Statement & MIT Positioning

### 2.1 User problem

Grouped grids without aggregates force users to mentally sum values or export to Excel. Enterprise dashboards expect inline subtotals and grand totals. AG Grid Enterprise aggregation is powerful but license-gated.

### 2.2 ol-grid positioning

| Aspect | AG Grid Enterprise | ol-grid |
|--------|-------------------|---------|
| Built-in agg funcs | sum, min, max, avg, count, first, last, + custom | **Same set, MIT** |
| `aggFunc` on column | Enterprise | Tier 3 |
| Group footers | Enterprise | Tier 3 |
| SSRM aggregation | Server-side with lazy groups | Tier 3 MIT |
| Pivot aggregation | Enterprise pivot mode | [pivoting.md](./pivoting.md) |

### 2.3 Design principles

| ID | Principle |
|----|-----------|
| AG-P-01 | Aggregation is pure function over leaf values; no DOM in agg engine |
| AG-P-02 | Custom agg funcs receive typed `IAggFuncParams` matching AG Grid shape |
| AG-P-03 | SSRM: client displays server-provided `aggData`; optional client re-agg for CSRM only |
| AG-P-04 | Grand total row is optional and independent of group footers |
| AG-P-05 | Agg values respect `valueGetter` pipeline for input; `valueFormatter` for display |

---

## 3. AG Grid Enterprise Parity Analysis

Reference: [AG Grid Aggregation](https://www.ag-grid.com/javascript-data-grid/aggregation/) (Enterprise).

| AG Grid Enterprise Feature | ol-grid Target | Priority | Notes |
|----------------------------|----------------|----------|-------|
| Column `aggFunc: 'sum' \| 'avg' \| ...` | REQ-AG-01 | Must | String shorthand + function |
| Built-in agg functions registry | REQ-AG-02 | Must | Extensible |
| Custom agg functions | REQ-AG-03 | Should | `(params) => any` |
| `allowedAggFuncs` per column | REQ-AG-04 | Should | Restrict UI picker |
| `defaultAggFunc` grid option | REQ-AG-05 | Should | Fallback when grouping |
| Group row shows agg in value columns | REQ-AG-06 | Must | Default agg cell renderer |
| `groupIncludeFooter` footer rows | REQ-AG-07 | Should | Per-group footer |
| `groupIncludeTotalFooter` grand total | REQ-AG-08 | Should | Pinned bottom row |
| `aggFunc` change via API | REQ-AG-09 | Must | `setColumnAggFunc` |
| Pivot value aggregation | REQ-AG-10 | Must | With pivot module |
| `suppressAggFuncInHeader` | REQ-AG-11 | Should | Hide agg label in header |
| `aggFunc` in SSRM from server | REQ-AG-12 | Must | Trust server aggData |
| `alwaysAggregateAtRoot` | REQ-AG-13 | Should | Root-level agg display |
| Weighted average / custom statistical | REQ-AG-14 | Could | v1.1+ |

**Explicit non-parity (v1):**

- AG Grid formula-based aggregation
- Integrated chart aggregation sync

---

## 4. User Stories

| ID | Story | Acceptance hint |
|----|-------|-----------------|
| US-AG-01 | As a developer, I set `aggFunc: 'sum'` on `gold` column when grouping athletes by country | Group rows show sum of gold medals |
| US-AG-02 | As a developer, I register a custom `weightedAvg` agg func for portfolio grids | Custom func used in group rows |
| US-AG-03 | As an analyst, I change aggregation from Sum to Average via column menu | Values update without reload |
| US-AG-04 | As an analyst, I see a grand total row at the bottom summing all visible rows | Total row pinned; respects filter |
| US-AG-05 | As a developer using SSRM, I display server-computed aggregates in group rows | Client renders `aggData` from response |
| US-AG-06 | As a developer, I format aggregate cells with `valueFormatter` showing currency | Formatted "$1,234.56" in group row |
| US-AG-07 | As a platform engineer, I disable aggregation on non-numeric columns automatically | Only numeric columns get default sum |
| US-AG-08 | As a developer, I use pivot mode with `aggFunc: 'sum'` on value columns | Pivot cells show sums per column group |

---

## 5. Functional Requirements

### 5.1 Built-in aggregation functions

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-AG-01 | Support `aggFunc` on `ColumnDef` as string key or `AggFunc` function | Must |
| REQ-AG-02 | Built-ins: `sum`, `min`, `max`, `avg`, `count`, `first`, `last` | Must |
| REQ-AG-15 | `count` counts non-null leaf values; `count` all includes nulls as optional variant | Must |
| REQ-AG-16 | `sum`/`avg` skip non-numeric values; `avg` returns null if zero numeric values | Must |
| REQ-AG-17 | `first`/`last` respect current sort order of leaf rows | Must |
| REQ-AG-03 | Register custom agg via `aggFuncs: { name: fn }` on grid options | Should |
| REQ-AG-04 | `allowedAggFuncs` restricts selectable funcs in UI | Should |
| REQ-AG-05 | `defaultAggFunc` applied when column grouped without explicit `aggFunc` | Should |

### 5.2 Aggregation computation (CSRM)

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-AG-06 | For each group node, compute agg per column with `aggFunc` into `node.aggData[colId]` | Must |
| REQ-AG-18 | Leaf rows expose raw values; group rows expose `aggData` for agg columns | Must |
| REQ-AG-19 | Recompute agg on: data change, filter change, sort change (for first/last), group expand irrelevant | Must |
| REQ-AG-20 | Incremental update: row transaction updates only affected group branches | Should |
| REQ-AG-21 | Input values extracted via `valueGetter` if defined, else `field` | Must |
| REQ-AG-22 | Empty groups return null agg unless `count` returns 0 | Must |

### 5.3 Display & rendering

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-AG-23 | Default group cell renderer shows agg value in non-group columns when `node.group` | Must |
| REQ-AG-24 | `valueFormatter` receives `value` from agg for group rows | Must |
| REQ-AG-25 | Optional `aggCellRenderer` override per column | Should |
| REQ-AG-11 | `suppressAggFuncInHeader: true` hides "(sum)" suffix in column header | Should |
| REQ-AG-26 | Header shows agg func name when grouping active: `"Gold (sum)"` | Must (unless suppressed) |

### 5.4 Footer rows

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-AG-07 | `groupIncludeFooter: true` inserts footer row after each group's children | Should |
| REQ-AG-08 | `groupIncludeTotalFooter: true` adds grand total row at grid bottom | Should |
| REQ-AG-27 | Footer rows are `RowNode` with `footer: true` flag | Should |
| REQ-AG-28 | Footer agg uses same func as column unless `totalAggFunc` override | Should |
| REQ-AG-29 | Grand total respects active filter (filtered-aware) | Must |

### 5.5 API & events

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-AG-09 | `api.setColumnAggFunc(colKey, aggFunc)` updates func and recomputes | Must |
| REQ-AG-30 | `api.getColumnAggFunc(colKey)` returns current func | Must |
| REQ-AG-31 | Emit `aggregationChanged` when agg values recompute | Should |
| REQ-AG-32 | `getValue(node, col)` returns agg value for group rows | Must |

### 5.6 SSRM & pivot

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-AG-12 | SSRM: render server `aggData` on group rows without client recompute | Must |
| REQ-AG-10 | Pivot: aggregate per pivot column intersection (see pivoting spec) | Must |
| REQ-AG-33 | CSRM + pivot: agg runs after pivot column generation | Must |
| REQ-AG-34 | Mixed: warn if SSRM datasource returns leaves without aggData on group rows | Should |

### 5.7 Tree data

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-AG-35 | Tree data mode: agg optional on parent nodes over descendant leaves | Should |
| REQ-AG-36 | Tree agg does not double-count when parent also has leaf data | Must |

---

## 6. API Design

### 6.1 Types

```typescript
type AggFunc<TData = unknown> =
  | 'sum' | 'min' | 'max' | 'avg' | 'count' | 'first' | 'last'
  | string
  | ((params: IAggFuncParams<TData>) => unknown);

interface IAggFuncParams<TData = unknown> {
  values: unknown[];              // leaf values for this group + column
  column: ColumnDef<TData>;
  colDef: ColumnDef<TData>;
  columnApi: ColumnApi;
  api: GridApi;
  data: TData[];                  // leaf row data objects
  rowNode: RowNode<TData>;        // group node
  context: unknown;
}

interface ColumnDef<TData = unknown> {
  aggFunc?: AggFunc<TData>;
  allowedAggFuncs?: string[];
  aggCellRenderer?: string | CellRendererDef;
  totalAggFunc?: AggFunc<TData>;  // grand total override
}
```

### 6.2 GridOptions

```typescript
interface AggregationGridOptions<TData = unknown> {
  aggFuncs?: Record<string, AggFunc<TData>>;
  defaultAggFunc?: string;
  suppressAggFuncInHeader?: boolean;
  groupIncludeFooter?: boolean;
  groupIncludeTotalFooter?: boolean;
  alwaysAggregateAtRoot?: boolean;
  grandTotalRow?: 'top' | 'bottom' | undefined;

  onAggregationChanged?(event: AggregationChangedEvent): void;
}
```

### 6.3 GridApi extensions

```typescript
declare module '@ol-grid/core' {
  interface GridApi {
    setColumnAggFunc(colKey: string, aggFunc: AggFunc | null): void;
    getColumnAggFunc(colKey: string): AggFunc | null;
    getAggregatedValue(node: RowNode, colKey: string): unknown;
  }
}
```

### 6.4 RowNode

```typescript
interface RowNode<TData = unknown> {
  aggData?: Record<string, unknown>;  // colId → agg value
  footer?: boolean;
}
```

### 6.5 Module registration

Aggregation ships with `@ol-grid/grouping` by default:

```typescript
import { GroupingModule } from '@ol-grid/grouping';
// GroupingModule includes aggregation stage

// Optional future split:
import { AggregationModule } from '@ol-grid/aggregation';
ModuleRegistry.register(AggregationModule);
```

---

## 7. Architecture Integration

### 7.1 Pipeline placement

**CSRM (grouped):**
```
sortedRowModel → groupedRowModel → aggregatedRowModel → displayRowModel
```

**CSRM (ungrouped withState grand total only):**
```
sortedRowModel → grandTotalRowModel → displayRowModel
```

**Pivot:**
```
pivotedRowModel → aggregatedRowModel → displayRowModel
```

### 7.2 Aggregation engine

Pure functions in `@ol-grid/grouping/aggregation/`:

```typescript
function computeGroupAggregates(
  groupNode: RowNode,
  columns: ColumnDef[],
  aggFuncRegistry: AggFuncRegistry,
  valueExtractor: ValueExtractor,
): Record<string, unknown>;
```

- Post-order tree traversal: children agg computed before parent if `alwaysAggregateAtRoot`
- Memoization keyed by `(groupId, colId, dataVersion, filterVersion, sortVersion)`

### 7.3 Incremental updates

On `applyTransaction({ update: [row] })`:

1. Locate leaf `RowNode`
2. Walk parent chain to root
3. Recompute agg for affected columns only on touched groups
4. Emit single `aggregationChanged`

### 7.4 Renderer

Group cell value resolution:

```typescript
function getCellValue(node: RowNode, col: ColumnDef): unknown.known {
  if (node.group && col.aggFunc) return node.aggData?.[col.colId];
  return extractLeafValue(node, col);
}
```

---

## 8. Tier 3 Delivery Plan

| Phase | Deliverable | Exit criterion |
|-------|-------------|----------------|
| T3a | Built-in agg funcs + CSRM group agg | Sum/avg demo on Olympic data |
| T3a | `setColumnAggFunc` API | Unit tests all built-ins |
| T3b | Group footers + grand total row | Visual regression baseline |
| T3b | Custom agg func registration | Demo: weighted average |
| T3c | SSRM server aggData display | Mock API returns agg |
| T3c | Pivot agg integration | Cross-ref pivoting demo |
| T3c | Incremental transaction agg | Update single row → subtotal updates |

**Bundle:** aggregation logic ≤ 8 KB gzip (may ship inside grouping package).

---

## 9. Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-AG-01 | Full re-agg 50k leaves, 2 group levels, 5 agg columns | ≤ 200 ms |
| NFR-AG-02 | Incremental single-row update | ≤ 8 ms |
| NFR-AG-03 | Numeric stability: sum uses Kahan or decimal lib optional | Document |
| NFR-AG-04 | Zero runtime deps in agg engine | Must |
| NFR-AG-05 | Agg cells expose `aria-label` with func name for SR | Should |

---

## 10. Competitive Analysis

### 10.1 vs AG Grid Enterprise

| Dimension | AG Grid | ol-grid |
|-----------|---------|---------|
| License | Enterprise | MIT |
| Agg func set | Extensive + enterprise extras | Core 7 + custom v1 |
| SSRM agg | Mature | T3 target |
| Column menu agg picker | Built-in | T3 via column menu plugin |
| Performance | Optimized C++ wasm in recent versions? (mostly JS) | JS; worker optional |

AG Grid leads on edge cases (pivot + SSRM + charts). ol-grid wins on license and modular bundle.

### 10.2 vs Tabulator

| Dimension | Tabulator | ol-grid |
|-----------|-----------|---------|
| Bottom calc | `bottomCalc: "sum"` | `groupIncludeTotalFooter` + `aggFunc` |
| Group header calc | `groupHeader` callbacks | `aggData` on group RowNode |
| API | `bottomCalcFormatter` | `valueFormatter` unified pipeline |
| Custom calc | Mutators + custom functions | `IAggFuncParams` AG Grid-aligned |

Tabulator's calc API is simpler for flat grids; ol-grid aligns with AG Grid enterprise patterns for migration.

### 10.3 vs TanStack Table

TanStack provides `aggregationFn` in column defs but no built-in group row rendering or footer rows. ol-grid provides end-to-end UX.

---

## 11. Acceptance Criteria

### 11.1 Functional

- [ ] `sum`, `avg`, `min`, `max`, `count`, `first`, `last` produce correct results on test fixtures
- [ ] Group row displays agg in columns with `aggFunc`
- [ ] Changing `aggFunc` via API recomputes and re-renders
- [ ] Grand total row sums filtered visible rows only
- [ ] Custom agg func receives correct leaf `values` array
- [ ] SSRM group row displays server `aggData`
- [ ] Pivot + sum produces correct column intersections
- [ ] `valueFormatter` applied to agg display values
- [ ] Transaction update recomputes affected group subtotals

### 11.2 Non-functional

- [ ] 50k row agg benchmark ≤ 200 ms
- [ ] No agg code in bundle when grouping module not registered

### 11.3 Migration

- [ ] AG Grid "Aggregation" docs example runs with documented API mapping

---

## 12. Dependencies & Prerequisites

| Dependency | Reason |
|------------|--------|
| `@ol-grid/grouping` | Group nodes for CSRM agg |
| `@ol-grid/core` RowNode | `aggData` field |
| [pivoting.md](./pivoting.md) | Pivot agg intersection |
| SSRM | Server aggData path |
| Column menu (T3) | Agg func picker UI |

---

## 13. Open Questions

| # | Question | Options | Deadline |
|---|----------|---------|----------|
| OQ-AG-1 | Separate `@ol-grid/aggregation` package? | Monolith / split | T3a |
| OQ-AG-2 | BigInt / Decimal support in sum/avg | Native Number / opt-in decimal.js | T3b |
| OQ-AG-3 | `median`, `stdDev` built-ins | v1 / v1.1 | T3 planning |
| OQ-AG-4 | Agg func picker in column menu vs side panel | Column menu first | T3b |

---

## 14. References

- [AG Grid Aggregation](https://www.ag-grid.com/javascript-data-grid/aggregation/)
- [AG Grid Custom Aggregation Functions](https://www.ag-grid.com/javascript-data-grid/aggregation-custom-functions/)
- [AG Grid Total Rows](https://www.ag-grid.com/javascript-data-grid/aggregation-total-rows/)
- [Tabulator Column Calculations](http://tabulator.info/docs/6.3/column-calcs)
- [ol-grid REQUIREMENTS.md T3-GR-03](../REQUIREMENTS.md)
- [row-grouping.md](./row-grouping.md)
- [pivoting.md](./pivoting.md)

---

*This document is authoritative for aggregation scope. Changes require explicit amendment.*

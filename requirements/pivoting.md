# Pivot Mode — Feature Requirements

> **Package:** `@ol-grid/grouping` (pivot submodule)  
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

Pivot mode transforms long-format row data into a cross-tabulation: unique values from one or more **pivot columns** become dynamic column headers, while **row group columns** define row hierarchy and **value columns** supply aggregated metrics at each cell intersection. AG Grid Enterprise treats pivot mode as a premium feature tightly coupled with grouping, aggregation, and SSRM.

ol-grid delivers **MIT-licensed pivot mode** in Tier 3 via `@ol-grid/grouping`, sharing the row-model pipeline with [row-grouping.md](./row-grouping.md) and [aggregation.md](./aggregation.md). Pivot implies dynamic column generation — the column model must support runtime column addition/removal with stable `colId` keys and integration with column virtualization (T3-SC-01).

**Scope:** Client-side pivot (CSRM) is Phase T3b; server-side pivot metadata (SSRM) is Phase T3c. Integrated charting from pivot selection is out of scope v1.

---

## 2. Problem Statement & MIT Positioning

### 2.1 User problem

Financial, sales, and operations teams routinely need spreadsheet-style pivot tables inside web apps. Without native pivot:

- Teams export CSV → Excel → re-import (broken workflow)
- Teams pay AG Grid Enterprise or build custom matrix rendering
- Backend pre-pivots data, losing interactive exploration

### 2.2 ol-grid positioning

| Aspect | AG Grid Enterprise | ol-grid |
|--------|-------------------|---------|
| Pivot mode toggle | Enterprise | `pivotMode: true` MIT |
| Dynamic columns | Enterprise | ColumnModel runtime API |
| Pivot + row group + agg | Enterprise combo | Tier 3 pipeline |
| SSRM pivot | Enterprise | T3 datasource contract |
| License | Commercial | **MIT** |

### 2.3 Design principles

| ID | Principle |
|----|-----------|
| PV-P-01 | Pivot is opt-in via `pivotMode: true`; zero cost when false |
| PV-P-02 | Pivot column keys are deterministic strings: `pivot_${field}_${value}` |
| PV-P-03 | Column virtualization MUST work with hundreds of pivot columns |
| PV-P-04 | Pivot UI (column drop zones) reuses row group panel infrastructure |
| PV-P-05 | API vocabulary matches AG Grid: `pivot`, `rowGroup`, `aggFunc`, `pivotMode` |

---

## 3. AG Grid Enterprise Parity Analysis

Reference: [AG Grid Pivoting](https://www.ag-grid.com/javascript-data-grid/pivoting/) (Enterprise).

| AG Grid Enterprise Feature | ol-grid Target | Priority | Notes |
|----------------------------|----------------|----------|-------|
| `pivotMode: true` | REQ-PV-01 | Must | Master toggle |
| `pivot: true` on column | REQ-PV-02 | Must | Marks pivot dimension |
| Dynamic pivot columns from unique values | REQ-PV-03 | Must | CSRM scans data |
| Multiple pivot columns (Cartesian headers) | REQ-PV-04 | Should | Nested column groups |
| Value columns with `aggFunc` | REQ-PV-05 | Must | Cross-ref aggregation |
| Row groups + pivot simultaneously | REQ-PV-06 | Must | Primary use case |
| Pivot column panel (drag zone) | REQ-PV-07 | Should | Side bar |
| `processPivotResultColDef` callback | REQ-PV-08 | Should | Customize generated cols |
| `processPivotResultColGroupDef` | REQ-PV-09 | Should | Multi-level headers |
| `pivotDefaultExpanded` for column groups | REQ-PV-10 | Should | Expand pivot col groups |
| SSRM pivot (server provides pivot result) | REQ-PV-11 | Must | T3c |
| `removePivotHeaderRowWhenSingleValueColumn` | REQ-PV-12 | Should | Flatten single pivot |
| Quick pivot from context menu | REQ-PV-13 | Could | v1.1 |
| `pivotRowTotals` / column totals | REQ-PV-14 | Should | Total columns |
| Pivot with secondary columns | REQ-PV-15 | Should | `pivotKeys
Column` pattern |

**Explicit non-parity (v1):**

- AG Grid integrated charts from pivot
- Excel export of pivot layout with full style parity (basic export T3)

---

## 4. User Stories

| ID | Story | Acceptance hint |
|----|-------|-----------------|
| US-PV-01 | As a developer, I enable `pivotMode: true` and mark `year` as pivot column | Columns appear per distinct year |
| US-PV-02 | As a developer, I group by `country` and pivot `year` with `gold` summed | Matrix: rows=countries, cols=years, cells=sum(gold) |
| US-PV-03 | As an analyst, I drag "Sport" to pivot zone in side panel | New pivot columns generated |
| US-PV-04 | As a developer, I use `processPivotResultColDef` to set width on generated columns | Callback receives proposed colDef |
| US-PV-05 | As a developer on SSRM, I receive pivot column definitions from server | Client renders server column set |
| US-PV-06 | As an analyst, I scroll horizontally across 200 pivot columns smoothly | Column virtualization active |
| US-PV-07 | As a developer, I toggle pivot mode off and restore original column defs | Column state restored |
| US-PV-08 | As an analyst, I see row totals column summing across pivot columns | Total column on right |

---

## 5. Functional Requirements

### 5.1 Pivot mode activation

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-PV-01 | `pivotMode: boolean` toggles pivot processing | Must |
| REQ-PV-16 | Entering pivot mode captures "primary" column defs for restore on exit | Must |
| REQ-PV-17 | Exiting pivot mode removes generated columns and restores primary defs | Must |
| REQ-PV-18 | `api.setPivotMode(enabled: boolean)` imperative toggle | Must |
| REQ-PV-19 | Emit `pivotModeChanged` event | Must |

### 5.2 Column roles in pivot mode

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-PV-02 | `columnDef.pivot: boolean \| number` marks pivot dimension; order by number | Must |
| REQ-PV-06 | `columnDef.rowGroup` continues to define row hierarchy | Must |
| REQ-PV-05 | Only columns with `aggFunc` (or `value` role) populate pivot cells | Must |
| REQ-PV-20 | `enablePivot: boolean` on column allows drag to pivot panel | Should |
| REQ-PV-21 | Pivot columns hidden from row area like grouped columns | Must |
| REQ-PV-22 | `pivotKeys` API returns active pivot column fields | Must |

### 5.3 Dynamic column generation (CSRM)

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-PV-03 | Scan leaf rows for distinct pivot field values; generate one column per value per value-column | Must |
| REQ-PV-04 | Multiple pivot fields produce nested column groups (Cartesian product) | Should |
| REQ-PV-23 | Generated `colId` format: `${pivotField}_${pivotValue}_${valueColId}` (sanitized) | Must |
| REQ-PV-08 | `processPivotResultColDef(colDef, pivotKeys)` allows mutation before register | Should |
| REQ-PV-09 | `processPivotResultColGroupDef` for nested headers | Should |
| REQ-PV-24 | Null pivot values → `"(Blanks)"` column key | Must |
| REQ-PV-25 | New data values add columns on `rowDataUpdated` | Must |
| REQ-PV-26 | Column order: row group cols → pivot result cols → row total cols | Must |

### 5.4 Cell value computation

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-PV-27 | Each pivot cell aggregates leaves matching row group key + pivot key intersection | Must |
| REQ-PV-28 | Uses aggregation engine ([aggregation.md](./aggregation.md)) | Must |
| REQ-PV-29 | Empty intersection displays empty or zero per `pivotEmptyCellMode` option | Should |
| REQ-PV-14 | `pivotRowTotals: 'before' \| 'after' \| undefined` adds sum across pivot cols | Should |
| REQ-PV-30 | Grand total row includes pivot column totals | Should |

### 5.5 UI — pivot panel

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-PV-07 | Pivot drop zone in side bar lists active pivot columns | Should |
| REQ-PV-31 | Drag column to pivot zone sets `pivot: true` | Should |
| REQ-PV-32 | Reorder pivot columns changes column group nesting order | Should |
| REQ-PV-33 | Values zone lists columns with `aggFunc` | Should |

### 5.6 SSRM pivot

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-PV-11 | SSRM datasource returns `pivotResultColumns` + row data with pivot field keys | Must |
| REQ-PV-34 | Client does not rescan data for pivot keys in SSRM mode | Must |
| REQ-PV-35 | Server may return sparse pivot cells; missing = empty | Must |
| REQ-PV-36 | Changing pivot mode triggers new SSRM request with pivot metadata | Must |

### 5.7 Column virtualization & performance

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-PV-37 | Pivot mode requires column virtualization when generated columns > 50 | Must |
| REQ-PV-38 | Horizontal scroll 60fps with 500 pivot columns (column virtualization) | Must |
| REQ-PV-39 | Pivot column generation debounced on bulk data load | Should |

### 5.8 Events & state

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-PV-40 | Emit `columnPivotChanged` when pivot column set changes | Must |
| REQ-PV-41 | Serializable state includes `pivotMode`, pivot column keys | Must |
| REQ-PV-42 | `getPivotResultColumns()` returns generated column defs | Must |

---

## 6. API Design

### 6.1 GridOptions

```typescript
interface PivotGridOptions<TData = unknown> {
  pivotMode?: boolean;
  pivotDefaultExpanded?: number;
  removePivotHeaderRowWhenSingleValueColumn?: boolean;
  pivotRowTotals?: 'before' | 'after';
  pivotColumnGroupTotals?: 'before' | 'after';
  pivotEmptyCellMode?: 'empty' | 'zero' | 'dash';
  processPivotResultColDef?: (
    colDef: ColumnDef<TData>,
    pivotKeys: Record<string, string>,
    valueColDef: ColumnDef<TData>,
  ) => ColumnDef<TData> | void;
  processPivotResultColGroupDef?: (
    colGroupDef: ColGroupDef<TData>,
  ) => ColGroupDef<TData> | void;

  onPivotModeChanged?(event: PivotModeChangedEvent): void;
  onColumnPivotChanged?(event: ColumnPivotChangedEvent): void;
}
```

### 6.2 ColumnDef extensions

```typescript
interface ColumnDef<TData = unknown> {
  pivot?: boolean | number;
  pivotIndex?: number;
  enablePivot?: boolean;
  // rowGroup, aggFunc — see grouping/aggregation specs
}
```

### 6.3 GridApi extensions

```typescript
declare module '@ol-grid/core' {
  interface GridApi {
    isPivotMode(): boolean;
    setPivotMode(pivotMode: boolean): void;
    getPivotColumns(): ColumnDef[];
    setPivotColumns(colKeys: string[]): void;
    addPivotColumn(colKey: string): void;
    removePivotColumn(colKey: string): void;
    getPivotResultColumns(): ColumnDef[];
    getValueColumns(): ColumnDef[];
    setValueColumns(colKeys: string[]): void;
  }
}
```

### 6.4 SSRM datasource extension

```typescript
interface IServerSideGetRowsParams {
  // existing: startRow, endRow, sortModel, filterModel, groupKeys
  pivotMode?: boolean;
  pivotCols?: PivotColumn[];
  valueCols?: ValueColumn[];
  pivotResultFields?: string[];
}

interface IServerSideGetRowsResult {
  rows: any[];
  pivotResultColumns?: ColumnDef[];  // server-generated column defs
  rowCount?: number;
}
```

### 6.5 Pipeline (CSRM)

```
filtered → sorted → grouped → pivoted → aggregated → flattenedDisplayRows
```

The `pivoted` stage:

1. Collects distinct pivot keys from leaf rows
2. Builds `PivotColumnModel` (generated defs + groups)
3. Maps `(rowGroupPath, pivotKeyTuple)` → leaf set reference for agg

---

## 7. Architecture Integration

### 7.1 PivotColumnModel

New sub-component of `ColumnModel`:

```typescript
interface PivotColumnModel {
  primaryColumnDefs: ColumnDef[];      // user-defined; hidden during pivot
  generatedColumnDefs: ColumnDef[];    // dynamic
  columnGroups: ColGroupDef[];         // nested headers
  rebuild(leaves: RowNode[], pivotCols: ColumnDef[], valueCols: ColumnDef[]): void;
}
```

### 7.2 Column group headers

Pivot generates two-row (or N-row) headers:

```
|           | 2020          | 2021          |
| Country   | gold | silver | gold | silver |
```

ColumnModel flattening produces leaf columns with group path metadata for renderer.

### 7.3 Interaction with virtualization

- `columnCount` = primary visible + generated pivot columns
- `Virtualizer` uses `PivotColumnModel.getLeafColumns()` for width offsets
- Pinning: row group columns pinned left; pivot columns scroll in center

### 7.4 Module boundaries

Pivot logic in `@ol-grid/grouping/pivot/`:

- `pivotStage.ts` — pipeline transform
- `pivotKeyScanner.ts` — distinct value collection
- `pivotColumnFactory.ts` — colDef generation

---

## 8. Tier 3 Delivery Plan

| Phase | Deliverable | Exit criterion |
|-------|-------------|----------------|
| T3b | Single pivot column + row group + sum | Olympic medals by country × year |
| T3b | `processPivotResultColDef` hook | Custom width on generated cols |
| T3b | Column virtualization with pivot | 200 columns scroll demo |
| T3c | Multi-pivot nested column groups | Two pivot dimensions |
| T3c | Pivot panel UI | Drag to pivot zone |
| T3c | SSRM pivot from mock server | Server returns pivotResultColumns |
| T3c | Row totals column | Sum across pivot cols |

**Bundle impact:** pivot submodule ≤ 10 KB gzip (within grouping package).

---

## 9. Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-PV-01 | Generate columns for 50 distinct pivot keys × 3 value cols | ≤ 100 ms |
| NFR-PV-02 | Recompute pivot matrix 50k rows, 10 pivot keys, 2 value cols | ≤ 300 ms |
| NFR-PV-03 | 500 pivot columns scroll at 60fps with column virtualization | Must |
| NFR-PV-04 | Memory: pivot key index ≤ O(leaves × pivotCols) | Documented |
| NFR-PV-05 | Generated colIds stable across refresh if keys unchanged | Must |

---

## 10. Competitive Analysis

### 10.1 vs AG Grid Enterprise

| Dimension | AG Grid | ol-grid |
|-----------|---------|---------|
| License | Enterprise only | MIT |
| Pivot + SSRM | Mature, documented | T3c target |
| Column groups from pivot | Full support | T3b/T3c |
| Chart from pivot | Integrated | Out of scope; export to Chart.js |
| API familiarity | Reference | AG Grid-aligned naming |

AG Grid has years of pivot edge-case fixes. ol-grid targets 90% CSRM pivot parity at launch.

### 10.2 vs Tabulator

| Dimension | Tabulator | ol-grid |
|-----------|-----------|---------|
| Pivot | **Not native** — column calculations only | Full pivot mode |
| Group + calc | `groupBy` + `bottomCalc` | Pivot matrix |
| Dynamic columns | Manual column generation | Automatic from data |

Tabulator lacks true pivot mode — ol-grid significantly exceeds Tabulator for cross-tab use cases.

### 10.3 vs Spreadsheet grids (Handsontable)

Handsontable offers pivot via optional formulas/pivot plugin (commercial). ol-grid pivot is data-grid-native, not spreadsheet-cell-address based.

---

## 11. Acceptance Criteria

### 11.1 Functional

- [ ] `pivotMode: true` generates columns for each distinct pivot field value
- [ ] Row groups + pivot + sum produces a correct matrix
- [ ] Toggle pivot off restores original columns
- [ ] `setPivotColumns` API updates generated columns
- [ ] Multi-pivot produces nested column group headers
- [ ] `processPivotResultColDef` modifies generated columns
- [ ] Row totals column sums pivot cells per row
- [ ] SSRM returns server pivot columns; client renders without rescan
- [ ] 500 generated columns scroll with virtualization enabled
- [ ] Events `pivotModeChanged`, `columnPivotChanged` fire correctly

### 11.2 Non-functional

- [ ] Pivot generation benchmark meets NFR-PV-01/02
- [ ] No pivot code in bundle when grouping module not registered

### 11.3 Migration

- [ ] AG Grid "Pivoting" tutorial reproducible with migration notes

---

## 12. Dependencies & Prerequisites

| Dependency | Reason |
|------------|--------|
| [row-grouping.md](./row-grouping.md) | Row hierarchy |
| [aggregation.md](./aggregation.md) | Cell values |
| `@ol-grid/core` ColumnModel | Dynamic columns |
| T3-SC-01 column virtualization | Scale |
| `@ol-grid/ui-panels` | Pivot drop zone |
| SSRM | Server pivot |

---

## 13. Open Questions

| # | Question | Options | Deadline |
|---|----------|---------|----------|
| OQ-PV-1 | Max pivot columns soft limit warning | 1000 warn / none | T3b |
| OQ-PV-2 | Pivot on infinite row model | Disallow / server-only | T3 planning |
| OQ-PV-3 | Secondary column pattern naming | AG Grid match / simplify | T3a |
| OQ-PV-4 | Cache pivot key scan across data versions | Full rescan / incremental | T3c |

---

## 14. References

- [AG Grid Pivoting](https://www.ag-grid.com/javascript-data-grid/pivoting/)
- [AG Grid SSRM Pivoting](https://www.ag-grid.com/javascript-data-grid/server-side-model-pivoting/)
- [AG Grid Pivot Column Groups](https://www.ag-grid.com/javascript-data-grid/pivot-column-groups/)
- [ol-grid REQUIREMENTS.md T3-GR-06](../REQUIREMENTS.md)
- [row-grouping.md](./row-grouping.md)
- [aggregation.md](./aggregation.md)

---

*This document is authoritative for pivot mode scope. Changes require explicit amendment.*

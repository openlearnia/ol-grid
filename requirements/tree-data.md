# Tree Data — Feature Requirements

> **Package:** `@ol-grid/grouping` (tree submodule)  
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

Tree data mode displays hierarchical records where parent-child relationships come from **data paths** (e.g. `['USA', 'California', 'San Francisco']`) rather than column-value grouping. File explorers, org charts, BOMs, and nested categories use this model. AG Grid Enterprise marks tree data as a premium feature via `treeData: true` and `getDataPath`.

ol-grid provides **MIT-licensed tree data** as a Tier 3 capability in `@ol-grid/grouping`, sharing expand/collapse, auto group column, and virtualization infrastructure with [row-grouping.md](./row-grouping.md) but using a distinct **path-based tree builder** instead of column-key grouping.

**Mutual exclusivity:** Tree data mode and row grouping mode MUST NOT be active simultaneously on the same grid instance (AG Grid constraint). Pivot + tree data is out of scope v1.

---

## 2. Problem Statement & MIT Positioning

### 2.1 User problem

Hierarchical data often arrives as flat arrays with materialized paths or parent-id references. Forcing users into row grouping by column values misrepresents ragged trees and duplicate keys at different branches. Tree data mode preserves arbitrary hierarchy shapes.

### 2.2 ol-grid positioning

| Aspect | AG Grid Enterprise | ol-grid |
|--------|-------------------|---------|
| `treeData: true` | Enterprise | MIT Tier 3 |
| `getDataPath` callback | Enterprise | Same API |
| `treeDataChildrenField` (nested JSON) | Enterprise | Tier 3 |
| SSRM tree lazy load | Enterprise | T3 SSRM spec |
| License | ~$999/dev | **$0** |

### 2.3 Design principles

| ID | Principle |
|----|-----------|
| TD-P-01 | Tree builder accepts path arrays or nested children field — not both simultaneously |
| TD-P-02 | Tree nodes reuse `RowNode` with `group: true` for parents, `data` on leaves |
| TD-P-03 | Auto group column shows path segment for current level |
| TD-P-04 | Stable row IDs from path join or user `getRowId` |
| TD-P-05 | Flattened display list drives virtualizer (visible expanded nodes only) |

---

## 3. AG Grid Enterprise Parity Analysis

Reference: [AG Grid Tree Data](https://www.ag-grid.com/javascript-data-grid/tree-data/) (Enterprise).

| AG Grid Enterprise Feature | ol-grid Target | Priority | Notes |
|----------------------------|----------------|----------|-------|
| `treeData: true` | REQ-TD-01 | Must | Master toggle |
| `getDataPath(data) => string[]` | REQ-TD-02 | Must | Path callback |
| `treeDataChildrenField` nested data | REQ-TD-03 | Should | Alternative to flat paths |
| Auto group column for tree | REQ-TD-04 | Must | Reuse auto group column |
| Expand / collapse nodes | REQ-TD-05 | Must | Same as row groups |
| `groupDefaultExpanded` | REQ-TD-06 | Must | Depth-based |
| Custom tree row renderer | REQ-TD-07 | Should | `groupRowRenderer` |
| `excludeChildrenWhenTreeDataFiltering` | REQ-TD-08 | Should | Filter hides non-matching subtrees |
| SSRM tree data lazy load | REQ-TD-09 | Must | Expand fetches children |
| `isRowMaster` N/A — use tree paths | — | — | Master/detail separate |
| Aggregation on tree parents | REQ-TD-10 | Should | See aggregation spec |
| `suppressCount` hide child count | REQ-TD-11 | Should | Auto column suffix |
| `rowClassRules` on tree nodes | REQ-TD-12 | Must | Standard row rules |
| Keyboard navigation tree-aware | REQ-TD-13 | Must | Expand/collapse arrows |
| Immutable tree updates via transaction | REQ-TD-14 | Should | Move subtree |

**Explicit non-parity (v1):**

- Tree data + pivot mode simultaneously
- Drag-drop tree reorder (row drag T3 separate)

---

## 4. User Stories

| ID | Story | Acceptance hint |
|----|-------|-----------------|
| US-TD-01 | As a developer, I set `treeData: true` and `getDataPath: d => d.path` for flat file list | Hierarchy renders correctly |
| US-TD-02 | As a developer, I use nested JSON with `treeDataChildrenField: 'children'` | Nested structure renders |
| US-TD-03 | As an analyst, I expand a folder node to see files underneath | Children appear; scroll updates |
| US-TD-04 | As an analyst, I filter by filename and see matching nodes with ancestor path preserved | Filter mode includes parents |
| US-TD-05 | As a developer on SSRM, I lazy-load tree children when node expands | API call with parent path |
| US-TD-06 | As a developer, I show employee count in org chart group rows via aggregation | Parent shows count of descendants |
| US-TD-07 | As a developer migrating from AG Grid, I use same `getDataPath` signature | Drop-in callback |
| US-TD-08 | As a platform engineer, I persist expanded tree nodes in serializable state | `ExpansionState` works |

---

## 5. Functional Requirements

### 5.1 Tree mode activation

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-TD-01 | `treeData: true` enables path-based hierarchy; disables row grouping | Must |
| REQ-TD-15 | Grid MUST error clearly if both `treeData` and active row groups | Must |
| REQ-TD-16 | `api.setGridOption('treeData', true)` at runtime rebuilds tree | Should |

### 5.2 Data input modes

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-TD-02 | `getDataPath: (data: TData) => string[]` returns path from root to node | Must |
| REQ-TD-03 | Alternative: `treeDataChildrenField: string` reads nested children arrays | Should |
| REQ-TD-17 | Path segments MUST be strings; non-string coerced with warning | Must |
| REQ-TD-18 | Empty path `[]` treated as root-level leaf | Must |
| REQ-TD-19 | Duplicate paths merge into single node (last write wins with warning) | Must |
| REQ-TD-20 | Path prefix creates implicit parent group nodes (auto-generated) | Must |

### 5.3 Tree construction (CSRM)

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-TD-21 | Build tree via trie/path map from all `getDataPath` results | Must |
| REQ-TD-22 | Parent nodes: `group: true`, `key: segment`, `level: depth`; no `data` unless row is also a data leaf | Must |
| REQ-TD-23 | Leaf nodes: `group: false`, full `data` object | Must |
| REQ-TD-24 | `childrenAfterGroup` ordered: folders first (configurable) then leaves, or data order | Should |
| REQ-TD-25 | Rebuild tree on full `rowData` replace; incremental on transaction | Should |

### 5.4 Display & auto group column

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-TD-04 | Auto group column shows current path segment with indent | Must |
| REQ-TD-26 | `autoGroupColumnDef.headerName` defaults to "Group" or locale equivalent | Must |
| REQ-TD-11 | `suppressCount: true` hides "(n)" child count in auto column | Should |
| REQ-TD-27 | `innerRenderer` on auto column for custom folder/file icons | Should |
| REQ-TD-07 | Custom `groupRowRenderer` for parent rows | Should |

### 5.5 Expand / collapse

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-TD-05 | Expand/collapse identical mechanics to row grouping | Must |
| REQ-TD-06 | `groupDefaultExpanded` applies to tree depth | Must |
| REQ-TD-13 | Keyboard Left/Right collapses/expands tree nodes | Must |
| REQ-TD-28 | Double-click toggles expand (configurable) | Should |
| REQ-TD-29 | `expandAll` / `collapseAll` traverse full tree | Must |

### 5.6 Filtering & sorting

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-TD-08 | `excludeChildrenWhenTreeDataFiltering: true` — parent visible if any descendant matches | Should |
| REQ-TD-30 | Default filter: prune non-matching subtrees; show ancestor chain to match | Must |
| REQ-TD-31 | Sort applies among siblings at same level; optional flatten sort mode | Should |
| REQ-TD-32 | Filter + expand: auto-expand ancestors of visible matches | Should |

### 5.7 Selection

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-TD-33 | Selecting parent optionally selects descendants (`groupSelectsChildren`) | Should |
| REQ-TD-34 | Checkbox indeterminate when partial child selection | Should |
| REQ-TD-35 | Leaf-only selection mode option | Should |

### 5.8 SSRM tree data

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-TD-09 | SSRM: expand node requests children via `groupKeys` = path prefix | Must |
| REQ-TD-36 | Server returns mix of group stubs and leaf rows | Must |
| REQ-TD-37 | Unknown child count shows loading stub row | Must |

### 5.9 Aggregation on tree

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-TD-10 | Optional agg on parent nodes over descendant leaves | Should |
| REQ-TD-38 | Parent with both `data` and children: agg includes only leaves in subtree | Must |

### 5.10 Row IDs & transactions

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-TD-39 | Default row ID: path join with configurable separator | Must |
| REQ-TD-14 | `applyTransaction` add/remove/update relocates nodes in tree | Should |
| REQ-TD-40 | Moving node = remove + add with new path | Should |

---

## 6. API Design

### 6.1 GridOptions

```typescript
interface TreeDataGridOptions<TData = unknown> {
  treeData?: boolean;
  getDataPath?: (data: TData) => string[];
  treeDataChildrenField?: string;
  autoGroupColumnDef?: ColumnDef<TData>;
  groupDefaultExpanded?: number;
  suppressCount?: boolean;
  excludeChildrenWhenTreeDataFiltering?: boolean;
  treeDataDisplayType?: 'autoColumn' | 'custom';  // custom = user renders indent

  // Shared with grouping
  groupRowRenderer?: string | GroupRowRendererDef;
  groupSelectsChildren?: boolean;

  onRowGroupOpened?(event: RowGroupOpenedEvent): void;  // reused for tree expand
}
```

### 6.2 GridApi extensions

```typescript
declare module '@ol-grid/core' {
  interface GridApi {
    getDataPath(data: TData): string[] | undefined;  // resolves callback
    forEachNodeAfterFilterAndSort(callback: (node: RowNode) => void): void;
    // expand/collapse: setRowNodeExpanded, expandAll, collapseAll (from grouping)
  }
}
```

### 6.3 RowNode (tree-specific)

```typescript
interface RowNode<TData = unknown> {
  // group, level, expanded, childrenAfterGroup — shared
  treeNode?: boolean;           // true when treeData mode active
  parentPath?: string[];        // path to parent
  key?: string;                 // segment at this level
}
```

### 6.4 Tree builder algorithm (reference)

```
Input: rows[], getDataPath
Output: root RowNode[]

1. Create virtual root
2. For each data row:
   a. path = getDataPath(row)
   b. Walk/create nodes for path[0..n-2] as group nodes
   c. Attach row as leaf at path[n-1] or as data on final segment node
3. Flatten for display: DFS pre-order, skip collapsed subtrees
```

### 6.5 Module registration

Tree data ships inside `GroupingModule`; activates when `treeData: true` and registers `treeRowModel` instead of `groupedRowModel`.

---

## 7. Architecture Integration

### 7.1 Pipeline exclusivity

```typescript
if (options.treeData) {
  pipeline.use(treeRowModelStage);
} else if (hasRowGroupColumns) {
  pipeline.use(groupedRowModelStage);
}
```

Both stages output unified `RowNode` forest → `flattenDisplayRows` → virtualizer.

### 7.2 Flattened display list

Core maintains `displayRowList: RowNode[]` as DFS flatten respecting `expanded`. Virtualizer indexes into this list — **not** raw data indices.

### 7.3 Path trie storage

```typescript
interface PathTrieNode {
  segment: string;
  children: Map<string, PathTrieNode>;
  leafData?: unknown;           // if path ends here with data
  rowNode?: RowNode;
}
```

Rebuild trie on data change; diff for transactions.

### 7.4 Renderer indent

Auto group column cell:

```
paddingLeft = basePadding + level * indentSize
content = chevron + segmentLabel + optionalCount
```

CSS variable: `--ol-grid-tree-indent: 20px`.

### 7.5 SSRM integration

Datasource params include:

```typescript
{
  groupKeys: ['Documents', '2024'],  // path prefix
  treeData: true,
}
```

---

## 8. Tier 3 Delivery Plan

| Phase | Deliverable | Exit criterion |
|-------|-------------|----------------|
| T3a | `getDataPath` flat array → tree | File explorer demo |
| T3a | Expand/collapse + auto group column | Keyboard a11y pass |
| T3b | `treeDataChildrenField` nested JSON | Org chart demo |
| T3b | Filter with ancestor inclusion | Search highlights path |
| T3c | SSRM lazy tree | Mock API expand |
| T3c | Tree aggregation (count) | Parent shows headcount |
| T3c | Transaction add/remove node | Move file between folders |

---

## 9. Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-TD-01 | Build tree from 50k paths, avg depth 4 | ≤ 200 ms |
| NFR-TD-02 | Expand node with 10k children | ≤ 16 ms flatten update |
| NFR-TD-03 | Memory: trie nodes ≤ path node count | Must |
| NFR-TD-04 | Max depth soft warning at 50 levels | Should |
| NFR-TD-05 | a11y: `aria-level`, `aria-expanded` on tree rows | Must |

---

## 10. Competitive Analysis

### 10.1 vs AG Grid Enterprise

| Dimension | AG Grid | ol-grid |
|-----------|---------|---------|
| License | Enterprise | MIT |
| `getDataPath` API | Reference | Match |
| SSRM tree | Mature | T3c |
| Tree + pivot | Supported in AG Grid | Out of scope v1 |
| File tree UX | Good | Parity target |

AG Grid leads on combined tree + SSRM + pivot. ol-grid targets path-based CSRM and SSRM tree first.

### 10.2 vs Tabulator

| Dimension | Tabulator | ol-grid |
|-----------|-----------|---------|
| Tree | `dataTree: true`, `dataTreeChildField` | `treeDataChildrenField` + `getDataPath` |
| Flat paths | Manual preprocessing | Native `getDataPath` |
| Virtualization | dataTree + virtual OK | Unified virtualizer |
| API | `dataTreeStartExpanded` | `groupDefaultExpanded` (AG Grid aligned) |

Tabulator tree is capable and MIT; ol-grid adds AG Grid path model and headless pipeline for multi-framework apps.

### 10.3 vs TanStack Table

TanStack supports expanding via `getSubRows` — similar to `treeDataChildrenField`. No auto group column, no SSRM tree, no path-based flat array helper. ol-grid provides batteries-included tree UX.

---

## 11. Acceptance Criteria

### 11.1 Functional

- [ ] `treeData: true` + `getDataPath` renders correct hierarchy from flat data
- [ ] Implicit parent nodes created for path prefixes
- [ ] `treeDataChildrenField` renders nested JSON
- [ ] Expand/collapse updates display rows and scrollbar
- [ ] Auto group column indents by level
- [ ] Filter shows matching leaves with ancestor chain
- [ ] Cannot enable tree data and row grouping simultaneously (clear error)
- [ ] SSRM expand loads children from mock server
- [ ] `expandAll` / `collapseAll` work on 5-level tree
- [ ] Serializable expansion state restores on grid reload

### 11.2 Non-functional

- [ ] 50k path tree build ≤ 200 ms
- [ ] axe-core clean on tree demo
- [ ] Keyboard expand/collapse operable

### 11.3 Migration

- [ ] AG Grid "Tree Data" example runs with ≤ 2 API differences documented

---

## 12. Dependencies & Prerequisites

| Dependency | Reason |
|------------|--------|
| `@ol-grid/grouping` | Shared expand/collapse, auto group column |
| `@ol-grid/core` RowNode, Virtualizer | Display flatten list |
| `@ol-grid/filter` T2 | Tree-aware filtering |
| [aggregation.md](./aggregation.md) | Parent aggregates |
| SSRM T3 | Lazy tree |

---

## 13. Open Questions

| # | Question | Options | Deadline |
|---|----------|---------|----------|
| OQ-TD-1 | Support `parentId` flat model natively? | v1 / preprocess / v1.1 | T3a |
| OQ-TD-2 | Sort order among siblings default | Data order / alphabetical | T3a |
| OQ-TD-3 | Max tree depth hard limit | None / 100 | T3b |
| OQ-TD-4 | Unified `ExpansionState` for tree and grouping | Shared slice | T3a |

---

## 14. References

- [AG Grid Tree Data](https://www.ag-grid.com/javascript-data-grid/tree-data/)
- [AG Grid Tree Data Path](https://www.ag-grid.com/javascript-data-grid/tree-data-path/)
- [AG Grid SSRM Tree Data](https://www.ag-grid.com/javascript-data-grid/server-side-model-tree-data/)
- [Tabulator Data Tree](http://tabulator.info/docs/6.3/tree)
- [ol-grid REQUIREMENTS.md T3-GR-07](../REQUIREMENTS.md)
- [row-grouping.md](./row-grouping.md)

---

*This document is authoritative for tree data scope. Changes require explicit amendment.*

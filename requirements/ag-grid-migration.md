# Feature: AG Grid Migration & Compatibility

> **Status:** Draft  
> **Tier:** T1 (naming parity); T2 (migration guide + compat shim); T3 (enterprise feature mapping)  
> **Package(s):** `@ol-grid/core`, `@ol-grid/compat-ag-grid` (optional shim package)  
> **Parent:** [REQUIREMENTS.md](../REQUIREMENTS.md) §3, G-08, §6.8, §8.2  
> **Architecture:** [ARCHITECTURE.md](../ARCHITECTURE.md) §8.2  
> **Last updated:** 2026-06-18

---

## 1. Summary

ol-grid targets teams migrating from **AG Grid Community** (and selectively from Enterprise data features) with familiar vocabulary (`columnDefs`, `GridApi`, `onGridReady`), an optional **`@ol-grid/compat-ag-grid` shim** for legacy call sites, and published **ColDef coverage targets** measured against AG Grid Community column definition properties. Migration is a product requirement (G-08): the AG Grid getting-started tutorial MUST be reproducible with ≤ 20% API mapping changes. Intentional breaking differences MUST be documented with side-by-side snippets.

## 2. Goals

| ID | Goal |
|----|------|
| G-01 | Minimize mechanical rename work for AG Grid Community adopters |
| G-02 | Provide optional compat shim that aliases AG Grid names to ol-grid APIs |
| G-03 | Achieve ≥ 95% ColDef property coverage for AG Grid Community column defs (Tier 2) |
| G-04 | Document every intentional API break with migration snippet |
| G-05 | Ship Alpine-inspired theme for visual continuity |
| G-06 | MIT-licensed alternatives for common Enterprise data features (grouping, clipboard, SSRM) without license key |

## 3. Non-Goals

| Item | Rationale |
|------|-----------|
| Drop-in binary compatibility with AG Grid packages | Different package graph and module system |
| AG Grid Enterprise charts, AI toolkit, formulas | Out of scope v1 |
| Runtime AG Grid license key validation | ol-grid has no license keys |
| Full Quartz theme parameter compatibility | Alpine-first; Quartz TBD (OQ-6 in REQUIREMENTS.md) |
| `ag-Grid` CSS class name parity | ol-grid uses `ol-grid__*` BEM convention |

## 4. User Stories

| ID | As a… | I want… | So that… |
|----|-------|---------|----------|
| US-01 | AG Grid migrator | to paste existing `columnDefs` with minimal edits | I migrate over a sprint, not a quarter |
| US-02 | AG Grid migrator | `onGridReady`, `api.setSortModel`, `rowData` to work as today | imperative code ports easily |
| US-03 | Tech lead | a coverage matrix of ColDef properties | I estimate migration effort |
| US-04 | Developer | `@ol-grid/compat-ag-grid` to alias `GridOptions` shape | legacy wrapper services keep working temporarily |
| US-05 | Designer | Alpine-like theme | users perceive continuity |
| US-06 | Enterprise AG Grid user | grouping + clipboard without enterprise license | cost and legal friction removed |

## 5. Compatibility Strategy

### 5.1 Three-layer approach

```
Layer 1 — Naming parity (built into @ol-grid/core)
  AG Grid-aligned names where semantics match

Layer 2 — Documentation migration guide (docs/migration/ag-grid.md)
  Side-by-side snippets, property mapping tables, recipe index

Layer 3 — Optional compat shim (@ol-grid/compat-ag-grid)
  Runtime aliases, deprecated API adapters, ColumnApi facade
```

### 5.2 Shim package requirements

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| MIG-SH-01 | Publish `@ol-grid/compat-ag-grid` as optional peer of core | Should | T2 |
| MIG-SH-02 | `createAgGridCompatGrid(host, agGridOptions)` wraps `createGrid` with option normalization | Should | T2 |
| MIG-SH-03 | Map `rowSelection: 'single' \| 'multiple'` to ol-grid `rowSelection` | Must | T2 |
| MIG-SH-04 | Expose `params.api` and `params.columnApi` on events (columnApi → api facade) | Must | T2 |
| MIG-SH-05 | Alias `defaultColDef`, `columnTypes`, `frameworkComponents` → adapter registry | Should | T2 |
| MIG-SH-06 | Console deprecation warnings in dev when shim alias used | Must | T2 |
| MIG-SH-07 | Shim adds ≤ 5 KB gzip | Should | T2 |
| MIG-SH-08 | Shim is not required for idiomatic ol-grid apps | Must | T2 |

## 6. API Mapping — Core Types

### 6.1 GridOptions mapping

| AG Grid option | ol-grid option | Status | Notes |
|----------------|----------------|--------|-------|
| `columnDefs` | `columnDefs` | ✅ Identical | |
| `rowData` | `rowData` | ✅ Identical | |
| `defaultColDef` | `defaultColDef` | ✅ Identical | |
| `context` | `context` | ✅ Identical | |
| `getRowId` | `getRowId` | ✅ Identical | |
| `onGridReady` | `onGridReady` | ✅ Identical | Payload shape minor diff |
| `rowSelection` | `rowSelection` | ✅ Mapped | `'multiple'` → `'multiRow'` internally |
| `pagination` | `pagination` | ✅ T2 | Via PaginationModule |
| `paginationPageSize` | `paginationPageSize` | ✅ T2 | |
| `rowModelType` | `rowModelType` | ✅ Identical | Values: clientSide, infinite, serverSide |
| `cacheBlockSize` | `cacheBlockSize` | ✅ T2 | Infinite model |
| `serverSideDatasource` | `serverSideDatasource` | ✅ T3 | SSRM module |
| `sideBar` | `sideBar` | ✅ T3 | ToolPanelsModule |
| `getContextMenuItems` | `getContextMenuItems` | ✅ T3 | ContextMenuModule |
| `enableRangeSelection` | `rowSelection: 'range'` | ⚠️ Different | RangeSelectionModule |
| `animateRows` | — | ❌ v1 | Use CSS transitions if needed |
| `suppressCellFocus` | `suppressCellFocus` | ✅ T1 | |
| `domLayout` | `domLayout` | ⚠️ Partial | `'autoHeight'` T2; print N/A |
| `frameworkComponents` | adapter-specific | ⚠️ Break | See adapter docs |
| `components` | string registry keys | ✅ T1 | |
| `localeText` | `localeText` | ✅ T2 | |
| `theme` | `theme: 'alpine'` etc. | ✅ T1 | ol-grid theme names |
| `rowHeight` | `rowHeight` | ✅ Identical | |
| `headerHeight` | `headerHeight` | ✅ Identical | |
| `quickFilterText` | `quickFilterText` | ✅ T2 | FilterModule |
| `groupDisplayType` | `groupDisplayType` | ✅ T3 | GroupingModule |
| `pivotMode` | `pivotMode` | ✅ T3 | |
| `autoGroupColumnDef` | `autoGroupColumnDef` | ✅ T3 | |

### 6.2 GridApi mapping

| AG Grid API | ol-grid API | Status | Tier |
|-------------|-------------|--------|------|
| `setSortModel` / `getSortModel` | Same | ✅ | T1 (SortModule) |
| `setFilterModel` / `getFilterModel` | Same | ✅ | T2 |
| `applyColumnState` / `getColumnState` | Same | ✅ | T1 |
| `setColumnDefs` | `setGridOption('columnDefs', …)` | ⚠️ Alias in shim | T1 |
| `refreshCells` | Same | ✅ | T1 |
| `forEachNode` | Same | ✅ | T1 |
| `getSelectedRows` | Same | ✅ | T1 |
| `selectAll` / `deselectAll` | Same | ✅ | T1/T2 |
| `exportDataAsCsv` | Same | ✅ | T2 |
| `exportDataAsExcel` | Same | ✅ | T3 |
| `setRowData` | Same | ✅ | T1 |
| `applyTransaction` | Same | ✅ | T2 |
| `showLoadingOverlay` | Same | ✅ | T2 |
| `setGridOption` (v31+) | Same | ✅ | T1 |
| `sizeColumnsToFit` | Same | ✅ | T2 |
| `addEventListener` | Same | ✅ | T1 |
| `setServerSideDatasource` | Same | ✅ | T3 |
| `expandAll` / `collapseAll` | Same | ✅ | T3 |
| `copySelectedRangeToClipboard` | `copyToClipboard()` | ⚠️ Rename | T3 |

### 6.3 Event mapping

| AG Grid event | ol-grid event | Status |
|---------------|---------------|--------|
| `gridReady` | `gridReady` | ✅ |
| `cellClicked` | `cellClicked` | ✅ |
| `rowSelected` | `selectionChanged` | ⚠️ Consolidated |
| `selectionChanged` | `selectionChanged` | ✅ |
| `sortChanged` | `sortChanged` | ✅ |
| `filterChanged` | `filterChanged` | ✅ |
| `cellValueChanged` | `cellValueChanged` | ✅ |
| `columnMoved` | `columnMoved` | ✅ |
| `columnResized` | `columnResized` | ✅ |
| `bodyScroll` | `bodyScroll` | ✅ |
| `rowGroupOpened` | `rowGroupOpened` | ✅ T3 |
| `rangeSelectionChanged` | `rangeSelectionChanged` | ✅ T3 |
| `firstDataRendered` | `firstDataRendered` | ✅ |

## 7. ColDef Coverage Targets

### 7.1 Coverage tiers

| Coverage level | Definition | Target release |
|----------------|------------|----------------|
| **Tier A** | Property supported with identical semantics | Must for Community migration |
| **Tier B** | Supported with documented semantic difference | Acceptable with migration note |
| **Tier C** | Not supported v1; documented alternative | Explicit non-goal |
| **Tier E** | Enterprise-only in AG Grid; ol-grid Tier 3 MIT | Value-add |

### 7.2 ColDef property matrix — Tier A (must have)

| Property | ol-grid | Tier |
|----------|---------|------|
| `field` | ✅ | T1 |
| `colId` | ✅ | T1 |
| `headerName` | ✅ | T1 |
| `headerValueGetter` | ✅ | T2 |
| `width`, `minWidth`, `maxWidth`, `flex` | ✅ | T1 |
| `initialWidth` | ✅ | T1 |
| `pinned` | ✅ | T1 |
| `hide` | ✅ | T1 |
| `sortable` | ✅ | T1 |
| `sort` | ✅ | T1 |
| `sortIndex` | ✅ | T2 |
| `resizable` | ✅ | T1 |
| `valueGetter` | ✅ | T1 |
| `valueSetter` | ✅ | T2 |
| `valueFormatter` | ✅ | T1 |
| `valueParser` | ✅ | T2 |
| `editable` | ✅ | T2 |
| `cellRenderer` | ✅ | T1 |
| `cellRendererParams` | ✅ | T1 |
| `cellEditor` | ✅ | T2 |
| `cellEditorParams` | ✅ | T2 |
| `cellClass`, `cellClassRules` | ✅ | T2 |
| `cellStyle` | ✅ | T2 |
| `headerClass` | ✅ | T2 |
| `tooltipField`, `tooltipValueGetter` | ✅ | T2 |
| `checkboxSelection` | ✅ | T1 |
| `headerCheckboxSelection` | ✅ | T1 |
| `showDisabledCheckboxes` | ✅ | T2 |
| `children` (column groups) | ✅ | T2 |
| `marryChildren` | ✅ | T2 |
| `columnGroupShow` | ✅ | T2 |
| `type` / `cellDataType` | ✅ | T2 |
| `filter` | ✅ | T2 |
| `filterParams` | ✅ | T2 |
| `floatingFilter` | ✅ | T2 |
| `comparator` | ✅ | T1 |
| `unSortIcon` | ✅ | T2 |
| `icons` | ⚠️ Partial | T2 — via theme/CSS |
| `onCellClicked` | ✅ | T1 |
| `onCellDoubleClicked` | ✅ | T1 |
| `suppressMovable` | ✅ | T2 |
| `lockPosition` | ✅ | T2 |
| `lockVisible` | ✅ | T2 |
| `lockPinned` | ✅ | T2 |
| `suppressHeaderMenuButton` | ✅ | T2 |
| `suppressHeaderFilterButton` | ✅ | T2 |
| `wrapText`, `autoHeight` | ✅ | T2 |
| `spanRows`, `colSpan` | ✅ | T3 |
| `rowGroup`, `enableRowGroup` | ✅ Tier E | T3 |
| `rowGroupIndex` | ✅ | T3 |
| `pivot`, `enablePivot` | ✅ Tier E | T3 |
| `aggFunc` | ✅ Tier E | T3 |
| `allowedAggFuncs` | ✅ | T3 |
| `enableValue` | ✅ | T3 |
| `refData` | ✅ | T2 |
| `keyCreator` | ✅ | T3 |
| `equals` | ✅ | T2 |
| `useValueFormatterForExport` | ✅ | T2 |

**Tier A coverage target:** ≥ **95%** of AG Grid Community ColDef properties used in public examples and docs (measured by static analysis of AG Grid doc snippets).

### 7.3 ColDef property matrix — Tier C (not v1)

| Property | Rationale |
|----------|-----------|
| `cellRendererSelector` | T3+ — use dynamic `cellRenderer` callback |
| `toolPanelClass` | Tool panel styling via theme |
| `chartDataType` | Charts N/A |
| `enableCellChangeFlash` | Cosmetic; CSS animation T3+ |
| `loadingCellRenderer` | Use `loadingCellRenderer` pattern via overlay T2 |

### 7.4 Enterprise → ol-grid Tier 3 mapping

| AG Grid Enterprise feature | ol-grid package | License |
|----------------------------|-----------------|---------|
| Row grouping | `@ol-grid/grouping` | MIT |
| Aggregation | `@ol-grid/grouping` | MIT |
| Pivot mode | `@ol-grid/grouping` | MIT |
| Server-side row model | `@ol-grid/server-side-row-model` | MIT |
| Set filter | `@ol-grid/set-filter` | MIT |
| Range selection | `@ol-grid/range-selection` | MIT |
| Clipboard | `@ol-grid/clipboard` | MIT |
| Excel export | `@ol-grid/excel-export` | MIT |
| Master/detail | `@ol-grid/master-detail` | MIT |
| Context menu | `@ol-grid/context-menu` | MIT |
| Side bar / tool panels | `@ol-grid/tool-panels` | MIT |
| Integrated charts | External chart lib + cell renderer | N/A |
| Formulas | N/A | — |

## 8. Theming Migration

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| MIG-TH-01 | Ship `@ol-grid/themes/alpine` Alpine-inspired theme | Should | T1 |
| MIG-TH-02 | Document CSS variable mapping AG Grid → ol-grid tokens | Must | T2 |
| MIG-TH-03 | `theme: 'alpine'` in GridOptions selects alpine theme | Should | T1 |
| MIG-TH-04 | Quartz theme compatibility layer | Could | T2+ (OQ-6) |
| MIG-TH-05 | AG Grid `.ag-*` classes NOT supported; provide migration CSS adapter snippet | Should | T2 |

### 8.1 Token mapping (sample)

| AG Grid variable | ol-grid token |
|------------------|---------------|
| `--ag-font-size` | `--ol-grid-font-size` |
| `--ag-row-height` | `--ol-grid-row-height` |
| `--ag-header-height` | `--ol-grid-header-height` |
| `--ag-border-color` | `--ol-grid-border-color` |
| `--ag-selected-row-background-color` | `--ol-grid-row-selected-bg` |

## 9. Framework Adapter Migration

### 9.1 React

| AG Grid | ol-grid |
|---------|---------|
| `import { AgGridReact } from 'ag-grid-react'` | `import { OlGrid } from '@ol-grid/react'` |
| `<AgGridReact columnDefs={} rowData={} onGridReady={} />` | `<OlGrid columnDefs={} rowData={} onGridReady={} />` |
| `ref.current.api` | `ref.current` or `onGridReady` |
| `agGridReactProps` | `GridOptions` spread on `OlGrid` |

### 9.2 Module registration

| AG Grid | ol-grid |
|---------|---------|
| `ModuleRegistry.registerModules([AllCommunityModule])` | `ModuleRegistry.register(SortModule, …)` explicit |
| Package imports auto-register (v33+) | Explicit register required — document clearly |

**Migration note:** Provide `OlGridCommunityModules` array export as convenience (see plugin-module-system OQ-2).

## 10. Migration Guide Deliverables

| ID | Deliverable | Tier |
|----|-------------|------|
| MIG-DOC-01 | `docs/migration/ag-grid.md` — overview + quick start port | T2 |
| MIG-DOC-02 | Property reference appendix (§6–7 of this doc, expanded) | T2 |
| MIG-DOC-03 | Recipe: infinite scroll datasource port | T2 |
| MIG-DOC-04 | Recipe: custom cell renderer port (React) | T1 |
| MIG-DOC-05 | Recipe: SSRM + grouping port | T3 |
| MIG-DOC-06 | Recipe: Enterprise clipboard + Excel | T3 |
| MIG-DOC-07 | Codemod script for import paths (optional) | Could T2 |
| MIG-DOC-08 | Side-by-side CodeSandbox: AG Grid vs ol-grid | T2 |

## 11. Acceptance Criteria

- [ ] AG Grid official "Getting Started" tutorial replicated in ol-grid with ≤ 20% line changes (excluding imports)
- [ ] ColDef Tier A coverage ≥ 95% on AG Grid doc example corpus
- [ ] `@ol-grid/compat-ag-grid` passes integration test suite ported from AG Grid smoke tests
- [ ] Migration guide published with searchable property table
- [ ] Alpine theme visually reviewed against AG Grid Alpine (screenshot diff < perceptual threshold)
- [ ] Known breaks list documented: `animateRows`, `frameworkComponents`, `rowSelected` event, module auto-register
- [ ] Enterprise feature mapping table published (§7.4) with MIT confirmation

## 12. Test Plan

| Test type | Coverage |
|-----------|----------|
| Compatibility | Port N official AG Grid Community examples; track pass/fail |
| Static | Script extracts ColDef keys from AG Grid docs; compare to ol-grid types |
| Integration | Shim package: AG Grid-shaped options produce expected grid behavior |
| Visual | Alpine theme screenshot diff vs AG Grid Alpine reference |
| Type | `ColDef` assignability from AG Grid example defs (loose compat test) |

## 13. Intentional Breaking Changes (document prominently)

| Change | Reason | Migration |
|--------|--------|-----------|
| Explicit module registration | Tree-shaking / bundle budget | `ModuleRegistry.register(SortModule)` |
| `rowSelected` → `selectionChanged` | Unified selection events | Update event handler |
| `frameworkComponents` removed | Adapter-specific registry | Use `components` + adapter docs |
| BEM `ol-grid__*` classes | Namespace stability | Update CSS selectors |
| No `animateRows` | CSS-only v1 | Custom CSS transitions |
| `columnApi` merged into `api` | AG Grid v28+ alignment | Shim provides `columnApi` facade |
| Enterprise license not needed | MIT value proposition | Remove license key code |

## 14. Open Questions

| # | Question | Options | Decision |
|---|----------|---------|----------|
| OQ-1 | Ship compat shim as separate package or core subpath | `@ol-grid/compat-ag-grid` / `@ol-grid/core/compat` | Separate package |
| OQ-2 | ColDef coverage measurement corpus | AG Grid docs / user telemetry | AG Grid docs |
| OQ-3 | `agGridReact` component alias export | Yes in compat / no | compat only |

## 15. References

- [REQUIREMENTS.md](../REQUIREMENTS.md) §3, G-08, §6.8, §8.1–8.2, §8.4
- [ARCHITECTURE.md](../ARCHITECTURE.md) §8.2
- [grid-api-and-events.md](./grid-api-and-events.md)
- [plugin-module-system.md](./plugin-module-system.md)
- [context-menu-and-tool-panels.md](./context-menu-and-tool-panels.md)
- [AG Grid Community vs Enterprise](https://www.ag-grid.com/javascript-data-grid/community-vs-enterprise/)
- [AG Grid Column Properties](https://www.ag-grid.com/javascript-data-grid/column-properties/)

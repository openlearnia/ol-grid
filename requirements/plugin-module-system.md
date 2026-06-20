# Feature: Plugin & Module System

> **Status:** Draft  
> **Tier:** T1 (registry foundation); T2–T3 (feature modules)  
> **Package(s):** `@ol-grid/core`, `@ol-grid/sort`, `@ol-grid/filter`, `@ol-grid/grouping`, `@ol-grid/clipboard`, …  
> **Parent:** [REQUIREMENTS.md](../REQUIREMENTS.md) §6.6, G-07  
> **Architecture:** [ARCHITECTURE.md](../ARCHITECTURE.md) §3.8, §5.3, §9  
> **Last updated:** 2026-06-18

---

## 1. Summary

ol-grid features are delivered as **opt-in modules** registered via `ModuleRegistry`. Importing a module package does not activate behavior until the module is registered on a grid instance (or globally). Each module extends the core through store slices, row-model pipeline stages, `GridApi` methods, and event types — with TypeScript module augmentation for typed API surfaces. Advanced cross-cutting extensions use `GridPlugin` via `PluginHost`. This design enables tree-shaking, zero-dep core, and bundle budgets that scale with actual feature usage.

## 2. Goals

| ID | Goal |
|----|------|
| G-01 | Core `@ol-grid/core` ships with no optional feature logic in the default bundle |
| G-02 | Features activate only when explicitly registered — no side-effect imports |
| G-03 | Each feature is a separate npm package with its own entry point |
| G-04 | `GridApi` grows via module augmentation when feature packages are installed |
| G-05 | Modules declare dependencies; registry resolves install order |
| G-06 | Third parties can author external modules using the same `GridModule` contract |
| G-07 | `GridPlugin` supports UI cross-cutting concerns (context menu, export, overlays) |

## 3. Non-Goals

| Item | Rationale |
|------|-----------|
| AG Grid–style massive DI container | Simpler `GridContext` + hooks per ARCHITECTURE.md |
| Runtime dynamic `import()` of modules without dev opt-in | Explicit registration required |
| Modules that patch renderer internals | Modules interact via store, api, pipeline only |
| Default inclusion of sort/filter in core | Violates bundle budget NFR-B-04 |

## 4. User Stories

| ID | As a… | I want… | So that… |
|----|-------|---------|----------|
| US-01 | App developer | `import { SortModule } from '@ol-grid/sort'` and register it | I only pay bundle cost for sort |
| US-02 | App developer | clear error when calling `setSortModel` without SortModule | I fix config quickly |
| US-03 | Platform engineer | `sideEffects: false` on all feature packages | bundlers tree-shake unused code |
| US-04 | Extension author | to publish `@my-org/grid-export` as a `GridModule` | I can add features without forking core |
| US-05 | TypeScript user | `GridApi` to include `setFilterModel` after installing filter types | I get compile-time safety |

## 5. Functional Requirements

### 5.1 ModuleRegistry

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| MOD-REG-01 | `ModuleRegistry.register(...modules: GridModule[]): void` registers one or more modules | Must | T1 |
| MOD-REG-02 | `ModuleRegistry.registerModules(modules)` alias for AG Grid familiarity | Should | T1 |
| MOD-REG-03 | `ModuleRegistry.has(moduleName): boolean` | Must | T1 |
| MOD-REG-04 | `ModuleRegistry.getModule(moduleName): GridModule \| undefined` | Should | T2 |
| MOD-REG-05 | Global registration applies to all subsequently created grids | Must | T1 |
| MOD-REG-06 | Per-grid `modules: GridModule[]` in `GridOptions` scopes registration to instance | Must | T1 |
| MOD-REG-07 | Per-grid modules override/extend global registry for that instance | Must | T1 |
| MOD-REG-08 | Duplicate registration of same module name is idempotent (warn in dev) | Must | T1 |
| MOD-REG-09 | Registry MUST resolve `dependencies` and register in topological order | Must | T1 |
| MOD-REG-10 | Circular dependency MUST throw at registration time with clear message | Must | T1 |
| MOD-REG-11 | `ModuleRegistry.reset()` for test isolation | Must | T1 |

### 5.2 GridModule contract

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| MOD-GM-01 | Every module MUST export `name: string` (unique, e.g. `'SortModule'`) | Must | T1 |
| MOD-GM-02 | Every module MUST export `version: string` (semver) | Must | T1 |
| MOD-GM-03 | Optional `dependencies?: string[]` listing other module names | Must | T1 |
| MOD-GM-04 | `onRegister?(registry: ModuleRegistry): void` — module-level setup | Should | T2 |
| MOD-GM-05 | `onGridCreate?(ctx: GridContext): void` — per-grid init | Must | T1 |
| MOD-GM-06 | `onGridDestroy?(ctx: GridContext): void` — per-grid cleanup | Must | T1 |
| MOD-GM-07 | `storeSlices?: Record<string, unknown>` — initial state keys | Must | T1 |
| MOD-GM-08 | `reducers?: Record<string, Reducer>` — named action handlers | Must | T1 |
| MOD-GM-09 | `rowModelStages?: RowModelStage[]` — pipeline transforms | Must | T1 |
| MOD-GM-10 | `apiExtensions?: Record<string, Function>` — methods bound to GridApi | Must | T1 |
| MOD-GM-11 | `eventTypes?: string[]` — events registered on EventBus | Must | T1 |
| MOD-GM-12 | `validators?: ModuleValidator[]` — config validation on grid create | Should | T2 |

### 5.3 GridContext (passed to module hooks)

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| MOD-CTX-01 | `getStore(): GridStore` | Must | T1 |
| MOD-CTX-02 | `getApi(): GridApi` | Must | T1 |
| MOD-CTX-03 | `getOptions(): GridOptions` (readonly snapshot) | Must | T1 |
| MOD-CTX-04 | `getRenderer(): RendererAdapter \| null` | Must | T1 |
| MOD-CTX-05 | `registerCellRenderer(name, renderer)` | Must | T1 |
| MOD-CTX-06 | `registerCellEditor(name, editor)` | Must | T2 |
| MOD-CTX-07 | `registerFilter(name, filter)` | Must | T2 |
| MOD-CTX-08 | `dispatch(action)` / `on(event, handler)` shortcuts | Must | T1 |

### 5.4 Row model pipeline integration

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| MOD-PL-01 | Core provides `coreRowModel` stage always | Must | T1 |
| MOD-PL-02 | Modules register stages with `name` and `order` (lower runs first) | Must | T1 |
| MOD-PL-03 | Default order: filter (100) → sort (200) → group (300) → paginate (400) | Must | T1 |
| MOD-PL-04 | Stage receives `(rows, ctx)` and returns transformed rows | Must | T1 |
| MOD-PL-05 | Pipeline re-runs only affected stages on incremental updates (T2 optimization) | Should | T2 |
| MOD-PL-06 | Missing dependency stage MUST throw at grid create | Must | T1 |

### 5.5 GridPlugin & PluginHost

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| MOD-PLG-01 | `GridPlugin` has `id: string` and `install(host: PluginHost): void` | Must | T2 |
| MOD-PLG-02 | `plugins?: GridPlugin[]` on `GridOptions` | Must | T2 |
| MOD-PLG-03 | `PluginHost.getStore()`, `getApi()`, `getRenderer()` | Must | T2 |
| MOD-PLG-04 | `PluginHost.on(event, handler): Unsubscribe` | Must | T2 |
| MOD-PLG-05 | `PluginHost.registerOverlay(id, renderFn)` for custom UI layers | Should | T3 |
| MOD-PLG-06 | `PluginHost.addContextMenuItem(item)` — see context-menu doc | Must | T3 |
| MOD-PLG-07 | Plugins install after modules, before first render | Must | T2 |
| MOD-PLG-08 | Plugin `install` MUST NOT be async | Must | T2 |

### 5.6 TypeScript module augmentation

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| MOD-TS-01 | Each feature package ships `augmentation.d.ts` augmenting `@ol-grid/core` `GridApi` | Must | T1 |
| MOD-TS-02 | Feature packages export `SortModuleOptions`, `FilterModuleOptions`, etc. | Must | T2 |
| MOD-TS-03 | `GridOptions` augmentation for module-specific options where needed | Should | T2 |
| MOD-TS-04 | Type tests in CI verify augmentation composes across modules | Must | T2 |

### 5.7 Tree-shaking & packaging

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| MOD-PKG-01 | Each feature is `@ol-grid/<feature>` separate package | Must | T1 |
| MOD-PKG-02 | `package.json` `sideEffects: false` (except CSS) | Must | T1 |
| MOD-PKG-03 | ESM-first dual CJS build; named exports only | Must | T1 |
| MOD-PKG-04 | Separate `exports` entry per package; no barrel re-export of all features from core | Must | T1 |
| MOD-PKG-05 | Importing `@ol-grid/sort` without `register()` MUST NOT add sort logic to bundle beyond module definition | Must | T1 |
| MOD-PKG-06 | CI runs `publint` + `@arethetypeswrong/cli` on all packages | Must | T1 |
| MOD-PKG-07 | Bundle analyzer gate in CI for reference app per tier | Must | T2 |

## 6. Official Feature Packages

| Package | Module name | Tier | Dependencies | Extends GridApi (examples) |
|---------|-------------|------|--------------|---------------------------|
| `@ol-grid/sort` | `SortModule` | T1 | — | `setSortModel`, `getSortModel` |
| `@ol-grid/filter` | `FilterModule` | T2 | — | `setFilterModel`, `getFilterModel`, `setQuickFilter` |
| `@ol-grid/pagination` | `PaginationModule` | T2 | — | `paginationGoToPage`, `getPaginationPage` |
| `@ol-grid/editing` | `EditingModule` | T2 | — | `startEditingCell`, `stopEditing` |
| `@ol-grid/grouping` | `GroupingModule` | T3 | `SortModule` | `setRowGroupColumns`, `setPivotMode` |
| `@ol-grid/clipboard` | `ClipboardModule` | T3 | — | `copyToClipboard`, `pasteFromClipboard` |
| `@ol-grid/excel-export` | `ExcelExportModule` | T3 | — | `exportDataAsExcel` |
| `@ol-grid/infinite-row-model` | `InfiniteRowModelModule` | T2 | — | datasource APIs |
| `@ol-grid/server-side-row-model` | `ServerSideRowModelModule` | T3 | `GroupingModule`? | SSRM refresh APIs |
| `@ol-grid/range-selection` | `RangeSelectionModule` | T3 | — | `getCellRanges`, `addCellRange` |
| `@ol-grid/debug` | `DebugModule` | T1 | — | `getDebugCategories`, `setDebug` |
| `@ol-grid/context-menu` | `ContextMenuModule` | T3 | — | `showContextMenu` |
| `@ol-grid/tool-panels` | `ToolPanelsModule` | T3 | `FilterModule` | sideBar APIs |

### 6.1 Example module definition

```typescript
// @ol-grid/sort
export const SortModule: GridModule = {
  name: 'SortModule',
  version: '1.0.0',

  storeSlices: {
    sorting: { model: [], multiSort: false },
  },

  reducers: {
    'sort/setModel': sortModelReducer,
    'sort/toggleColumn': toggleSortReducer,
  },

  rowModelStages: [
    { name: 'sortedRowModel', order: 200, transform: sortedRowModel },
  ],

  apiExtensions: {
    setSortModel(api, model: SortModel) { /* ... */ },
    getSortModel(api): SortModel { /* ... */ },
  },

  eventTypes: ['sortChanged'],

  onGridCreate(ctx) {
    // wire header click → dispatch sort actions
  },
};

// Consumer
import { SortModule } from '@ol-grid/sort';
import { ModuleRegistry, createGrid } from '@ol-grid/core';

ModuleRegistry.register(SortModule);

const grid = createGrid(host, {
  modules: [SortModule], // optional if globally registered
  columnDefs,
  rowData,
});
```

### 6.2 Module augmentation example

```typescript
// @ol-grid/sort/augmentation.d.ts
declare module '@ol-grid/core' {
  interface GridApi<TData = unknown> {
    setSortModel(model: SortModel): void;
    getSortModel(): SortModel;
  }
}
```

## 7. Behavior & Edge Cases

| Scenario | Expected behavior |
|----------|-------------------|
| Call `api.setSortModel` without SortModule | Throw `OlGridError: SortModule is not registered. Import and register SortModule from '@ol-grid/sort'.` |
| Register GroupingModule without SortModule | Auto-register SortModule if present in registry; else throw dependency error |
| Register same module globally and per-grid | Per-grid instance gets one install; no double reducer registration |
| Destroy grid | All `onGridDestroy` hooks run in reverse registration order |
| HMR in dev (Vite) | `ModuleRegistry.reset()` + re-register; grid remounts cleanly |
| Tree-shake test: app imports only core + sort | Bundle MUST NOT contain filter strings, set filter reducers, etc. |
| External module uses private core APIs | Unsupported; only `GridModule` contract is semver-stable |

## 8. Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-MOD-01 | Module registration time | < 1 ms per module |
| NFR-MOD-02 | `onGridCreate` total for all modules | < 5 ms |
| NFR-MOD-03 | `@ol-grid/sort` package gzip size | ≤ 8 KB |
| NFR-MOD-04 | `@ol-grid/filter` package gzip size | ≤ 15 KB |
| NFR-MOD-05 | Public `GridModule` interface stability | Semver on `@ol-grid/core` |
| NFR-MOD-06 | Third-party module docs | Published in "Authoring modules" guide T2 |

## 9. Dependencies

| Dependency | Type | Notes |
|------------|------|-------|
| `@ol-grid/core` | Required | ModuleRegistry, GridStore, pipeline |
| `grid-api-and-events.md` | Related | GridApi extension contract |
| `performance-and-bundle.md` | Related | Bundle budgets per package |
| `context-menu-and-tool-panels.md` | Related | ContextMenuModule, ToolPanelsModule |

## 10. Acceptance Criteria

- [ ] Reference app with core-only bundle contains no sort/filter code (static analysis)
- [ ] Reference app with `SortModule` registered can sort; without registration throws helpful error
- [ ] `GroupingModule` fails fast without required dependencies
- [ ] TypeScript: `GridApi` includes `setSortModel` only when `@ol-grid/sort` in tsconfig references
- [ ] `onGridDestroy` cleans all module listeners — zero leaks in integration test
- [ ] `publint` + `attw` pass for core and all Tier 1–2 feature packages
- [ ] External sample module (`examples/custom-module`) demonstrates third-party extension

## 11. Test Plan

| Test type | Coverage |
|-----------|----------|
| Unit | Topological sort of dependencies, circular dep detection |
| Unit | Reducer registration, pipeline stage ordering |
| Unit | apiExtensions binding and `this` context |
| Integration | Register module → API method works → destroy → no leaks |
| Bundle | esbuild analyze: core-only vs core+sort size gates |
| Type | `tstyche` augmentation composition |

## 12. Migration Notes (AG Grid)

| AG Grid API | ol-grid equivalent | Breaking? |
|-------------|-------------------|-----------|
| `ModuleRegistry.registerModules([...])` | `ModuleRegistry.register(...)` | Alias provided |
| `@ag-grid-community/react` all-in-one | Explicit per-feature imports | Yes — intentional |
| `ag-grid-enterprise` license key | Not required for MIT modules | N/A |
| `rowModelType: 'serverSide'` + enterprise | `ServerSideRowModelModule` (T3, MIT) | No license |

## 13. Open Questions

| # | Question | Options | Decision |
|---|----------|---------|----------|
| OQ-1 | Global `ModuleRegistry` vs instance-only | Both (current spec) / instance-only | Both |
| OQ-2 | Pre-built `OlGridAllCommunityModule` bundle for quick start | Yes / no | Optional convenience package T2 |
| OQ-3 | Module version mismatch at runtime | Warn / throw | Warn in dev, throw if major mismatch |

## 14. References

- [REQUIREMENTS.md](../REQUIREMENTS.md) §6.6, NFR-B-01–B-07, NFR-D-02
- [ARCHITECTURE.md](../ARCHITECTURE.md) §3.8, §5.2–5.3, §8.2, §9
- [performance-and-bundle.md](./performance-and-bundle.md)
- [debug-mode.md](./debug-mode.md)
- [AG Grid Modules](https://www.ag-grid.com/javascript-data-grid/modules/)

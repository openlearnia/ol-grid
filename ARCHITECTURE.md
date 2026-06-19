# ol-grid — Technical Architecture Specification

> Framework-agnostic data grid library (AG Grid alternative).  
> Core engine is pure TypeScript with zero runtime dependencies; thin adapters for React, Vue, Angular, Svelte, and vanilla JS.

---

## Table of Contents

1. [Design Goals & Positioning](#1-design-goals--positioning)
2. [Layered Architecture](#2-layered-architecture)
3. [Core Module Breakdown](#3-core-module-breakdown)
4. [Framework Integration Patterns](#4-framework-integration-patterns)
5. [Build & Distribution](#5-build--distribution)
6. [Rendering Strategy](#6-rendering-strategy)
7. [Testing Strategy](#7-testing-strategy)
8. [Reference Implementation Analysis](#8-reference-implementation-analysis)
9. [Recommended Package Dependency Graph](#9-recommended-package-dependency-graph)
10. [Phased Delivery Roadmap](#10-phased-delivery-roadmap)

---

## 1. Design Goals & Positioning

### What ol-grid is

A **headless-core + optional batteries-included rendering** data grid. Unlike TanStack Table (logic-only, user owns all markup), ol-grid ships a default high-performance DOM renderer while keeping the engine fully framework-agnostic.

### Positioning vs. alternatives

| Library | Model | ol-grid takeaway |
|---------|-------|------------------|
| **TanStack Table + Virtual** | Pure headless; user renders every cell | Adopt core-adapter pattern, feature plugins, row-model pipeline |
| **AG Grid** | Full grid, DI + module registry, zero-dep core | Adopt module system, controller/view split, imperative API |
| **Glide Data Grid** | React-only, canvas rendering | Optional `@ol-grid/canvas` renderer for 1M+ row scenarios |
| **RevoGrid** | Web Component (Stencil), virtual viewports | Adopt viewport coordination, plugin provider access, `frameSize` buffer |
| **Radix** | Headless primitives, composition | Adopt controlled/uncontrolled state, event composition, zero default styles |

### Non-negotiable constraints

1. **`@ol-grid/core` has zero third-party runtime dependencies** (match AG Grid discipline).
2. **One core instance, many adapters** — adapters are <200 LOC each; all logic lives in core.
3. **Tree-shakeable features** — sorting, filtering, clipboard, etc. are opt-in modules.
4. **Accessible by default** — ARIA grid pattern, keyboard nav, focus management in core (not delegated to adapters).
5. **Imperative + declarative APIs** — both `gridApi.setSortModel()` and React `sorting` prop work.

---

## 2. Layered Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Application Layer                                                       │
│  React / Vue / Angular / Svelte / Vanilla / Web Components              │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ adapter boundary (reactivity + lifecycle)
┌───────────────────────────────▼─────────────────────────────────────────┐
│  Framework Adapters (@ol-grid/react, @ol-grid/vue, …)                   │
│  • Subscribe to GridStore changes                                        │
│  • Mount/unmount renderer host                                           │
│  • Bridge framework components → CellRendererHost                        │
│  • Expose hooks/composables/services + ref imperative API                │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────────┐
│  Rendering Layer (@ol-grid/dom-renderer | @ol-grid/canvas-renderer)    │
│  • Viewport scroll containers                                            │
│  • Cell/row/header DOM or canvas paint                                   │
│  • CellRendererHost (framework component mounting)                       │
│  • Theme token application                                               │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ render commands + layout rects
┌───────────────────────────────▼─────────────────────────────────────────┐
│  Core Engine (@ol-grid/core)                                             │
│  ┌─────────────┐ ┌──────────────┐ ┌────────────────┐ ┌───────────────┐ │
│  │ GridStore   │ │ ColumnModel  │ │ RowModel       │ │ Virtualizer   │ │
│  │ (state)     │ │ + ColumnApi  │ │ (CS/Inf/SS)    │ │ (2D ranges)   │ │
│  └─────────────┘ └──────────────┘ └────────────────┘ └───────────────┘ │
│  ┌─────────────┐ ┌──────────────┐ ┌────────────────┐ ┌───────────────┐ │
│  │ Selection   │ │ Editing      │ │ Clipboard      │ │ EventBus      │ │
│  │ Manager     │ │ Controller   │ │ Service        │ │ + PluginHost  │ │
│  └─────────────┘ └──────────────┘ └────────────────┘ └───────────────┘ │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────────┐
│  Feature Modules (@ol-grid/sort, @ol-grid/filter, …)                   │
│  Registered via ModuleRegistry; extend store slices + row-model stages   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Layer responsibilities

| Layer | Owns | Does NOT own |
|-------|------|--------------|
| **Core** | State transitions, data transforms, virtual range math, a11y state machine, events, imperative API | DOM nodes, framework reactivity, CSS |
| **Rendering** | DOM/canvas output, scroll containers, cell mount points, paint scheduling | Business logic, sort/filter algorithms |
| **Adapters** | Reactivity bridge, lifecycle, framework component portals | Grid logic duplication |
| **Feature modules** | Optional algorithms (sort fns, filter parsers) | Core types or renderer internals |

### Data flow (read path)

```
User scroll event
  → Renderer captures scroll offset
  → Virtualizer.computeVisibleRange(offset, viewportSize, overscan)
  → RowModel.getRowsInRange(startRow, endRow)  // may hit cache or server
  → ColumnModel.getVisibleColumns(startCol, endCol)
  → Renderer.diff(previousRange, newRange) → recycle DOM nodes / repaint canvas cells
  → CellRendererHost.render(cellContext) per changed cell
```

### Data flow (write path)

```
User edits cell / clicks sort header
  → Renderer dispatches UI event
  → Core EventBus → relevant Controller (SortController, EditController)
  → GridStore.dispatch(action) → pure reducer updates state slice
  → Store notifies subscribers (adapters re-render; renderer receives layout diff)
  → RowModel pipeline re-runs affected stages
```

---

## 3. Core Module Breakdown

### 3.1 GridStore / State Design

**Pattern:** Centralized immutable-ish store with slice reducers + transactional batching (inspired by TanStack Store + AG Grid `GridOptionsService`).

```typescript
// Conceptual state shape
interface GridState {
  // Identity
  gridId: string;

  // Data
  rowDataVersion: number;          // bump on full data replace
  rowCount: number;                // total rows (may differ from loaded in SS/inf)

  // Column state
  columns: ColumnState[];          // order, width, pinned, visible, sort, filter
  columnGroupState: ColumnGroupState[];

  // Viewport
  scrollTop: number;
  scrollLeft: number;
  viewportWidth: number;
  viewportHeight: number;

  // Feature slices (opt-in modules register these)
  sorting?: SortingState;
  filtering?: FilteringState;
  pagination?: PaginationState;
  selection?: SelectionState;
  editing?: EditingState;
  expansion?: ExpansionState;

  // Row model metadata
  rowModelType: 'clientSide' | 'infinite' | 'serverSide';
  rowModelMeta: RowModelMeta;      // block cache keys, loading flags, etc.
}
```

**Store API:**

```typescript
interface GridStore {
  getState(): Readonly<GridState>;
  subscribe(listener: StoreListener): Unsubscribe;
  dispatch(action: GridAction): void;
  batch(fn: () => void): void;           // coalesce notifications
  select<T>(selector: StateSelector<T>): T;
}
```

**Design rules:**

- State slices are **plain objects** (serializable for SSR, persistence, time-travel debug).
- **Controlled mode:** adapter passes external state slice; store becomes a controlled mirror.
- **Uncontrolled mode:** store owns state; adapter reads via subscription.
- All mutations go through `dispatch` — no direct state mutation from renderers.
- Selectors are memoized (reference equality on slice boundaries).

### 3.2 Column Model & Column API

**ColumnDef** (declarative, framework-agnostic):

```typescript
interface ColumnDef<TData = unknown, TValue = unknown> {
  id?: string;
  field?: keyof TData & string;
  headerName?: string;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  flex?: number;
  pinned?: 'left' | 'right' | null;
  sortable?: boolean;
  filterable?: boolean;
  editable?: boolean | ((params: EditableCallbackParams) => boolean);
  hide?: boolean;

  // Value pipeline
  valueGetter?: (params: ValueGetterParams<TData>) => TValue;
  valueSetter?: (params: ValueSetterParams<TData, TValue>) => boolean;
  valueFormatter?: (params: ValueFormatterParams<TData, TValue>) => string;

  // Rendering (resolved by renderer + adapter)
  cellRenderer?: string | CellRendererDef;
  cellEditor?: string | CellEditorDef;
  headerRenderer?: string | HeaderRendererDef;

  // Grouping / aggregation
  rowGroup?: boolean;
  aggFunc?: AggFunc | string;

  // Metadata
  meta?: Record<string, unknown>;
}
```

**ColumnModel** responsibilities:

- Flatten column groups → leaf columns with stable `colId`.
- Compute `visibleColumns`, `pinnedLeftColumns`, `pinnedRightColumns`, `centerColumns`.
- Maintain width model: fixed, flex distribution, auto-size measurement cache.
- Expose `ColumnApi`: `setColumnWidth`, `moveColumn`, `setColumnVisible`, `autoSizeColumn`.
- Fire `onColumnResized`, `onColumnMoved`, `onDisplayedColumnsChanged`.

**Column state vs. column defs:** Defs are immutable config; `ColumnState` is runtime (width, sort index, filter model). `applyColumnState()` merges programmatic updates.

### 3.3 Row Model

Three row models, registered exclusively (one active per grid instance):

#### Client-Side Row Model (CSRM) — default

```
rawData[] → (optional filter) → (optional sort) → (optional group) → RowNode[]
```

- `RowNode` tree for grouping with `parent/children/level/expanded`.
- All rows resident in memory; virtualizer only renders visible slice.
- Best for <100k rows with reasonable column count.

#### Infinite Row Model

```
scroll position → calculate block index → fetch block(startRow, endRow) → merge into block cache
```

```typescript
interface InfiniteRowModelConfig {
  blockSize: number;           // default 100
  maxBlocksInCache: number;    // LRU eviction
  datasource: {
    getRows(params: { startRow: number; endRow: number; sortModel: SortModel; filterModel: FilterModel }): Promise<{ rows: any[]; rowCount?: number }>;
  };
}
```

- Row count may be unknown (`rowCount: undefined` → "loading" scrollbar).
- Deduplicate in-flight block requests; stale response discard via request sequence token.

#### Server-Side Row Model (SSRM)

```
group expand → server group keys → lazy child rows → aggregation at group level
```

- Hierarchical group keys (`['USA', 'California']`).
- Server returns group rows + leaf rows + `rowCount` per level.
- Client maintains **sparse row store** keyed by `rowId`.
- Supports server-side sort, filter, pivot (enterprise-tier features).

**Shared RowNode interface:**

```typescript
interface RowNode<TData = unknown> {
  id: string;
  data: TData | undefined;       // undefined while loading
  rowIndex: number;              // display index (changes with sort/filter)
  level: number;
  parent?: RowNode;
  childrenAfterGroup?: RowNode[];
  expanded: boolean;
  selected: boolean;
  group: boolean;
  aggData?: Record<string, unknown>;
  stub?: boolean;                // loading placeholder
}
```

**Row model pipeline (TanStack-inspired):**

Features register **row model stages** as composable transforms:

```typescript
const pipeline = createRowModelPipeline([
  coreRowModel,        // always
  filteredRowModel,    // @ol-grid/filter
  sortedRowModel,      // @ol-grid/sort
  groupedRowModel,     // @ol-grid/grouping
  paginatedRowModel,   // @ol-grid/pagination (non-virtual mode)
]);
```

### 3.4 Virtualization Engine

**Owned by core; rendering layer consumes output.**

```typescript
interface VirtualizerConfig {
  rowCount: number;
  columnCount: number;
  rowHeight: number | ((index: number) => number);
  columnWidth: number | ((index: number) => number);
  overscanRowCount: number;      // default 3 (RevoGrid calls this frameSize)
  overscanColumnCount: number;
  scrollTop: number;
  scrollLeft: number;
  viewportWidth: number;
  viewportHeight: number;
  estimatedRowHeight?: number;    // for dynamic rows
  estimatedColumnWidth?: number;
}

interface VirtualRange {
  rowStart: number;
  rowEnd: number;
  colStart: number;
  colEnd: number;
  rowOffsets: Float64Array;       // prefix sum for positioning
  colOffsets: Float64Array;
  totalHeight: number;
  totalWidth: number;
}
```

**Algorithms:**

- Fixed size: O(1) index lookup via division.
- Dynamic size: prefix-sum array + binary search (TanStack Virtual pattern).
- Measurement cache: renderer reports actual sizes → core updates cache → range recalc.
- **Pinned regions:** three independent vertical viewports (left pin, center, right pin) sharing scrollTop; horizontal scroll only on center+right. RevoGrid's multi-viewport coordination is the reference.
- `scrollToRow` / `scrollToColumn` / `ensureIndexVisible` as imperative API.

**Decouple from renderer:** Core emits `VirtualRange` + `CellPosition[]`; renderer decides DOM recycling vs. canvas repaint.

### 3.5 Selection

```typescript
interface SelectionState {
  mode: 'singleRow' | 'multiRow' | 'singleCell' | 'range';
  selectedRowIds: Set<string>;
  selectedRanges: CellRange[];     // for range selection
  focusedCell: CellPosition | null;
  anchorCell: CellPosition | null; // range selection anchor
}
```

**SelectionManager:**

- Row click / Ctrl+click / Shift+click (range from anchor).
- Cell range selection via drag (mouse) and Shift+arrow (keyboard).
- `selectAll` / `deselectAll` with filtered-row awareness.
- Emits `selectionChanged` with diff (added/removed) for incremental renderer updates.
- Checkbox column is a column type, not selection logic itself.

### 3.6 Editing

**Edit state machine per cell:**

```
idle → editing (on double-click, Enter, F2, or typed char)
editing → committed (Enter, Tab) | cancelled (Escape)
committed → idle (+ valueSetter + validation)
```

```typescript
interface EditingState {
  activeCell: CellPosition | null;
  editValue: unknown;
  editorKey: string | null;      // resolved editor component
}
```

**EditController:**

- Single active editor at a time (AG Grid model).
- Tab/Shift+Tab moves to next editable cell.
- Framework adapters mount editor component in `EditorHost` overlay positioned over cell rect.
- Validation: `valueParser` → `valueSetter` → `onCellValueChanged` event.
- Full-row edit mode: optional batch commit on Save.

### 3.7 Clipboard

**ClipboardService** (feature module `@ol-grid/clipboard`):

- Copy: `Ctrl+C` → serialize selected cells to TSV/HTML (Excel-compatible).
- Paste: `Ctrl+V` → parse TSV → `valueSetter` per cell in range.
- Emit `beforeCopy` / `beforePaste` for transformation.
- Does not use `document.execCommand` — uses Clipboard API with fallback.
- Core logic only; no DOM dependency.

### 3.8 Plugin / Extension System

**Hybrid of AG Grid ModuleRegistry + TanStack feature plugins:**

```typescript
interface GridModule {
  name: string;
  version: string;
  dependencies?: string[];

  // Lifecycle
  onRegister?(registry: ModuleRegistry): void;
  onGridCreate?(ctx: GridContext): void;
  onGridDestroy?(ctx: GridContext): void;

  // Extensions
  storeSlices?: Record<string, unknown>;     // initial state
  reducers?: Record<string, Reducer>;
  rowModelStages?: RowModelStage[];
  apiExtensions?: Record<string, Function>;  // gridApi.setQuickFilter, etc.
  eventTypes?: string[];
}

// Registration
ModuleRegistry.register(SortModule, FilterModule, ClipboardModule);
```

**PluginHost** (for advanced extensions):

```typescript
interface GridPlugin {
  id: string;
  install(host: PluginHost): void;
}

interface PluginHost {
  getStore(): GridStore;
  getApi(): GridApi;
  getRenderer(): RendererAdapter;
  on(event: string, handler: Function): Unsubscribe;
  registerCellRenderer(name: string, renderer: CellRenderer): void;
}
```

RevoGrid's "full access to grid providers" model — plugins can hook viewport scroll, inject overlay nodes, add context menu items.

**Extension points summary:**

| Extension point | Use case |
|-----------------|----------|
| `CellRenderer` | Custom cell display |
| `CellEditor` | Custom edit UI |
| `Filter` | Custom filter UI + logic |
| `RowModel` | Custom data source |
| `GridPlugin` | Cross-cutting (export, context menu) |
| `ThemePlugin` | Design token overrides |

---

## 4. Framework Integration Patterns

### 4.1 Shared Core Instance Pattern

All frameworks share **one `GridEngine` class** in `@ol-grid/core`:

```typescript
class GridEngine {
  constructor(options: GridOptions);
  getStore(): GridStore;
  getApi(): GridApi;
  mount(host: HTMLElement, renderer: RendererAdapter): void;
  unmount(): void;
  destroy(): void;
}
```

Adapters create `GridEngine`, wire reactivity, call `mount()` with framework-appropriate renderer.

### 4.2 React (`@ol-grid/react`)

**Dual API: hooks + ref imperative**

```tsx
// Declarative
function MyGrid() {
  const gridRef = useRef<GridApi>(null);
  const { grid, props } = useOlGrid({
    columnDefs,
    rowData,
    onGridReady: (e) => e.api.sizeColumnsToFit(),
  });

  return <OlGrid ref={gridRef} {...props} />;
}

// Imperative
gridRef.current?.setSortModel([{ colId: 'name', sort: 'asc' }]);
```

**Implementation:**

- `useOlGrid(options)` → creates stable `GridEngine` ref, subscribes to store via `useSyncExternalStore` (React 18+).
- `OlGrid` component → renders `<div ref={hostRef} className="ol-grid" />`; on mount calls `engine.mount(host, ReactRendererAdapter)`.
- **CellRendererHost:** React 18 `createRoot` per cell is too heavy. Use **portal pool**: maintain `Map<cellId, ReactPortal>`; only mount portals for visible cells. Unmount on virtual range exit.
- Context: `GridApiContext` + `GridOptionsContext` for cell renderers/editors.
- `"use client"` directive preserved in build output for RSC compatibility.

**Do NOT:** duplicate state in React `useState` — store is source of truth.

### 4.3 Vue (`@ol-grid/vue`)

```typescript
// composable
const { gridApi, OlGrid } = useOlGrid({ columnDefs, rowData });

// component
<OlGrid :column-defs="columnDefs" :row-data="rowData" @grid-ready="onReady" />
```

- `useOlGrid` → `shallowRef<GridEngine>` + `watchEffect` for options diffing.
- Store subscription via `watch(() => store.getState(), ...)` with `flush: 'sync'` for scroll.
- Cell renderers: Vue `createApp` or `h()` + `Teleport` per visible cell (pooled).
- Provide/inject: `gridApi` key for child components.

### 4.4 Angular (`@ol-grid/angular`)

```typescript
@Component({
  selector: 'ol-grid',
  template: '<div #host class="ol-grid-host"></div>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OlGridComponent implements OnInit, OnDestroy {
  @ViewChild('host') host!: ElementRef;
  @Output() gridReady = new EventEmitter<GridReadyEvent>();
  // ...
}
```

- `GridEngineService` (provided per component instance) — not singleton.
- Store changes → `markForCheck()` or Angular Signals (`computed` from store selector).
- Cell renderers: `ViewContainerRef.createComponent()` dynamic component factory.
- `gridApi` exposed via `@Output() gridReady` and component getter.

### 4.5 Svelte (`@ol-grid/svelte`)

```svelte
<OlGrid {columnDefs} {rowData} on:gridReady={handleReady} bind:api />
```

- `createGridStore()` returns Svelte `writable`/`readable` derived from core store.
- `onMount` → `engine.mount()`; `onDestroy` → `engine.destroy()`.
- Cell renderers: `new Component({ target: cellEl, props })` — Svelte 4 pattern; Svelte 5 use `mount()`.
- `bind:api` for imperative access.

### 4.6 Vanilla (`@ol-grid/vanilla` + `@ol-grid/web-component`)

**Class API:**

```typescript
const grid = createGrid(document.getElementById('grid')!, {
  columnDefs,
  rowData,
});
grid.api.setSortModel([...]);
grid.destroy();
```

**Web Component (optional, for maximum portability — RevoGrid model):**

```html
<ol-grid id="myGrid"></ol-grid>
<script>
  const grid = document.getElementById('myGrid');
  grid.columnDefs = [...];
  grid.rowData = [...];
</script>
```

- Web Component wraps `GridEngine`; observed attributes map to options.
- Shadow DOM **off by default** (theming via CSS variables on host).
- Framework adapters can be thin wrappers over the Web Component if desired (reduces adapter maintenance).

### 4.7 Renderer Adapter Interface

```typescript
interface RendererAdapter {
  readonly type: 'dom' | 'canvas';

  mount(host: HTMLElement, engine: GridEngine): void;
  unmount(): void;

  // Called by engine on state/range change
  renderFrame(frame: RenderFrame): void;

  // Measurement feedback
  reportRowHeight(index: number, height: number): void;
  reportColumnWidth(index: number, width: number): void;

  // Framework component hosting
  getCellHost(position: CellPosition): HTMLElement;
  getEditorHost(): HTMLElement;
}
```

---

## 5. Build & Distribution

### 5.1 Monorepo Structure

```
ol-grid/
├── packages/
│   ├── core/                    # @ol-grid/core
│   ├── dom-renderer/            # @ol-grid/dom-renderer
│   ├── canvas-renderer/         # @ol-grid/canvas-renderer (phase 2)
│   ├── react/                   # @ol-grid/react
│   ├── vue/                     # @ol-grid/vue
│   ├── angular/                 # @ol-grid/angular
│   ├── svelte/                  # @ol-grid/svelte
│   ├── vanilla/                 # @ol-grid/vanilla
│   ├── web-component/           # @ol-grid/web-component
│   ├── sort/                    # @ol-grid/sort
│   ├── filter/                  # @ol-grid/filter
│   ├── clipboard/               # @ol-grid/clipboard
│   ├── grouping/                # @ol-grid/grouping
│   └── themes/                  # @ol-grid/themes (CSS + tokens)
├── examples/
│   ├── react-basic/
│   ├── vue-basic/
│   ├── angular-basic/
│   └── vanilla/
├── docs/                        # VitePress or Astro
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

**Tooling:** pnpm workspaces + Turborepo + tsdown + Changesets.

### 5.2 Package Boundaries

| Package | Depends on | Peer deps |
|---------|-----------|-----------|
| `@ol-grid/core` | none | — |
| `@ol-grid/dom-renderer` | core | — |
| `@ol-grid/react` | core, dom-renderer | react >=18 |
| `@ol-grid/vue` | core, dom-renderer | vue >=3.4 |
| `@ol-grid/angular` | core, dom-renderer | @angular/core >=17 |
| `@ol-grid/svelte` | core, dom-renderer | svelte >=4 |
| `@ol-grid/sort` | core | — |
| Feature modules | core | — |

### 5.3 Tree-shaking & Module Format

**Per-package `package.json`:**

```json
{
  "name": "@ol-grid/core",
  "type": "module",
  "sideEffects": false,
  "exports": {
    ".": {
      "import": { "types": "./dist/index.d.mts", "default": "./dist/index.mjs" },
      "require": { "types": "./dist/index.d.cts", "default": "./dist/index.cjs" }
    },
    "./sort": {
      "import": { "types": "./dist/sort.d.mts", "default": "./dist/sort.mjs" }
    }
  }
}
```

**Rules:**

- ESM-first; dual CJS for legacy consumers.
- **Named exports only** — no default exports.
- Feature modules are separate entry points.
- `sideEffects: false` on all packages; CSS packages excepted (`sideEffects: ["*.css"]`).
- Validate with `publint` + `@arethetypeswrong/cli` in CI.

### 5.4 TypeScript Strategy

- **Strict mode** everywhere (`strict: true`, `noUncheckedIndexedAccess: true`).
- **Project references** — core builds first; adapters reference core `.d.ts`.
- **Generics for row data type:**

```typescript
function createGrid<TData>(options: GridOptions<TData>): GridEngine<TData>;
```

- **Module augmentation** for feature API surface:

```typescript
// @ol-grid/sort augments GridApi
declare module '@ol-grid/core' {
  interface GridApi {
    setSortModel(model: SortModel): void;
    getSortModel(): SortModel;
  }
}
```

- **Type tests** via `expect-type` or `tstyche` in CI.
- `moduleResolution: "Bundler"`, `target: ES2022`.

---

## 6. Rendering Strategy

### 6.1 DOM Virtualization (default — `@ol-grid/dom-renderer`)

**When:** General purpose, editable grids, rich cell components, accessibility priority.

**Technique:**

- Three viewport containers (pinned-left, center, pinned-right) × (header, body, footer).
- **Row recycling:** maintain pool of `<div class="ol-row">` elements; on range change, reassign `rowIndex` + data bindings instead of create/destroy.
- **Cell recycling:** child `<div class="ol-cell">` per column within row; update content via renderer.
- `transform: translateY()` for row positioning (compositor-friendly) vs. top/left.
- `content-visibility: auto` as progressive enhancement for off-screen rows.

**Performance targets:**

- 60fps scroll with 100k rows × 50 columns (only ~30 rows × ~20 cols in DOM).
- Cell mount/unmount budget: <16ms per scroll frame.

### 6.2 Canvas Rendering (optional — `@ol-grid/canvas-renderer`)

**When:** 1M+ rows, read-heavy, spreadsheet-style, no complex component cells (Glide model).

**Technique:**

- Single `<canvas>` per viewport region.
- `drawCell(ctx, cell, rect, theme)` callback per cell type.
- **Overlay DOM layer** for active editor and focus ring only.
- Text measurement cache (Glide's `measureTextCached` pattern).
- Damage rects: only repaint changed regions on scroll/update.

**Trade-offs (document clearly):**

| Aspect | DOM | Canvas |
|--------|-----|--------|
| Scroll perf (huge data) | Good | Excellent |
| Custom components in cells | Native | Overlay only |
| Accessibility | Native a11y tree | Requires parallel a11y DOM |
| Copy/paste | Native selection | Custom |
| Styling | CSS | Theme paint functions |

**Recommendation:** Ship DOM first. Canvas as opt-in renderer implementing same `RendererAdapter` interface.

### 6.3 Cell Renderer Plugin Contract

```typescript
interface CellRendererParams<TData = unknown, TValue = unknown> {
  value: TValue;
  data: TData;
  rowIndex: number;
  colDef: ColumnDef<TData, TValue>;
  api: GridApi;
  context: unknown;              // user-provided app context
  refresh(params: Partial<CellRendererParams>): boolean; // return true if handled
}

// Registration
registerCellRenderer('agCheckbox', CheckboxRenderer);
registerCellRenderer('progressBar', ProgressBarRenderer);

// Framework renderer (React example)
interface FrameworkCellRenderer {
  component: ComponentType<CellRendererParams>;
  // adapter handles mounting
}
```

**Contract rules:**

- `refresh()` called on data change without full remount if possible.
- Renderer must be **pure during paint** — no network, no store writes.
- `eGridCell` HTMLElement provided for DOM renderers to append content.

### 6.4 Styling & Theming

**CSS custom properties (design tokens):**

```css
.ol-grid {
  --ol-grid-font-family: system-ui, sans-serif;
  --ol-grid-font-size: 13px;
  --ol-grid-row-height: 42px;
  --ol-grid-header-height: 48px;
  --ol-grid-border-color: #e2e8f0;
  --ol-grid-header-bg: #f8fafc;
  --ol-grid-row-hover-bg: #f1f5f9;
  --ol-grid-row-selected-bg: #dbeafe;
  --ol-grid-cell-padding: 0 12px;
  --ol-grid-focus-ring: 0 0 0 2px #3b82f6;
}
```

**Theme packages:**

- `@ol-grid/themes/default` — base CSS.
- `@ol-grid/themes/material` — M3 tokens.
- `@ol-grid/themes/alpine` — AG Grid Alpine-inspired (familiar migration path).

**Rules:**

- Zero runtime CSS-in-JS in core.
- Class naming: BEM-like `.ol-grid`, `.ol-grid__header`, `.ol-grid__cell`, `.ol-grid__cell--selected`.
- Dark mode: `[data-ol-theme="dark"]` or `prefers-color-scheme`.
- Canvas renderer reads same tokens via `Theme` object (Glide pattern).

---

## 7. Testing Strategy

### 7.1 Core Unit Tests (framework-free)

**Runner:** Vitest (node environment).

**Coverage targets:**

| Module | Priority | Approach |
|--------|----------|----------|
| Virtualizer | P0 | Pure function tests: range calc, binary search, overscan, pinned cols |
| GridStore | P0 | Reducer tests, batching, selector memoization |
| ColumnModel | P0 | Flex distribution, pin/visibility, flatten groups |
| RowModel (CSRM) | P0 | Filter → sort → group pipeline |
| RowModel (infinite) | P1 | Block cache, stale request discard |
| Selection | P1 | Range, keyboard, filtered select-all |
| Editing | P1 | State machine transitions |
| Clipboard | P2 | Serialize/parse TSV |

**No DOM in core tests.** Mock `RendererAdapter` interface.

### 7.2 Adapter Integration Tests

**Runner:** Vitest Browser Mode + Playwright provider.

```typescript
// packages/react/tests/grid.integration.test.tsx
test('sorts on header click', async () => {
  render(<OlGrid columnDefs={cols} rowData={data} />);
  await userEvent.click(screen.getByText('Name'));
  const cells = screen.getAllByRole('gridcell');
  await expect.element(cells[0]).toHaveTextContent('Alice');
});
```

**Per-adapter test matrix:**

- Mount/unmount lifecycle (no memory leaks).
- Controlled vs. uncontrolled state sync.
- Cell renderer portal mount/unmount on scroll.
- `gridApi` imperative calls reflect in DOM.

### 7.3 Visual Regression

**Runner:** Vitest `toMatchScreenshot()` (Browser Mode) or Playwright standalone.

```
tests/
├── visual/
│   ├── dom-renderer.spec.ts     # default theme screenshots
│   ├── pinned-columns.spec.ts
│   ├── dark-theme.spec.ts
│   └── canvas-renderer.spec.ts
```

**Conventions:**

- Fixed viewport 1280×720; disable animations.
- Docker CI image for deterministic font rendering.
- Separate Vitest **project** for visual tests (longer timeout, runs in CI only or on label).
- Baseline updates via `vitest --update` with PR review.

### 7.4 Accessibility Tests

- `axe-core` in browser integration tests.
- Keyboard navigation test suite: arrow keys, Home/End, Ctrl+A, Enter to edit, Escape to cancel.
- ARIA role verification: `role="grid"`, `role="row"`, `role="gridcell"`, `aria-sort`, `aria-selected`.

### 7.5 Performance Benchmarks

- Separate `benchmarks/` package (not CI-gated initially).
- Measure: scroll FPS, initial render time, 10k row update time.
- Compare against AG Grid community + TanStack Table + Virtual on same dataset.

---

## 8. Reference Implementation Analysis

### 8.1 TanStack Table + Virtual

**Adopt:**
- Core-adapter split with `@tanstack/store` subscription model.
- Feature opt-in via `tableFeatures({ sortFeature, filterFeature })`.
- Row model pipeline as composable transforms.
- `FlexRender` pattern for framework-agnostic render delegation.
- Pair Virtual (layout) with Table (data) as separate concerns.

**Avoid:**
- Requiring users to build entire grid markup manually for the default experience.
- No built-in keyboard grid navigation (we add in core).

### 8.2 AG Grid

**Adopt:**
- Zero runtime dependencies in core.
- `ModuleRegistry` for tree-shakeable features.
- Controller/View separation (logic in core, rendering in adapter).
- `GridApi` imperative surface (`setGridOption`, `applyColumnState`, `forEachNode`).
- Client-side / infinite / server-side row models.
- Event-rich API (`onCellClicked`, `onRowSelected`, etc.).

**Avoid:**
- Massive internal DI container complexity — use simpler `GridContext` + module hooks.
- Enterprise/community split at architecture level (design extension points instead).

### 8.3 Glide Data Grid

**Adopt:**
- Canvas renderer for extreme scale tier.
- `drawCell` / `drawHeader` plugin contract.
- Theme object passed to paint functions.
- Text measurement caching.
- Native scroll on canvas container.

**Avoid:**
- React-only coupling — our canvas renderer stays behind `RendererAdapter`.
- Accessibility as afterthought — maintain hidden a11y DOM alongside canvas.

### 8.4 RevoGrid

**Adopt:**
- Web Component as distribution format for vanilla + framework interop.
- Multi-viewport scroll coordination (pinned + center).
- `frameSize` overscan buffer terminology.
- Plugin access to internal providers.
- `setDataAt` for targeted cell updates vs. full data replace.
- `disableVirtualX/Y` escape hatches for small datasets.

**Avoid:**
- StencilJS coupling — use Lit or vanilla custom elements for `@ol-grid/web-component`.
- Custom VNode system — leverage framework adapters instead.

### 8.5 Radix / Headless UI Patterns

**Adopt:**
- Controlled/uncontrolled dual mode for every state slice.
- Composition over monolithic props.
- Event handler chaining (user `onRowClicked` + internal selection handler both fire).
- Zero default styles; tokens only.

---

## 9. Recommended Package Dependency Graph

```
                    ┌─────────────┐
                    │  @ol-grid/  │
                    │   themes    │
                    └──────┬──────┘
                           │
┌──────────────┐    ┌──────▼──────┐    ┌─────────────────┐
│ @ol-grid/    │    │ @ol-grid/   │    │ @ol-grid/       │
│ sort         ├────►   core      ◄────┤ filter          │
└──────────────┘    └──────┬──────┘    └─────────────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
       ┌──────▼──────┐ ┌───▼────┐ ┌────▼─────────┐
       │ @ol-grid/   │ │ @ol-   │ │ @ol-grid/    │
       │ dom-renderer│ │ grid/  │ │ canvas-      │
       └──────┬──────┘ │clipboard│ │ renderer     │
              │        └────────┘ └──────────────┘
    ┌─────────┼─────────┬──────────┬──────────┐
    │         │         │          │          │
┌───▼──┐ ┌───▼──┐ ┌───▼───┐ ┌───▼────┐ ┌───▼────┐
│react │ │ vue  │ │angular│ │svelte  │ │vanilla │
└──────┘ └──────┘ └───────┘ └────────┘ └───┬────┘
                                           │
                                    ┌──────▼──────┐
                                    │ @ol-grid/   │
                                    │web-component│
                                    └─────────────┘
```

---

## 10. Phased Delivery Roadmap

### Phase 1 — Foundation (MVP)
- `@ol-grid/core`: GridStore, ColumnModel, CSRM, Virtualizer, Selection, EventBus
- `@ol-grid/dom-renderer`: basic cell rendering, scroll virtualization
- `@ol-grid/react` + `@ol-grid/vanilla` adapters
- `@ol-grid/sort` module
- Default theme CSS

### Phase 2 — Editing & Data
- Editing controller + editor host
- `@ol-grid/filter` module
- Infinite row model
- Vue + Svelte adapters

### Phase 3 — Scale & Enterprise Patterns
- Server-side row model
- `@ol-grid/grouping` module
- `@ol-grid/clipboard` module
- Angular adapter
- `@ol-grid/web-component`

### Phase 4 — Performance Tier
- `@ol-grid/canvas-renderer`
- Column virtualisation for 500+ columns
- Web Worker offload for sort/filter on large CSRM datasets

---

## Appendix A: Key Interfaces Summary

```typescript
// Entry point
function createGrid<TData>(options: GridOptions<TData>): GridEngine<TData>;

// Imperative API (subset)
interface GridApi<TData = unknown> {
  setGridOption<K extends keyof GridOptions>(key: K, value: GridOptions[K]): void;
  getDisplayedRowCount(): number;
  getRowNode(id: string): RowNode<TData> | undefined;
  forEachNode(callback: (node: RowNode<TData>) => void): void;
  setFocusedCell(rowIndex: number, colKey: string): void;
  startEditingCell(params: StartEditingCellParams): void;
  exportDataAsCsv(params?: CsvExportParams): void;
  destroy(): void;
}

// Events (subset)
interface GridEvents<TData = unknown> {
  onGridReady?(event: GridReadyEvent): void;
  onCellClicked?(event: CellClickedEvent<TData>): void;
  onCellValueChanged?(event: CellValueChangedEvent<TData>): void;
  onSelectionChanged?(event: SelectionChangedEvent): void;
  onSortChanged?(event: SortChangedEvent): void;
  onFilterChanged?(event: FilterChangedEvent): void;
  onRowDataUpdated?(event: RowDataUpdatedEvent): void;
}
```

## Appendix B: Open Decisions

| Decision | Options | Recommendation |
|----------|---------|----------------|
| State library | Custom store vs. `@tanstack/store` | `@tanstack/store` — battle-tested, already used by TanStack Table v9; zero-dep compatible |
| Web Component impl | Lit vs. vanilla CE | Lit for ergonomics; keep `lit` as dep of `@ol-grid/web-component` only |
| Default row height | Fixed vs. dynamic | Fixed default (42px); dynamic via `getRowHeight` callback |
| Column resize | CSS vs. JS drag | JS drag with ghost line; CSS `col-resize` cursor |
| SSR support | Phase 1 vs. later | Defer SSR until Phase 2; design store to be serializable from day 1 |
| License | MIT vs. dual | MIT core; commercial modules possible later (AG Grid model) |

---

*Document version: 1.0 — Initial architecture specification for ol-grid.*

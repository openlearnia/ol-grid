# ol-grid — Product Requirements

> Framework-agnostic data grid library positioned as an open, modern alternative to AG Grid.  
> This document defines **what** ol-grid must deliver. Implementation details live in [ARCHITECTURE.md](./ARCHITECTURE.md).  
> Feature-level specs: [requirements/](./requirements/README.md)  
> **Per-feature specs:** [requirements/](./requirements/) — 30 feature documents with acceptance criteria and implementation status.

**Document version:** 1.0  
**Last updated:** June 2026  
**Status:** Draft — pre-implementation

---

## Table of Contents

1. [Vision & Goals](#1-vision--goals)
2. [Competitive Landscape & Positioning](#2-competitive-landscape--positioning)
3. [AG Grid Feature Parity Matrix](#3-ag-grid-feature-parity-matrix)
4. [Functional Requirements by Tier](#4-functional-requirements-by-tier)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [API Design Principles](#6-api-design-principles)
7. [Out of Scope & Explicit Non-Goals](#7-out-of-scope--explicit-non-goals)
8. [Success Criteria & Acceptance](#8-success-criteria--acceptance)
9. [Open Questions](#9-open-questions)

---

## 1. Vision & Goals

### 1.1 Product vision

ol-grid is a **production-grade data grid** that gives teams AG Grid–level capability without vendor lock-in, framework coupling, or mandatory enterprise licensing. It combines:

- A **headless core** (logic, state, data transforms) usable anywhere JavaScript runs
- A **default high-performance renderer** so teams can ship quickly without building markup from scratch
- **Opt-in feature modules** so bundle size scales with actual usage
- **First-class framework adapters** for React, Vue, Angular, Svelte, and vanilla JS

### 1.2 Primary users

| Persona | Need |
|---------|------|
| **Application developer** | Drop-in grid with sorting, filtering, editing, virtualization; familiar AG Grid–like API |
| **Design-system team** | Headless core + custom renderer; CSS-token theming without fighting the library |
| **Platform / infra team** | Zero runtime deps in core, tree-shakeable packages, predictable bundle budgets |
| **Enterprise product team** | Server-side data, grouping, pivot, Excel export — without per-developer license friction |

### 1.3 Design goals (requirements-level)

| ID | Requirement |
|----|-------------|
| G-01 | ol-grid MUST work in React, Vue, Angular, Svelte, and vanilla JavaScript with the same core behavior |
| G-02 | ol-grid MUST ship a usable default grid experience (renderer + theme) without requiring custom markup |
| G-03 | ol-grid MUST allow consumers to replace or bypass the default renderer while keeping the same core API |
| G-04 | ol-grid MUST expose both declarative (props/options) and imperative (`GridApi`) control surfaces |
| G-05 | ol-grid MUST be accessible by default (keyboard grid navigation, ARIA roles, focus management) — not delegated to adapters |
| G-06 | ol-grid core MUST have zero third-party runtime dependencies |
| G-07 | Optional features (sort, filter, grouping, clipboard, etc.) MUST be importable as separate packages |
| G-08 | ol-grid MUST provide a credible migration path from AG Grid Community (column defs, events, API naming familiarity) |

### 1.4 Problem statement

Teams choosing data grids today face a false dichotomy:

- **Headless libraries** (TanStack Table) offer control and small bundles but require building virtualization, keyboard nav, editing UX, and filter UI from scratch — weeks of work for a “standard” admin grid.
- **Batteries-included grids** (AG Grid, MUI Data Grid, Handsontable) ship fast but impose bundle weight, licensing tiers, framework coupling, or spreadsheet-specific UX that may not fit.

ol-grid MUST occupy the middle: **batteries included by default, headless when you need it**.

---

## 2. Competitive Landscape & Positioning

### 2.1 Market map

| Library | Model | License | Strengths | Weaknesses vs. ol-grid opportunity |
|---------|-------|---------|-----------|-------------------------------------|
| **AG Grid Community** | Full grid, module registry | MIT (core) | Mature feature set, performance, docs | ~300 KB+ bundle; advanced features paywalled (Enterprise); React-first history |
| **AG Grid Enterprise** | Same core + enterprise modules | Commercial EULA (~$999/dev) | SSRM, grouping, pivot, Excel export, charts, support | License cost; watermark without key; features split across tiers |
| **TanStack Table** | Headless logic only | MIT | Tiny core (~15 KB gzip); full UI control; framework adapters | No default UI, no built-in virtualization or a11y grid pattern |
| **TanStack Virtual** | Headless layout | MIT | Excellent virtualization primitives | Must be composed with Table; not a grid product alone |
| **MUI X Data Grid** | Component grid (Material Design) | MIT / Pro / Premium | Fast integration in MUI apps; good DX | React + MUI coupled; advanced features in paid tiers ($180–588/dev/yr) |
| **Glide Data Grid** | Canvas renderer (React) | MIT | Extreme scroll performance (1M+ rows) | React-only; canvas hurts component cells and native a11y |
| **Handsontable** | Spreadsheet grid | Commercial (free non-commercial) | Excel-like editing, formulas, validation | Spreadsheet UX opinion; licensing; not general-purpose data grid |
| **RevoGrid** | Web Component (Stencil) | MIT | Multi-viewport virtualization; WC portability | Smaller ecosystem; Stencil coupling |
| **Tabulator** | Full grid | MIT | Feature-rich, jQuery-free | Less TypeScript-native; smaller enterprise footprint |
| **Simple Table / others** | Lightweight full grids | MIT | Small bundle, quick setup | Less depth for enterprise workflows |

*Bundle figures are indicative order-of-magnitude (e.g. TanStack Table ~15 KB gzip, MUI Data Grid ~120 KB, AG Grid Community ~330 KB pre-app code) — ol-grid targets materially below AG Grid for equivalent Community-tier feature sets.*

### 2.2 Positioning statement

> **ol-grid is the framework-agnostic, MIT-licensed data grid for teams that want AG Grid’s out-of-the-box power with TanStack’s architectural discipline — without enterprise license gates on core workflows.**

### 2.3 Differentiation pillars

| Pillar | ol-grid commitment | Primary competitor contrast |
|--------|-------------------|----------------------------|
| **Architecture** | Headless core + optional DOM/canvas renderers | AG Grid: monolithic; TanStack: no default renderer |
| **Licensing** | MIT for all Tier 1–2 features; Tier 3 advanced modules may use separate license (TBD) | AG Grid / MUI / Handsontable: paid tiers for grouping, SSRM, Excel |
| **Framework reach** | Equal-first React, Vue, Angular, Svelte, vanilla, Web Component | Glide/MUI: single-ecosystem; AG Grid: strong but heavier adapters |
| **Bundle discipline** | Tree-shakeable modules; core + renderer split | AG Grid Community: large all-in-one |
| **Migration** | Alpine-inspired theme + familiar `GridApi` / `columnDefs` / events | Reduces switching cost from AG Grid Community |
| **Scale path** | DOM default; optional canvas renderer for read-heavy mega-grids | Glide: canvas-only; AG Grid: DOM optimized but heavy |

### 2.4 When to choose ol-grid (guidance for adopters)

| Choose ol-grid when… | Consider alternatives when… |
|----------------------|----------------------------|
| You need a full grid across multiple frameworks | You are 100% MUI and want zero styling work → MUI Data Grid |
| You want MIT-licensed grouping/clipboard/SSRM (Tier 3) without AG Grid Enterprise | You need AG Grid’s integrated charting + enterprise support SLA today |
| You want headless core for a custom design system | You only need sort/filter on simple tables → TanStack Table |
| You need spreadsheet formulas and Excel parity | Handsontable or AG Grid Formulas (Enterprise) |
| You need 1M+ read-only cells at 60fps | `@ol-grid/canvas` (Tier 3) or Glide |

### 2.5 Competitive parity targets

| Capability | Minimum parity target |
|------------|----------------------|
| AG Grid Community | **Tier 1–2** — full functional parity |
| AG Grid Enterprise (data features) | **Tier 3** — grouping, pivot, SSRM, Excel export, range selection, clipboard |
| AG Grid Enterprise (charts, AI toolkit) | **Out of scope v1** — integrate with external chart libraries |
| TanStack Table + Virtual | **Tier 1** — match composability; exceed with built-in grid UX |
| MUI Data Grid (Community) | **Tier 1–2** — match; no Material coupling required |

---

## 3. AG Grid Feature Parity Matrix

Reference: [AG Grid Community vs Enterprise](https://www.ag-grid.com/javascript-data-grid/community-vs-enterprise/) (2026). Enterprise features are marked **(E)** in AG Grid docs.

Legend for ol-grid columns:

- **T1** = Tier 1 (MVP)
- **T2** = Tier 2
- **T3** = Tier 3
- **N/A** = not planned / out of scope
- **Mod** = optional `@ol-grid/*` module

### 3.1 Data display & columns

| Feature | AG Grid | ol-grid target | Notes |
|---------|---------|----------------|-------|
| Column definitions (`field`, `headerName`, `width`, `flex`) | Community | T1 | |
| Value getter / setter / formatter | Community | T1 | |
| Custom cell renderers | Community | T1 | Framework components via adapter |
| Column resize (drag) | Community | T1 | |
| Column move (drag) | Community | T2 | |
| Column pin (left/right) | Community | T1 | |
| Column groups & headers | Community | T2 | |
| Column visibility toggle | Community | T2 | |
| Auto-size columns | Community | T2 | |
| Spanning cells (row/col) | Community | T3 | |
| Tooltips | Community | T2 | |

### 3.2 Rows & data models

| Feature | AG Grid | ol-grid target | Notes |
|---------|---------|----------------|-------|
| Client-side row model (CSRM) | Community | T1 | Default |
| Infinite row model (block loading) | Community | T2 | |
| Server-side row model (SSRM) | **(E)** | T3 | Lazy hierarchy, server sort/filter |
| Row virtualization | Community | T1 | |
| Column virtualization | Community | T3 | Required for 500+ columns |
| Dynamic row height | Community | T2 | |
| Full-width rows | Community | T3 | |
| Master / detail | **(E)** | T3 | Expandable nested grid |
| Tree data | **(E)** | T3 | Hierarchical path-based rows |
| Row grouping | **(E)** | T3 | `@ol-grid/grouping` |
| Aggregation | **(E)** | T3 | sum, avg, min, max, count, custom |
| Pivot mode | **(E)** | T3 | |
| Transactions / immutable updates | Community | T2 | Targeted row add/update/remove |
| Async / stale-safe data loading | Community | T2 | Sequence tokens for infinite/SSRM |

### 3.3 Sorting, filtering, pagination

| Feature | AG Grid | ol-grid target | Notes |
|---------|---------|----------------|-------|
| Column sort (single & multi) | Community | T1 sort / T2 multi | `@ol-grid/sort` |
| Custom sort comparators | Community | T1 | |
| Column filters (text, number, date) | Community | T2 | `@ol-grid/filter` |
| Floating filters | Community | T2 | |
| Quick filter (global text) | Community | T2 | |
| Set filter | **(E)** | T3 | Multi-select value filter |
| Advanced filter builder | **(E)** | N/A v1 | Consider external or T3+ |
| Custom filter components | Community | T2 | |
| Pagination (client) | Community | T2 | Optional; virtual scroll is default |
| Pagination (server) | **(E)** | T3 | With SSRM |

### 3.4 Selection & interaction

| Feature | AG Grid | ol-grid target | Notes |
|---------|---------|----------------|-------|
| Single / multi row selection | Community | T1 | |
| Checkbox selection column | Community | T1 | |
| Cell focus & keyboard navigation | Community | T1 | Core-owned a11y |
| Range / cell selection | **(E)** | T3 | Excel-like ranges |
| Select all (filtered-aware) | Community | T2 | |
| Row click / double-click events | Community | T1 | |
| Context menu | **(E)** | T3 | Pluggable |
| Status bar | **(E)** | N/A v1 | App-level concern |
| Side bar / tool panels | **(E)** | T3 | Column & filter panels |
| Row drag & drop (reorder) | Community | T3 | |
| Column drag from panel (grouping UI) | **(E)** | T3 | Row group drop zone |

### 3.5 Editing

| Feature | AG Grid | ol-grid target | Notes |
|---------|---------|----------------|-------|
| Inline cell editing | Community | T2 | |
| Provided editors (text, select, date, etc.) | Community | T2 | |
| Custom cell editors | Community | T2 | |
| Validation (`valueParser`, edit guards) | Community | T2 | |
| Full-row editing | Community | T3 | |
| Undo / redo | **(E)** | N/A v1 | |
| Formulas | **(E)** | N/A v1 | Handsontable / AG Grid Enterprise domain |

### 3.6 Clipboard & export

| Feature | AG Grid | ol-grid target | Notes |
|---------|---------|----------------|-------|
| CSV export | Community | T2 | |
| Clipboard copy/paste (TSV) | **(E)** enhanced | T3 | `@ol-grid/clipboard`; basic copy T2 |
| Excel export (.xlsx) | **(E)** | T3 | Formatting subset |
| Print | Community | N/A v1 | Browser print via CSS |

### 3.7 Charts & sparklines

| Feature | AG Grid | ol-grid target | Notes |
|---------|---------|----------------|-------|
| Integrated charts | **(E)** | N/A v1 | Document integration with Chart.js / ECharts |
| Sparklines in cells | **(E)** | N/A v1 | Custom cell renderer |
| AI Toolkit | **(E)** | N/A v1 | |

### 3.8 Theming, layout & accessories

| Feature | AG Grid | ol-grid target | Notes |
|---------|---------|----------------|-------|
| Built-in themes | Community | T1 | default + alpine-inspired |
| Theme parameters / design tokens | Community | T1 | CSS custom properties |
| Dark mode | Community | T1 | |
| RTL layout | Community | T2 | |
| Locale / i18n | Community | T2 | |
| Loading & empty overlays | Community | T2 | |
| Pagination panel | Community | T2 | |

### 3.9 ol-grid value-add beyond AG Grid Community

These are **explicit product requirements** — capabilities AG Grid reserves for Enterprise or does not emphasize, which ol-grid will offer under MIT (Tier 2–3):

| Requirement | Tier | Rationale |
|-------------|------|-----------|
| Zero-dep core package | T1 | Smaller attack surface; embeddable anywhere |
| Optional canvas renderer | T3 | Glide-class performance without React lock-in |
| Web Component distribution | T3 | Framework-neutral embed (RevoGrid-style) |
| Serializable grid state | T2 | SSR, persistence, time-travel debug |
| Controlled/uncontrolled mode per state slice | T1 | Radix-style flexibility |

---

## 4. Functional Requirements by Tier

Tiers align with [ARCHITECTURE.md §10 Phased Delivery](./ARCHITECTURE.md#10-phased-delivery-roadmap) but are expressed as **user-visible capability**, not package names.

### 4.1 Tier 1 — Foundation (MVP)

**Goal:** A developer can render a virtualized, sortable, selectable grid in React or vanilla JS in under 30 minutes, with behavior recognizable to AG Grid users.

#### 4.1.1 Core grid

| ID | Requirement | Priority |
|----|-------------|----------|
| T1-C-01 | Display tabular data from an in-memory array (client-side row model) | Must |
| T1-C-02 | Virtualize rows and columns in the viewport; only visible cells are rendered | Must |
| T1-C-03 | Support fixed row height (default) with configurable default height | Must |
| T1-C-04 | Support pinned left and right columns with independent horizontal scroll in center | Must |
| T1-C-05 | Emit `gridReady` when the grid is initialized and `GridApi` is available | Must |
| T1-C-06 | Support programmatic destroy / cleanup with no leaked listeners or DOM nodes | Must |

#### 4.1.2 Columns

| ID | Requirement | Priority |
|----|-------------|----------|
| T1-COL-01 | Define columns via declarative `columnDefs` with `field`, `headerName`, `width`, `minWidth`, `maxWidth`, `flex`, `pinned`, `hide` | Must |
| T1-COL-02 | Resolve cell values via `field` or `valueGetter` | Must |
| T1-COL-03 | Format display text via `valueFormatter` (does not change underlying data) | Must |
| T1-COL-04 | Resize columns by dragging header edge | Must |
| T1-COL-05 | Register and use custom cell renderers (string key or component) | Must |
| T1-COL-06 | Apply column state programmatically (`applyColumnState`) and persist width/order/pin/visibility | Should |

#### 4.1.3 Sorting

| ID | Requirement | Priority |
|----|-------------|----------|
| T1-SORT-01 | Click column header to sort asc → desc → none | Must |
| T1-SORT-02 | Show sort indicator in header (`aria-sort`) | Must |
| T1-SORT-03 | Support custom comparator per column | Must |
| T1-SORT-04 | Imperative API: `setSortModel`, `getSortModel` | Must |
| T1-SORT-05 | Emit `sortChanged` event | Must |

#### 4.1.4 Selection & focus

| ID | Requirement | Priority |
|----|-------------|----------|
| T1-SEL-01 | Support `singleRow` and `multiRow` selection modes | Must |
| T1-SEL-02 | Optional checkbox selection column | Must |
| T1-SEL-03 | Keyboard navigation: arrows, Home/End, Page Up/Down move cell focus | Must |
| T1-SEL-04 | Enter activates edit (Tier 2); Space toggles row selection where applicable | Must |
| T1-SEL-05 | Emit `selectionChanged`, `cellClicked`, `rowClicked` | Must |
| T1-SEL-06 | Expose `setFocusedCell`, `getSelectedRows` on `GridApi` | Must |

#### 4.1.5 Theming & adapters

| ID | Requirement | Priority |
|----|-------------|----------|
| T1-TH-01 | Ship default theme via CSS custom properties (light + dark) | Must |
| T1-TH-02 | Ship Alpine-inspired theme for AG Grid migrators | Should |
| T1-AD-01 | React adapter: declarative component + `useOlGrid` hook + ref to `GridApi` | Must |
| T1-AD-02 | Vanilla adapter: `createGrid(host, options)` | Must |
| T1-AD-03 | TypeScript generics for row data type (`GridOptions<TData>`) | Must |

#### 4.1.6 Tier 1 performance targets

| ID | Requirement | Target |
|----|-------------|--------|
| T1-P-01 | Scroll frame time with 100k rows × 20 columns | ≤ 16 ms (60 fps) on mid-range laptop |
| T1-P-02 | Initial render with 1k rows × 10 columns | ≤ 100 ms |
| T1-P-03 | `@ol-grid/core` gzip size (standalone) | ≤ 40 KB |
| T1-P-04 | `@ol-grid/react` + core + dom-renderer + sort gzip | ≤ 80 KB |

---

### 4.2 Tier 2 — Editing, filtering & multi-framework

**Goal:** Feature parity with AG Grid Community for typical admin / B2B CRUD grids; Vue and Svelte adopters supported.

#### 4.2.1 Editing

| ID | Requirement | Priority |
|----|-------------|----------|
| T2-ED-01 | Double-click, Enter, F2, or typed character starts edit on editable cell | Must |
| T2-ED-02 | Escape cancels; Enter commits; Tab moves to next editable cell | Must |
| T2-ED-03 | `valueSetter` persists committed value; reject commit if returns false | Must |
| T2-ED-04 | `valueParser` transforms raw input before commit | Must |
| T2-ED-05 | Provided editors: text, number, select (extensible registry) | Must |
| T2-ED-06 | Custom cell editors (framework components) | Must |
| T2-ED-07 | Emit `cellValueChanged` after successful commit | Must |
| T2-ED-08 | Column-level `editable` boolean or callback | Must |

#### 4.2.2 Filtering

| ID | Requirement | Priority |
|----|-------------|----------|
| T2-FL-01 | Per-column filter: text, number, date | Must |
| T2-FL-02 | Filter UI in column menu or header dropdown | Must |
| T2-FL-03 | Optional floating filter row | Should |
| T2-FL-04 | Quick filter: single input filtering across columns | Should |
| T2-FL-05 | Custom filter components and filter logic | Must |
| T2-FL-06 | Imperative API: `setFilterModel`, `getFilterModel`, `onFilterChanged` | Must |
| T2-FL-07 | Filters compose with sort and selection (filtered row indices) | Must |

#### 4.2.3 Data loading & updates

| ID | Requirement | Priority |
|----|-------------|----------|
| T2-DM-01 | Infinite row model: load blocks by scroll position with LRU cache | Must |
| T2-DM-02 | Datasource contract: `getRows({ startRow, endRow, sortModel, filterModel })` | Must |
| T2-DM-03 | Row transactions: add, update, remove without full data replace | Should |
| T2-DM-04 | `forEachNode`, `getRowNode(id)`, stable row IDs | Must |
| T2-DM-05 | Loading and error states for async blocks | Must |

#### 4.2.4 Columns & layout (advanced)

| ID | Requirement | Priority |
|----|-------------|----------|
| T2-COL-01 | Column groups (nested headers) | Must |
| T2-COL-02 | Drag to reorder columns | Should |
| T2-COL-03 | Auto-size column to content | Should |
| T2-COL-04 | Dynamic row height with measurement cache | Should |
| T2-COL-05 | Multi-column sort (shift-click or sort index) | Should |

#### 4.2.5 Export & pagination

| ID | Requirement | Priority |
|----|-------------|----------|
| T2-EX-01 | Export displayed data to CSV (configurable delimiter, headers) | Must |
| T2-PG-01 | Client-side pagination mode (alternative to virtual scroll) | Should |
| T2-PG-02 | Configurable page size selector | Should |

#### 4.2.6 Internationalization & accessibility

| ID | Requirement | Priority |
|----|-------------|----------|
| T2-I18N-01 | Locale bundle for built-in UI strings (filter labels, aria labels, page size) | Must |
| T2-I18N-02 | `localeText` override object on grid options | Must |
| T2-A11Y-01 | WCAG 2.1 Level AA compliance for built-in DOM renderer | Must |
| T2-A11Y-02 | Automated axe-core clean run in CI for default grid scenarios | Must |
| T2-A11Y-03 | RTL column order and scroll behavior | Should |

#### 4.2.7 Adapters

| ID | Requirement | Priority |
|----|-------------|----------|
| T2-AD-01 | Vue 3 adapter (composable + component) | Must |
| T2-AD-02 | Svelte adapter (component + bindable API) | Must |
| T2-AD-03 | Controlled mode: external state slices sync with core store | Must |

---

### 4.3 Tier 3 — Enterprise patterns & scale

**Goal:** MIT-licensed alternatives to AG Grid Enterprise **data** features; optional canvas renderer for extreme scale.

#### 4.3.1 Grouping, pivot & tree

| ID | Requirement | Priority |
|----|-------------|----------|
| T3-GR-01 | Row grouping by one or more columns with expand/collapse | Must |
| T3-GR-02 | Group row renderer with aggregate display | Must |
| T3-GR-03 | Built-in agg functions: sum, min, max, avg, count, first, last | Must |
| T3-GR-04 | Custom aggregation functions | Should |
| T3-GR-05 | Drag column to row group panel (UI) | Should |
| T3-GR-06 | Pivot mode: pivot columns from unique values | Must |
| T3-GR-07 | Tree data mode via `getDataPath` callback | Must |

#### 4.3.2 Server-side row model

| ID | Requirement | Priority |
|----|-------------|----------|
| T3-SS-01 | Lazy load hierarchical groups from server | Must |
| T3-SS-02 | Server-driven sort, filter, pivot metadata | Must |
| T3-SS-03 | Sparse row store keyed by row ID | Must |
| T3-SS-04 | Loading stubs for unfetched rows | Must |

#### 4.3.3 Selection, clipboard & Excel

| ID | Requirement | Priority |
|----|-------------|----------|
| T3-SEL-01 | Cell range selection (mouse drag + shift-arrow) | Must |
| T3-CL-01 | Copy selected cells as TSV and HTML (Excel paste) | Must |
| T3-CL-02 | Paste from clipboard into editable range | Must |
| T3-CL-03 | `beforeCopy` / `beforePaste` hooks for transformation | Must |
| T3-EX-01 | Excel export with basic styling (headers, number formats) | Should |

#### 4.3.4 UI accessories

| ID | Requirement | Priority |
|----|-------------|----------|
| T3-UI-01 | Column tool panel (show/hide, reorder, pin) | Should |
| T3-UI-02 | Filter tool panel | Should |
| T3-UI-03 | Configurable context menu (built-in + custom items) | Should |
| T3-UI-04 | Master/detail expandable rows | Should |
| T3-UI-05 | Set filter (multi-select from unique values) | Should |

#### 4.3.5 Scale & platform

| ID | Requirement | Priority |
|----|-------------|----------|
| T3-SC-01 | Column virtualization (500+ columns) | Must |
| T3-SC-02 | Optional canvas renderer for read-heavy 1M+ row scenarios | Should |
| T3-SC-03 | Web Worker offload for sort/filter on large CSRM datasets (>100k rows) | Should |
| T3-SC-04 | Angular adapter | Must |
| T3-SC-05 | Web Component (`<ol-grid>`) for embed anywhere | Must |
| T3-SC-06 | Parallel hidden a11y DOM when canvas renderer active | Must |

---

## 5. Non-Functional Requirements

### 5.1 Performance

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-P-01 | Virtual scroll maintains 60 fps with 100k rows, 50 columns (DOM renderer) | Tier 1 |
| NFR-P-02 | Virtual scroll maintains 60 fps with 1M rows (canvas renderer, read-only) | Tier 3 |
| NFR-P-03 | Sort/filter 100k row CSRM completes in ≤ 200 ms (main thread); worker path ≤ 100 ms perceived | Tier 3 |
| NFR-P-04 | Memory: DOM node count bounded by viewport × overscan, not total row count | Tier 1 |
| NFR-P-05 | No layout thrash during scroll (prefer transform-based positioning) | Tier 1 |
| NFR-P-06 | Cell renderer mount/unmount on scroll completes within frame budget | Tier 1 |

### 5.2 Bundle size & tree-shaking

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-B-01 | `@ol-grid/core` has zero runtime dependencies | Tier 1 |
| NFR-B-02 | All packages declare `sideEffects: false` (except CSS) | Tier 1 |
| NFR-B-03 | Feature modules are separate entry points (`@ol-grid/sort`, `@ol-grid/filter`, …) | Tier 1 |
| NFR-B-04 | Minimal Tier 1 app bundle (core + dom-renderer + sort + react) ≤ 80 KB gzip | Tier 1 |
| NFR-B-05 | Full Tier 2 bundle (all standard modules, no Tier 3) ≤ 150 KB gzip | Tier 2 |
| NFR-B-06 | ESM-first with dual CJS build; named exports only | Tier 1 |
| NFR-B-07 | Pass `publint` and `@arethetypeswrong/cli` in CI | Tier 1 |

### 5.3 Accessibility

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-A-01 | Implement WAI-ARIA grid pattern (`grid`, `row`, `columnheader`, `gridcell`) | Tier 1 |
| NFR-A-02 | All interactive features operable via keyboard alone | Tier 1 |
| NFR-A-03 | Visible focus indicator meeting WCAG 2.4.7 | Tier 1 |
| NFR-A-04 | Screen reader announcements for sort, filter, selection changes | Tier 2 |
| NFR-A-05 | WCAG 2.1 Level AA for default renderer | Tier 2 |
| NFR-A-06 | Canvas renderer maintains equivalent keyboard/a11y behavior via companion DOM | Tier 3 |
| NFR-A-07 | Respect `prefers-reduced-motion` for animations | Tier 2 |

### 5.4 Internationalization (i18n)

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-I-01 | No hard-coded user-facing strings in core | Tier 2 |
| NFR-I-02 | Default English locale bundled; additional locales as separate imports | Tier 2 |
| NFR-I-03 | `localeText` merges deeply with defaults | Tier 2 |
| NFR-I-04 | RTL layout supported without duplicate codebase | Tier 2 |
| NFR-I-05 | Date/number filter formatting respects locale config | Tier 2 |

### 5.5 Theming & styling

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-T-01 | Theming via CSS custom properties only in core/renderer — no runtime CSS-in-JS | Tier 1 |
| NFR-T-02 | Support light, dark, and system (`prefers-color-scheme`) modes | Tier 1 |
| NFR-T-03 | Class naming convention: BEM-like `ol-grid__*` stable across versions | Tier 1 |
| NFR-T-04 | Consumers can restyle without forking via tokens + optional class overrides | Tier 1 |
| NFR-T-05 | Canvas renderer consumes same token object as DOM | Tier 3 |
| NFR-T-06 | Shadow DOM off by default on Web Component (theming via host CSS vars) | Tier 3 |

### 5.6 Browser & environment support

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-E-01 | Evergreen browsers: Chrome, Firefox, Safari, Edge (last 2 versions) | Tier 1 |
| NFR-E-02 | ES2022 build target | Tier 1 |
| NFR-E-03 | SSR: grid state serializable from day 1; full SSR render deferred | Tier 2 |
| NFR-E-04 | React Server Components: adapter marked `"use client"` | Tier 1 |

### 5.7 Security

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-S-01 | XSS-safe default cell rendering (escape HTML unless explicit `dangerouslyAllowHtml`) | Tier 1 |
| NFR-S-02 | Clipboard access uses Clipboard API with graceful degradation | Tier 3 |
| NFR-S-03 | No `eval` or dynamic code execution in core | Tier 1 |

### 5.8 Licensing

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-L-01 | `@ol-grid/core` and all Tier 1–2 packages: **MIT License** | Tier 1 |
| NFR-L-02 | Tier 3 packages (grouping, clipboard, excel export, canvas): **MIT by default**; project may introduce optional commercial add-ons later without relicensing core | Tier 3 |
| NFR-L-03 | No license key required for production use of MIT packages | Tier 1 |
| NFR-L-04 | No watermark or console errors in open-source tiers | Tier 1 |
| NFR-L-05 | Third-party attribution documented in NOTICE file | Tier 1 |

### 5.9 Quality, testing & documentation

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-Q-01 | Core unit test coverage ≥ 90% for virtualizer, store, column model, CSRM | Tier 1 |
| NFR-Q-02 | Each adapter has integration tests (mount, sort, select, scroll) | Tier 1 |
| NFR-Q-03 | Visual regression suite for default theme (CI on label or nightly) | Tier 2 |
| NFR-Q-04 | Public API documented with TypeDoc; every `GridApi` method has example | Tier 2 |
| NFR-Q-05 | Migration guide from AG Grid Community | Tier 2 |
| NFR-Q-06 | Benchmarks published vs AG Grid Community + TanStack Table + Virtual | Tier 2 |

### 5.10 Developer experience

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-D-01 | Strict TypeScript; generics preserve row data types end-to-end | Tier 1 |
| NFR-D-02 | Module augmentation extends `GridApi` when feature modules installed | Tier 1 |
| NFR-D-03 | Meaningful error messages for misconfiguration (e.g. missing module) | Tier 2 |
| NFR-D-04 | Stable semver; changesets for monorepo releases | Tier 1 |

---

## 6. API Design Principles

These principles govern **what** the public surface must look and behave like. They mirror [ARCHITECTURE.md](./ARCHITECTURE.md) constraints but avoid prescribing internal structure.

### 6.1 Headless core, optional presentation

| Principle | Requirement |
|-----------|-------------|
| **Separation** | All data logic, state transitions, and business rules live in `@ol-grid/core`; renderers only paint and capture input |
| **Replaceability** | A third-party renderer MUST be able to implement the same adapter contract and receive identical layout frames |
| **Default path** | `@ol-grid/dom-renderer` MUST ship alongside core so `createGrid()` works without custom markup |
| **No logic in adapters** | Framework adapters MUST NOT duplicate sort, filter, selection, or virtual range math |

### 6.2 Dual control: declarative and imperative

| Principle | Requirement |
|-----------|-------------|
| **Options object** | `GridOptions<TData>` is the declarative config surface (columnDefs, rowData, events, feature flags) |
| **GridApi** | Imperative methods (`setSortModel`, `applyColumnState`, `exportDataAsCsv`, …) MUST reflect the same underlying state as declarative props |
| **Equivalence** | Calling `api.setSortModel(x)` MUST produce identical grid state to passing `sorting={x}` in controlled mode |
| **Ref access** | Framework adapters MUST expose `GridApi` via ref, callback, or binding (`onGridReady`, `bind:api`) |
| **Batching** | Multiple imperative calls in one tick MUST coalesce to a single render |

### 6.3 Column model

| Principle | Requirement |
|-----------|-------------|
| **ColumnDef vs ColumnState** | `columnDefs` are declarative config; runtime width, order, pin, visibility, sort, filter live in `ColumnState` |
| **Stable identity** | Every column MUST have a stable `colId` (explicit or derived from `field`) |
| **Value pipeline** | Cell display follows: `valueGetter` → `valueFormatter`; edits follow: editor → `valueParser` → `valueSetter` |
| **Extensibility** | Custom renderers, editors, and filters register by string key or component reference |
| **Column groups** | Nested `children` in column defs flatten to leaf columns with group headers |
| **Pinning model** | Three regions (left pin, center, right pin) with synchronized vertical scroll |

### 6.4 Row model

| Principle | Requirement |
|-----------|-------------|
| **Exclusive models** | Exactly one row model per grid instance: `clientSide` (default), `infinite`, or `serverSide` |
| **RowNode** | Uniform node interface (`id`, `data`, `rowIndex`, `level`, `group`, `expanded`, …) across models |
| **Pipeline** | Client-side transforms (filter → sort → group → paginate) compose as ordered stages; optional modules register stages |
| **Virtualization decoupling** | Row model exposes total row count and row lookup; virtualizer computes visible range independently |
| **Async safety** | Infinite and server-side models MUST discard stale responses via request sequencing |
| **Immutable updates** | Support targeted updates (`applyTransaction`) without requiring full array replacement |

### 6.5 Events

| Principle | Requirement |
|-----------|-------------|
| **Rich lifecycle** | Grid MUST emit events for: ready, data changed, sort/filter changed, selection changed, column moved/resized, cell clicked, value changed |
| **Chaining** | User event handlers and internal handlers MUST both run (not mutually exclusive) |
| **Typed payloads** | Every event carries typed context: `api`, `columnApi`, `data`, `node`, `rowIndex`, `colDef` as applicable |
| **Cancellation hooks** | `beforeCopy`, `beforePaste`, and similar hooks MUST allow veto or mutation |
| **No event duplication** | Batched state changes emit one event per concern, not per cell |

### 6.6 Modules & extensibility

| Principle | Requirement |
|-----------|-------------|
| **Opt-in features** | Sort, filter, grouping, clipboard, etc. register via `ModuleRegistry` — importing without registering MUST NOT bloat bundle |
| **API augmentation** | Feature modules extend `GridApi` through TypeScript module augmentation |
| **Plugins** | Advanced extensions use `GridPlugin` with access to store, api, and renderer — for context menus, export, custom overlays |
| **Context** | User-provided `context` object passed to all callbacks unchanged |

### 6.7 State management

| Principle | Requirement |
|-----------|-------------|
| **Single source of truth** | `GridStore` owns runtime state; adapters subscribe, they do not fork state |
| **Controlled / uncontrolled** | Each slice (sort, filter, selection, …) supports controlled or uncontrolled mode |
| **Serializable** | Grid state snapshots MUST be JSON-serializable for persistence and debugging |
| **Selectors** | Adapters and renderers read via selectors to minimize unnecessary updates |

### 6.8 Naming & migration ergonomics

| Principle | Requirement |
|-----------|-------------|
| **Familiar vocabulary** | Prefer AG Grid–aligned names where semantics match: `columnDefs`, `rowData`, `gridApi`, `onGridReady`, `colDef`, `rowNode` |
| **Explicit breaks** | Intentional API differences from AG Grid MUST be documented with migration notes |
| **Versioning** | Public API changes follow semver; deprecations warned for one minor release |

### 6.9 Required public types (minimum surface)

The following types MUST be exported from `@ol-grid/core` and remain stable within a major version:

```
GridOptions, GridApi, ColumnDef, ColumnState, RowNode,
GridReadyEvent, CellClickedEvent, SortChangedEvent,
FilterChangedEvent, SelectionChangedEvent, CellValueChangedEvent,
SortModel, FilterModel, ModuleRegistry, createGrid
```

Feature modules export their own config types (`SortModuleOptions`, `FilterModuleOptions`, …) and augment `GridApi`.

---

## 7. Out of Scope & Explicit Non-Goals

The following are **not** requirements for v1. They may be revisited in future versions:

| Item | Rationale |
|------|-----------|
| AG Grid Integrated Charts / Sparklines | Use external chart libraries + cell renderers |
| AG Grid AI Toolkit / MCP Server | Product category outside grid core |
| Excel formulas engine | Domain of Handsontable / AG Grid Enterprise |
| Built-in PDF export | App-level or plugin |
| Real-time collaborative editing (OT/CRDT) | orthogonal product |
| Mobile-native gestures as first-class | Desktop-first; touch scroll only in v1 |
| Full SSR/hydration of grid DOM | State serializable; render deferred |
| jQuery adapter | Legacy |
| Built-in database connectivity | App concern; SSRM datasource is the boundary |

---

## 8. Success Criteria & Acceptance

### 8.1 Tier 1 exit criteria

- [ ] React and vanilla examples run sorting, selection, virtualization on 100k rows
- [ ] axe-core reports zero critical violations on default demo
- [ ] Bundle budget met (§5.2)
- [ ] API docs cover `GridOptions`, `GridApi`, and all Tier 1 events
- [ ] AG Grid Community “getting started” tutorial reproducible in ol-grid with ≤ 20% API mapping changes

### 8.2 Tier 2 exit criteria

- [ ] Editable grid demo with validation and Tab navigation between cells
- [ ] Infinite row model demo against mock REST API
- [ ] Vue and Svelte examples at parity with React basic demo
- [ ] CSV export matches displayed (filtered/sorted) data
- [ ] Migration guide published with side-by-side AG Grid ↔ ol-grid snippets

### 8.3 Tier 3 exit criteria

- [ ] Group + aggregate + pivot demo on 50k row client dataset
- [ ] SSRM demo with expandable groups from mock server
- [ ] Clipboard round-trip with Excel verified manually
- [ ] Angular + Web Component examples shipped
- [ ] Canvas renderer benchmark: 1M rows at 60 fps read-only scroll

### 8.4 Project-level success metrics (12 months post Tier 2)

| Metric | Target |
|--------|--------|
| npm weekly downloads | 10k+ |
| GitHub stars | 1k+ |
| Known production adopters | 5+ public case studies |
| Open issue median response | < 7 days |
| AG Grid Community parity score (feature matrix §3) | ≥ 95% for non-E features |

---

## 9. Open Questions

| # | Question | Options | Decision deadline |
|---|----------|---------|-------------------|
| OQ-1 | Tier 3 advanced modules: all MIT vs dual-license commercial | MIT only / MIT core + paid `@ol-grid/enterprise` | Before Tier 3 kickoff |
| OQ-2 | Excel export: build vs wrap `sheetjs` | Internal / dependency | Tier 3 planning |
| OQ-3 | Default state library in core | Custom store / `@tanstack/store` | Tier 1 kickoff |
| OQ-4 | Set filter in Tier 2 or Tier 3 | Earlier UX win vs scope | Tier 2 planning |
| OQ-5 | Official Nuxt / Next.js wrappers | Community / first-party | Post Tier 2 |
| OQ-6 | AG Grid theme compatibility layer (Quartz params) | Full / Alpine-only / none | Tier 2 theming |

---

## Appendix A: Reference links

- [AG Grid Key Features](https://www.ag-grid.com/javascript-data-grid/key-features/)
- [AG Grid Community vs Enterprise](https://www.ag-grid.com/javascript-data-grid/community-vs-enterprise/)
- [TanStack Table Overview](https://tanstack.com/table/latest/docs/introduction)
- [ol-grid ARCHITECTURE.md](./ARCHITECTURE.md)

---

*This requirements document is the authoritative product spec for ol-grid v1. Implementation choices that conflict with these requirements MUST be resolved via explicit amendment to this document.*

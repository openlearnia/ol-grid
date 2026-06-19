# Feature Requirements: Framework Adapters

> **Package targets:** `@ol-grid/react`, `@ol-grid/vue`, `@ol-grid/svelte`, `@ol-grid/angular`, `@ol-grid/vanilla`, `@ol-grid/web-component`  
> **Parent spec:** [REQUIREMENTS.md](../REQUIREMENTS.md) §4.1.5, §4.2.7, §4.3.5  
> **Architecture:** [ARCHITECTURE.md](../ARCHITECTURE.md) §4, §6.1  
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

Framework adapters are **thin lifecycle and reactivity bridges** between application code and a single `GridEngine` instance per grid. Adapters mount the default `DomRenderer` (or optional `CanvasRenderer`) and expose declarative props/options plus imperative `GridApi` access.

Adapters MUST NOT duplicate sort, filter, virtualization, selection, or export logic — that lives in `@ol-grid/core` and feature modules per [core-engine.md](./core-engine.md).

### 1.1 Goals

| Goal | Description |
|------|-------------|
| **One engine per grid** | Predictable lifecycle; no forked framework state for grid data |
| **Type-safe generics** | `GridOptions<TData>` preserves row type end-to-end |
| **Familiar DX** | AG Grid–like component + `onGridReady` + ref/`api` patterns |
| **Framework cell components** | Custom renderers/editors bridge to React/Vue/Angular/Svelte hosts |
| **Controlled mode** | External state slices (sort, filter, selection) sync with core store (T2) |
| **Minimal adapter LOC** | Core wiring <200 LOC per adapter (excluding types/tests) |

### 1.2 Non-goals (v1)

- Official Next.js / Nuxt wrappers (community or post–Tier 2)
- jQuery or legacy framework adapters
- Adapters that embed business logic (validation rules, API fetch)
- Shadow DOM encapsulation on Web Component (theming via host CSS vars)

### 1.3 Scope boundary

Adapters own **mount/unmount**, **options sync**, **store subscription for re-renders**, and **framework component portals** for cell renderers/editors. They do not implement grid behavior; they delegate to `GridEngine` and `RendererAdapter`.

---

## 2. Current Implementation Status

Audit of `packages/` as of June 2026:

| Package | Tier | Status | Notes |
|---------|------|--------|-------|
| `@ol-grid/react` | T1 | **Partial** | `OlGrid` + `useOlGrid` ~150 LOC; options sync partial |
| `@ol-grid/vanilla` | T1 | **Implemented** | `createGrid(host, options)` ~30 LOC |
| `@ol-grid/vue` | T2 | **Not started** | |
| `@ol-grid/svelte` | T2 | **Not started** | |
| `@ol-grid/angular` | T3 | **Not started** | |
| `@ol-grid/web-component` | T3 | **Not started** | |

| Capability | Status | Location |
|------------|--------|----------|
| Engine create on mount | **Implemented** | `packages/react`, `packages/vanilla` |
| `onGridReady` callback | **Implemented** | React + vanilla |
| `GridApi` ref exposure | **Partial** | React forwardRef; no Vue/Svelte bind |
| `useSyncExternalStore` subscription | **Not verified** | React may use effect-based sync |
| Options sync (`columnDefs`, `rowData`, …) | **Partial** | Subset synced each render |
| Event handler merge on partial updates | **Partial** | Separate effect pattern in React |
| `"use client"` directive for RSC | **Not implemented** | Build must inject |
| Framework cell renderer portals | **Not implemented** | |
| Controlled `sortModel` / `filterModel` | **Not implemented** | T2 |
| `GridApiContext` for cell renderers | **Not implemented** | T1 completion |
| Vue composable + component | **Not implemented** | T2 |
| Svelte component + `bind:api` | **Not implemented** | T2 |
| Angular standalone component | **Not implemented** | T3 |
| `<ol-grid>` custom element | **Not implemented** | T3 |

---

## 3. User Stories

### Tier 1 (React + Vanilla)

| ID | Story | Priority |
|----|-------|----------|
| US-ADP-01 | As a React developer, I render `<OlGrid columnDefs={cols} rowData={data} />` and get a working grid in under 10 lines | Must |
| US-ADP-02 | As a React developer, I access `GridApi` via ref after `onGridReady` for imperative calls | Must |
| US-ADP-03 | As a vanilla developer, I call `createGrid(host, options)` without a bundler framework | Must |
| US-ADP-04 | As a React developer, TypeScript infers row type from `rowData` generic | Must |
| US-ADP-05 | As a React developer, unmounting the component destroys the engine with no leaked listeners | Must |
| US-ADP-06 | As a React developer using RSC, the adapter is marked `"use client"` automatically | Must |
| US-ADP-07 | As an app developer, I use `useOlGrid(options)` for custom host layout | Should |

### Tier 2 (Vue + Svelte)

| ID | Story | Priority |
|----|-------|----------|
| US-ADP-08 | As a Vue developer, I use `<OlGrid :column-defs="cols" @grid-ready="onReady" />` | Must |
| US-ADP-09 | As a Vue developer, I inject `gridApi` in cell renderers via `provide/inject` | Must |
| US-ADP-10 | As a Svelte developer, I bind `api` for imperative control | Must |
| US-ADP-11 | As an app developer, I pass controlled `sortModel` prop that stays in sync with API changes | Must |
| US-ADP-12 | As an app developer, custom React/Vue cell renderers mount only for visible virtualized cells | Must |

### Tier 3 (Angular + Web Component)

| ID | Story | Priority |
|----|-------|----------|
| US-ADP-13 | As an Angular developer, I use standalone `OlGridComponent` with OnPush + signals | Must |
| US-ADP-14 | As an Angular developer, dynamic cell renderers use `ViewContainerRef` | Must |
| US-ADP-15 | As a platform team, I embed `<ol-grid>` in static HTML without React/Vue | Must |
| US-ADP-16 | As a developer, I theme the Web Component via host CSS custom properties (no Shadow DOM) | Must |
| US-ADP-17 | As a canvas-grid user, adapters work with `CanvasRenderer` + companion a11y DOM | Should |

---

## 4. Functional Requirements

### 4.1 Common adapter contract (all frameworks)

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-ADP-01 | Exactly one `GridEngine` instance MUST exist per adapter instance | Must |
| REQ-ADP-02 | `GridStore` MUST be the single source of truth — adapters MUST NOT fork row/sort/filter state | Must |
| REQ-ADP-03 | Engine MUST be created on first mount with initial `GridOptions` | Must |
| REQ-ADP-04 | `engine.mount(hostElement, renderer)` MUST run once host is attached | Must |
| REQ-ADP-05 | Options changes MUST call `engine.setGridOption` / sync — NOT recreate engine unless `key` forces remount | Must |
| REQ-ADP-06 | `destroy()` MUST run on adapter teardown; idempotent | Must |
| REQ-ADP-07 | `onGridReady` MUST fire with `{ api, context }` after successful mount | Must |
| REQ-ADP-08 | Every adapter MUST expose identical `GridApi` surface (module-augmented) | Must |
| REQ-ADP-09 | Event callbacks on `GridOptions` MUST survive partial option updates | Must |
| REQ-ADP-10 | Adapters MUST NOT depend on each other (`@ol-grid/react` ↮ `@ol-grid/vue`) | Must |
| REQ-ADP-11 | Package `sideEffects: false` except documented CSS imports | Must |
| REQ-ADP-12 | Dual ESM/CJS builds MUST pass `publint` | Must |

### 4.2 Store subscription

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-ADP-20 | Adapters MUST subscribe to `engine.getStore()` for renderer-driving updates | Must |
| REQ-ADP-21 | React MUST use `useSyncExternalStore` (React 18+) for store subscription | Must |
| REQ-ADP-22 | Vue MUST use `watch` with appropriate flush for scroll-critical paths | Must |
| REQ-ADP-23 | Svelte MUST bridge store via runes (5) or `readable`/`derived` (4) | Must |
| REQ-ADP-24 | Angular MUST use Signals or `markForCheck` on store emit with OnPush | Must |

### 4.3 Controlled mode (Tier 2)

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-ADP-30 | External `sortModel`, `filterModel`, `rowSelection` props MUST sync to store when provided | Must |
| REQ-ADP-31 | Controlled props + imperative API MUST produce identical grid state | Must |
| REQ-ADP-32 | When controlled prop is `undefined`, slice operates uncontrolled | Must |
| REQ-ADP-33 | Internal user changes MUST emit callbacks so parent can update controlled props | Must |

### 4.4 Framework cell components

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-ADP-40 | `columnDefs.cellRenderer` MUST accept framework component type + adapter resolver | Must |
| REQ-ADP-41 | Cell components MUST mount only for visible virtual range; unmount on scroll exit | Must |
| REQ-ADP-42 | Cell renderer params MUST include: `value`, `data`, `api`, `colDef`, `context`, `refresh` | Must |
| REQ-ADP-43 | React MUST NOT call `createRoot` per cell — use shared portal map | Must |
| REQ-ADP-44 | Vue MUST use `h()` + pool or Teleport pattern | Must |
| REQ-ADP-45 | Angular MUST use `ViewContainerRef.createComponent` | Must |
| REQ-ADP-46 | Svelte 5 MUST use `mount()`; Svelte 4 `new Component` | Must |

### 4.5 React adapter (`@ol-grid/react`)

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-ADP-REACT-01 | Export `OlGrid`, `useOlGrid`, types `OlGridProps`, `OlGridHandle` | Must |
| REQ-ADP-REACT-02 | `OlGrid` accepts spread `GridOptions<TData>` + optional `className`, `style` | Must |
| REQ-ADP-REACT-03 | `forwardRef` to `OlGridHandle { api }` | Must |
| REQ-ADP-REACT-04 | Build output MUST include `"use client"` directive (NFR-E-04) | Must |
| REQ-ADP-REACT-05 | Host: empty `<div ref={hostRef} className="ol-grid-host" />` | Must |
| REQ-ADP-REACT-06 | Sync on change: `columnDefs`, `rowData`, `rowHeight`, `rowSelection`, `getRowId`, `context`, `quickFilterText` | Must |
| REQ-ADP-REACT-07 | Provide `GridApiContext` + `GridOptionsContext` for cell renderers | Should |

### 4.6 Vanilla adapter (`@ol-grid/vanilla`)

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-ADP-VAN-01 | `createGrid<TData>(host, options): GridInstance` | Must |
| REQ-ADP-VAN-02 | `GridInstance` exposes `{ engine, api, destroy() }` | Must |
| REQ-ADP-VAN-03 | `destroy()` MUST be idempotent | Must |
| REQ-ADP-VAN-04 | Document difference vs `@ol-grid/core` engine-only export | Should |

### 4.7 Vue adapter (`@ol-grid/vue`) — Tier 2

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-ADP-VUE-01 | `useOlGrid(options)` composable returns `{ api, … }` | Must |
| REQ-ADP-VUE-02 | `<OlGrid>` with kebab-case props mapping to camelCase `GridOptions` | Must |
| REQ-ADP-VUE-03 | `provide('gridApi', api)` for cell renderer injection | Must |
| REQ-ADP-VUE-04 | Peer dependency `vue >= 3.4` | Must |

### 4.8 Svelte adapter (`@ol-grid/svelte`) — Tier 2

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-ADP-SVELTE-01 | `<OlGrid bind:api on:gridReady={fn} />` | Must |
| REQ-ADP-SVELTE-02 | `onMount` → mount; `onDestroy` → destroy | Must |
| REQ-ADP-SVELTE-03 | Peer `svelte >= 4` (5 compatible) | Must |

### 4.9 Angular adapter (`@ol-grid/angular`) — Tier 3

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-ADP-NG-01 | Standalone `OlGridComponent` selector `ol-grid` | Must |
| REQ-ADP-NG-02 | `@Input()` option slices; `@Output() gridReady` | Must |
| REQ-ADP-NG-03 | `ChangeDetectionStrategy.OnPush` + signals | Must |
| REQ-ADP-NG-04 | Peer `@angular/core >= 17` | Must |

### 4.10 Web Component (`@ol-grid/web-component`) — Tier 3

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-ADP-WC-01 | Custom element tag `ol-grid` | Must |
| REQ-ADP-WC-02 | Observed attributes for primitives: `row-height`, `theme` | Must |
| REQ-ADP-WC-03 | Properties for `columnDefs`, `rowData` object/array assignment | Must |
| REQ-ADP-WC-04 | Dispatch `grid-ready` `CustomEvent` with `detail.api` | Must |
| REQ-ADP-WC-05 | Shadow DOM disabled by default (NFR-T-06) | Must |
| REQ-ADP-WC-06 | Lit recommended for implementation; `lit` dep only in this package | Should |

---

## 5. API & Events

### 5.1 React public API

```typescript
interface OlGridProps<TData> extends GridOptions<TData> {
  className?: string;
  style?: React.CSSProperties;
}

interface OlGridHandle<TData> {
  api: GridApi<TData>;
}

function OlGrid<TData>(props: OlGridProps<TData>): JSX.Element; // forwardRef → OlGridHandle

function useOlGrid<TData>(options: GridOptions<TData>): {
  api: GridApi<TData> | null;
  hostRef: React.RefObject<HTMLDivElement>;
};
```

### 5.2 Vanilla public API

```typescript
interface GridInstance<TData> {
  engine: GridEngine<TData>;
  api: GridApi<TData>;
  destroy(): void;
}

function createGrid<TData>(
  host: HTMLElement,
  options: GridOptions<TData>,
): GridInstance<TData>;
```

### 5.3 Vue public API (Tier 2)

```typescript
// Composable
function useOlGrid<TData>(options: MaybeRef<GridOptions<TData>>): {
  api: Ref<GridApi<TData> | null>;
};

// Component: OlGrid.vue — props mirror GridOptions with kebab-case in templates
```

### 5.4 Svelte public API (Tier 2)

```svelte
<OlGrid {columnDefs} {rowData} bind:api on:gridReady={handleReady} />
```

### 5.5 Web Component (Tier 3)

```html
<ol-grid id="grid"></ol-grid>
<script>
  const el = document.getElementById('grid');
  el.columnDefs = [...];
  el.rowData = [...];
  el.addEventListener('grid-ready', (e) => e.detail.api.sizeColumnsToFit());
</script>
```

### 5.6 Package dependency matrix

| Package | Depends on | Peer deps |
|---------|-----------|-----------|
| `@ol-grid/react` | core, dom-renderer | react >= 18 |
| `@ol-grid/vue` | core, dom-renderer | vue >= 3.4 |
| `@ol-grid/svelte` | core, dom-renderer | svelte >= 4 |
| `@ol-grid/angular` | core, dom-renderer | @angular/core >= 17 |
| `@ol-grid/vanilla` | core, dom-renderer | — |
| `@ol-grid/web-component` | core, dom-renderer, lit? | — |

---

## 6. AG Grid Parity

| AG Grid integration | ol-grid equivalent | Tier | Notes |
|---------------------|-------------------|------|-------|
| React `AgGridReact` | `<OlGrid />` + ref | T1 | |
| `onGridReady` + `api` ref | Same event name | T1 | |
| Vue 3 `AgGridVue` | `<OlGrid />` + composable | T2 | |
| Angular `AgGridAngular` | `OlGridComponent` | T3 | |
| Vanilla `createGrid` | `createGrid(host, options)` | T1 | |
| Web Component | `<ol-grid>` | T3 | ol-grid value-add |
| `frameworkComponents` | Adapter-specific registry | T1–T3 | Breaking rename to component refs |
| Controlled `rowData` | Same | T1 | |
| React Server Components | `"use client"` on adapter | T1 | AG Grid documents similarly |

---

## 7. Competitive Analysis

| Library | Adapter model | Strengths | ol-grid opportunity |
|---------|---------------|-----------|---------------------|
| **AG Grid** | Per-framework packages | Mature, full feature surface | Lighter adapters; same API familiarity |
| **TanStack Table** | Headless hooks per framework | Tiny, composable | ol-grid adds default renderer + less boilerplate |
| **MUI Data Grid** | React-only | Material integration | Multi-framework equal-first |
| **Glide Data Grid** | React-only | Canvas perf | DOM default + optional canvas via same adapters |
| **RevoGrid** | Web Component primary | Embed anywhere | Native adapters + WC |

**Positioning:** Adapters should feel like AG Grid's `AgGridReact` with ≤20% API mapping changes for Tier 1 demos.

---

## 8. Tier Assignment

| Capability | Tier | Rationale |
|------------|------|-----------|
| React + vanilla adapters, `onGridReady`, basic options sync | **T1** | MVP delivery path |
| Vue + Svelte, controlled mode, cell renderer portals | **T2** | AG Grid Community multi-framework parity |
| Angular + Web Component, canvas renderer adapter path | **T3** | Enterprise embed + scale scenarios |

---

## 9. Acceptance Criteria

### 9.1 Tier 1 exit

- [ ] React basic example matches vanilla on sort, select, scroll behavior
- [ ] `ref.current.api.exportDataAsCsv()` works from React
- [ ] Unmount leaves zero store subscribers (heap/listener leak test)
- [ ] TypeScript infers `TData` from `rowData` prop
- [ ] `@ol-grid/react` + core + dom-renderer + sort ≤ 80 KB gzip (NFR-B-04)
- [ ] Integration tests: mount, sort header click, row select, scroll virtual, unmount

### 9.2 Tier 2 exit

- [ ] Vue example feature parity with React basic demo
- [ ] Svelte `bind:api` imperative calls work
- [ ] Controlled `quickFilterText` and `sortModel` props sync bidirectionally
- [ ] Custom React cell renderer demo mounts/unmounts with scroll (portal pool)
- [ ] Vue dynamic cell renderer via `provide/inject`

### 9.3 Tier 3 exit

- [ ] Angular dynamic cell renderer demo with OnPush
- [ ] WC embed works in static HTML without bundler
- [ ] WC theming via host CSS variables (no Shadow DOM)
- [ ] Canvas renderer swap via `renderer: 'canvas'` option in React adapter

### 9.4 Anti-patterns (document in adapter guides)

- Duplicating `rowData` in `useState` and engine
- Creating new engine every React render
- Inline `columnDefs` without memoization causing full column reset
- Mounting grid in container with zero height (no viewport)

---

## 10. Dependencies

| Dependency | Relationship |
|------------|--------------|
| `@ol-grid/core` | `GridEngine`, `GridStore`, `GridApi`, `GridOptions` |
| `@ol-grid/dom-renderer` | Default renderer mounted by adapters |
| `@ol-grid/canvas-renderer` | Optional renderer (T3) |
| [core-engine.md](./core-engine.md) | Engine lifecycle contract |
| [grid-api-and-events.md](./grid-api-and-events.md) | Public API surface adapters expose |
| [plugin-module-system.md](./plugin-module-system.md) | Feature modules registered by app, not adapter |
| [virtualization.md](./virtualization.md) | Cell portal mount range driven by virtualizer |
| [accessibility.md](./accessibility.md) | Keyboard/a11y owned by core+renderer, not adapter |

**Blocked by:** Stable `GridEngine.mount` / `destroy` (implemented).

**Blocks:** Framework cell renderer examples, migration guide adapter sections.

---

## 11. Open Questions

| # | Question | Options | Recommendation |
|---|----------|---------|----------------|
| OQ-ADP-01 | Official Next.js/Nuxt wrappers | First-party / community | Community first (REQUIREMENTS OQ-5) |
| OQ-ADP-02 | Long-term: native adapters vs WC-only | Native primary / WC primary | Native adapters primary; WC for embed |
| OQ-ADP-03 | Export `useOlGrid` from React only? | React-only / all frameworks | React + Vue composable; Svelte uses bind |
| OQ-ADP-04 | WC tag name collision | `ol-grid` / `ol-data-grid` | `ol-grid`; document override if needed |
| OQ-ADP-05 | Duplicate engine if hook + component misused | Document / runtime warn | Runtime dev warning in strict mode |

---

## 12. References

- [REQUIREMENTS.md §4.1.5](../REQUIREMENTS.md) — T1-AD-* adapter requirements
- [REQUIREMENTS.md §4.2.7](../REQUIREMENTS.md) — T2 Vue/Svelte + controlled mode
- [REQUIREMENTS.md §4.3.5](../REQUIREMENTS.md) — T3 Angular + Web Component
- [ARCHITECTURE.md §4](../ARCHITECTURE.md) — Adapter layer design
- [core-engine.md](./core-engine.md) — Engine ownership boundaries
- [ag-grid-migration.md](./ag-grid-migration.md) — `AgGridReact` mapping
- Implementation: `packages/react/`, `packages/vanilla/`, `examples/react/`, `examples/vanilla/`

---

*This document is authoritative for framework adapter scope. Core behavior changes require [core-engine.md](./core-engine.md) alignment.*

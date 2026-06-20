# Feature Requirements: Debug Mode

> **Package target:** `@ol-grid/debug` (`DebugModule`); thin no-op stubs in `@ol-grid/core` for tree-shaking  
> **Parent spec:** [REQUIREMENTS.md](../REQUIREMENTS.md) §5.1 (NFR-D), §6.6 (modules)  
> **Architecture:** [ARCHITECTURE.md](../ARCHITECTURE.md) §3.8 (plugin/module system)  
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

Debug mode is **developer infrastructure** for ol-grid: opt-in, namespaced console logging and lightweight diagnostic hooks across core subsystems and feature modules. It leverages the existing `ModuleRegistry` / `GridModule` architecture so each package (keyboard nav, virtualization, editing, etc.) can emit structured logs without coupling production bundles to `console` overhead.

Debug mode is **not** an end-user feature. It exists to shorten time-to-diagnose for grid authors, framework adapter maintainers, and ol-grid contributors — especially for subtle interaction bugs (focus, scroll, column width, pipeline ordering).

### 1.1 Scope

| Area | Debug category | Tier |
|------|----------------|------|
| Keyboard navigation & focus | `keyboard` | T1 |
| Scroll & row/column virtualization | `scroll` | T1 |
| Column layout, flex, pinned widths, render width | `column` | T1 |
| Cell editing lifecycle | `editing` | T2 |
| Row/cell selection | `selection` | T1 |
| CSRM / module pipeline stages | `pipeline` | T1 |
| Module registration & grid lifecycle | `module`, `lifecycle` | T1 |
| Catch-all | `all` | T1 |

### 1.2 Non-goals

- Visual debug overlays (column guides, virtualizer bands) — future optional `DebugPlugin` T3
- Remote logging / telemetry / analytics pipelines
- Production error reporting (Sentry, etc.) — app responsibility
- Time-travel replay UI (serializable state is separate; see REQUIREMENTS.md NFR-D)
- AG Grid `ValidationModule` equivalent (separate future spec)

---

## 2. Current Implementation Status

| Capability | Status | Location |
|------------|--------|----------|
| `debug` GridOption | **Not implemented** | — |
| `@ol-grid/debug` package | **Not implemented** | — |
| `DebugModule` / `DebugLogger` API | **Not implemented** | — |
| Namespaced `[ol-grid:keyboard]` logs | **Partial** | `packages/dom-renderer/src/dom-renderer.ts` — always on; MUST gate behind debug |
| Dev-only module registry warnings | **Partial** | `packages/core/src/modules/module-registry.ts` — `[ol-grid]` prefix, `NODE_ENV` check |
| Category-scoped logging in virtualization | **Not implemented** | — |
| Category-scoped logging in column model | **Not implemented** | — |
| Category-scoped logging in selection | **Not implemented** | — |
| Category-scoped logging in editing | **Not implemented** | — |
| Pipeline stage timing logs | **Not implemented** | — |
| Production tree-shake / zero-cost no-op | **Not implemented** | — |
| PII / cell-value redaction policy | **Not implemented** | — |

---

## 3. User Stories

### Tier 1

| ID | Story | Priority |
|----|-------|----------|
| US-DBG-01 | As a grid developer, I set `debug: true` and see namespaced console output when I navigate with the keyboard | Must |
| US-DBG-02 | As a grid developer, I set `debug: ['keyboard', 'scroll']` to limit noise to those subsystems | Must |
| US-DBG-03 | As a contributor, I add debug logs in a feature module using a shared `DebugLogger` without importing `@ol-grid/debug` in production apps | Must |
| US-DBG-04 | As a grid developer, my production build has zero debug code when I do not register `DebugModule` | Must |
| US-DBG-05 | As a grid developer, debug logs never include raw cell values or user PII by default | Must |

### Tier 2

| ID | Story | Priority |
|----|-------|----------|
| US-DBG-06 | As a grid developer, I toggle debug categories at runtime via `api.setDebug(...)` | Should |
| US-DBG-07 | As a contributor, pipeline stage logs show stage name, input/output row counts, and duration | Should |
| US-DBG-08 | As a grid developer, column debug logs explain flex distribution and pinned width totals | Should |
| US-DBG-09 | As a framework adapter author, I see lifecycle logs (mount, destroy, StrictMode remount) | Should |

---

## 4. Functional Requirements

### 4.1 Module & package (`@ol-grid/debug`)

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-DBG-01 | ol-grid MUST ship `@ol-grid/debug` as a separate package exporting `DebugModule` | Must |
| REQ-DBG-02 | `DebugModule` MUST register via `ModuleRegistry.register(DebugModule)` or per-grid `modules: [DebugModule]` | Must |
| REQ-DBG-03 | Without `DebugModule` registered, all `debugLog(category, ...)` calls MUST be no-ops with zero `console` invocation | Must |
| REQ-DBG-04 | `DebugModule` MUST expose `onGridCreate` hook that reads `GridOptions.debug` and installs a per-grid `DebugLogger` on `GridContext` | Must |
| REQ-DBG-05 | `DebugModule` MUST depend on no feature modules; feature modules MAY call debug helpers optionally | Must |
| REQ-DBG-06 | Core MUST export `createDebugLogger(ctx, category)` that returns no-op logger when `DebugModule` absent | Must |
| REQ-DBG-07 | `DebugModule.onGridDestroy` MUST remove logger reference and clear timers | Must |
| REQ-DBG-08 | Importing `@ol-grid/debug` without `register()` MUST NOT activate logging (same tree-shake contract as other modules) | Must |

### 4.2 GridOptions `debug` flag

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-DBG-10 | `GridOptions.debug` type MUST be `boolean \| DebugCategory[]` | Must |
| REQ-DBG-11 | `debug: true` MUST enable all categories (equivalent to `['all']`) | Must |
| REQ-DBG-12 | `debug: false` or omitted MUST disable all category logs | Must |
| REQ-DBG-13 | `debug: ['keyboard', 'scroll']` MUST enable only listed categories; unknown category strings MUST warn once in dev | Should |
| REQ-DBG-14 | `debug` MUST be read at grid create; runtime changes via `api.setDebug` (T2) MUST hot-update enabled set | Should |
| REQ-DBG-15 | `debug` MUST NOT persist in `getState()` / column state snapshots | Must |
| REQ-DBG-16 | When `debug` is enabled but `DebugModule` is not registered, grid MUST emit one dev warning: debug option ignored | Must |

### 4.3 Logger API & console format

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-DBG-20 | Each category MUST log with prefix `[ol-grid:<category>]` (e.g. `[ol-grid:keyboard]`, `[ol-grid:scroll]`) | Must |
| REQ-DBG-21 | Log signature MUST be `logger.log(event: string, data?: Record<string, unknown>)` — event is a stable machine-readable slug | Must |
| REQ-DBG-22 | Logger MUST use `console.log` (not `warn`/`error`) unless `logger.warn` explicitly used for misconfiguration | Must |
| REQ-DBG-23 | `data` payloads MUST be plain JSON-serializable objects (no DOM nodes, no functions) | Must |
| REQ-DBG-24 | Logger MUST support `logger.time(label)` / `logger.timeEnd(label)` for pipeline and scroll perf spans | Should |
| REQ-DBG-25 | Duplicate log suppression: identical event+data within 16 ms MAY be coalesced (scroll burst) | Could |
| REQ-DBG-26 | Global prefix `[ol-grid]` reserved for core/module-registry messages unrelated to categories | Must |

### 4.4 Category: `keyboard`

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-DBG-30 | Keyboard category MUST log keydown handling: key, `defaultPrevented`, focused cell `{rowIndex, colId}`, active element descriptor | Must |
| REQ-DBG-31 | Keyboard category MUST log focus sentinel redirects and host refocus | Must |
| REQ-DBG-32 | Keyboard category MUST log `moveFocusedCell` proposals and clamp/no-op outcomes | Should |
| REQ-DBG-33 | Keyboard category MUST log `ensureIndexVisible` / `ensureColumnVisible` scroll deltas when triggered by nav | Should |
| REQ-DBG-34 | Existing `dom-renderer` `logKeyboard` MUST migrate to `DebugLogger` and MUST NOT log when `keyboard` category disabled | Must |

### 4.5 Category: `scroll` (virtualization)

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-DBG-40 | Scroll category MUST log visible row range changes: `{firstRow, lastRow, totalRows, scrollTop}` | Must |
| REQ-DBG-41 | Scroll category MUST log overscan expansion when range changes | Should |
| REQ-DBG-42 | Scroll category MUST log horizontal virtual column range when column virtualization enabled (T3) | Could |
| REQ-DBG-43 | Scroll category MUST log programmatic scroll (`ensureIndexVisible`) with before/after scroll positions | Should |
| REQ-DBG-44 | Scroll category MUST NOT log on every scroll event frame by default; MUST log on range boundary change or when `debugVerboseScroll: true` (T2) | Should |

### 4.6 Category: `column` (layout & render width)

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-DBG-50 | Column category MUST log flex distribution: viewport width, fixed total, flex count, per-column computed widths | Should |
| REQ-DBG-51 | Column category MUST log resize events: `{colId, oldWidth, newWidth, source}` | Should |
| REQ-DBG-52 | Column category MUST log pinned region width totals (left/center/right) | Should |
| REQ-DBG-53 | Column category MUST log render width mismatches (DOM measured vs model width) when detectable | Could |

### 4.7 Category: `editing`

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-DBG-60 | Editing category MUST log edit start/stop/cancel/commit with `{rowIndex, colId}` only — no cell value | Must |
| REQ-DBG-61 | Editing category MUST log validation failures as `{rowIndex, colId, reason}` without raw invalid value | Must |
| REQ-DBG-62 | Editing category MUST log Tab/Enter navigation handoff to keyboard module | Should |

### 4.8 Category: `selection`

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-DBG-70 | Selection category MUST log selection changes: `{mode, addedCount, removedCount, totalSelected}` | Must |
| REQ-DBG-71 | Selection category MUST log select-all and header checkbox toggles | Should |
| REQ-DBG-72 | Selection category MUST NOT log selected row objects or cell values | Must |

### 4.9 Category: `pipeline`

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-DBG-80 | Pipeline category MUST log each row-model stage run: `{stage, order, inputCount, outputCount, durationMs}` | Must |
| REQ-DBG-81 | Pipeline category MUST log full pipeline re-run vs incremental stage subset (T2) | Should |
| REQ-DBG-82 | Pipeline category MUST log stage skip when dependency unchanged | Could |

### 4.10 Category: `module` & `lifecycle`

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-DBG-90 | Module category MUST log module registration: `{name, version, dependencies}` | Should |
| REQ-DBG-91 | Lifecycle category MUST log grid create/destroy with `{gridId}` | Should |
| REQ-DBG-92 | Lifecycle category MUST log renderer mount/unmount | Should |
| REQ-DBG-93 | Module category duplicate-registration warnings MUST respect debug `module` category (migrate from ad-hoc `console.warn`) | Should |

### 4.11 Privacy, security & production safety

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-DBG-100 | Debug logs MUST NOT include cell values, row data fields, filter text, clipboard contents, or API keys by default | Must |
| REQ-DBG-101 | `GridOptions.debugIncludeValues?: boolean` MAY opt in to value logging for local dev only; MUST log one-time warning when enabled | Could |
| REQ-DBG-102 | Debug helpers MUST redact keys matching `/password|token|secret|authorization/i` in any logged object | Must |
| REQ-DBG-103 | Documentation MUST state debug mode is dev-only and MUST NOT be enabled in production user sessions | Must |
| REQ-DBG-104 | When `NODE_ENV === 'production'`, `debug: true` SHOULD emit `console.warn` recommending disable (does not block) | Should |

### 4.12 Non-functional (bundle & performance)

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-DBG-110 | `@ol-grid/debug` gzip budget | ≤ 5 KB | Must |
| REQ-DBG-111 | Apps that do not import `@ol-grid/debug` MUST pass bundle analyzer with no debug strings | Must |
| REQ-DBG-112 | Enabled debug mode MUST NOT measurably regress scroll FPS (> 5% p95) on 100k benchmark | Should |
| REQ-DBG-113 | `sideEffects: false` on `@ol-grid/debug` | Must |

---

## 5. API & Events

### 5.1 Types

```typescript
type DebugCategory =
  | 'all'
  | 'keyboard'
  | 'scroll'
  | 'column'
  | 'editing'
  | 'selection'
  | 'pipeline'
  | 'module'
  | 'lifecycle';

interface DebugLogger {
  isEnabled(): boolean;
  log(event: string, data?: Record<string, unknown>): void;
  warn(event: string, data?: Record<string, unknown>): void;
  time(label: string): void;
  timeEnd(label: string): void;
}

interface GridOptions<TData> {
  /** Enable debug logging. Requires DebugModule registered. */
  debug?: boolean | DebugCategory[];
  /** DANGER: include cell values in logs — local dev only */
  debugIncludeValues?: boolean;
  /** Log every scroll event, not just range changes */
  debugVerboseScroll?: boolean;
}
```

### 5.2 GridApi (T2)

```typescript
interface GridApi<TData> {
  getDebugCategories(): DebugCategory[] | false;
  setDebug(debug: boolean | DebugCategory[]): void;
}
```

### 5.3 Module definition

```typescript
// @ol-grid/debug
export const DebugModule: GridModule = {
  name: 'DebugModule',
  version: '1.0.0',

  storeSlices: {
    debug: { categories: [] as DebugCategory[], includeValues: false },
  },

  apiExtensions: {
    getDebugCategories(api) { /* ... */ },
    setDebug(api, debug) { /* ... */ },
  },

  onGridCreate(ctx) {
    const opts = ctx.getOptions();
    // resolve categories from opts.debug → attach DebugLogger to ctx
  },

  onGridDestroy(ctx) {
    // teardown
  },
};

// Consumer
import { DebugModule } from '@ol-grid/debug';
import { ModuleRegistry, createGrid } from '@ol-grid/core';

ModuleRegistry.register(DebugModule);

const grid = createGrid(host, {
  debug: ['keyboard', 'scroll'],
  columnDefs,
  rowData,
});
```

### 5.4 Feature package integration pattern

```typescript
// In @ol-grid/dom-renderer or @ol-grid/core keyboard handler
import { createDebugLogger } from '@ol-grid/core';

function handleKeyDown(ctx: GridContext, event: KeyboardEvent) {
  const log = createDebugLogger(ctx, 'keyboard');
  log.log('keydown', {
    key: event.key,
    focused: describeCell(ctx.getFocusedCell()),
  });
  // ...
}
```

When `DebugModule` is not registered, `createDebugLogger` returns a shared no-op singleton (no allocations per call).

### 5.5 Events

Debug mode does **not** emit grid events by default. Future `debugLog` event is **non-goal** v1 (console-only).

---

## 6. AG Grid Parity

Reference: [AG Grid `debug` GridOption](https://www.ag-grid.com/javascript-data-grid/grid-options/)

| AG Grid feature | ol-grid equivalent | Notes |
|-----------------|-------------------|-------|
| `debug: boolean` | `debug: boolean \| DebugCategory[]` | ol-grid adds category scoping |
| Extra console logging | Namespaced `[ol-grid:<category>]` | More structured than AG Grid |
| React re-render diagnostics | Not in v1 | AG Grid logs prop reference changes |
| `ValidationModule` | Not in v1 | Separate future spec |
| `gridId` in logs | `lifecycle` category + `gridId` option | Partial parity |

**Parity stance:** Match AG Grid's opt-in `debug: true` boolean for quick start; exceed with category filters and module-tree-shaking. No requirement to replicate AG Grid's React-specific prop-diff spam.

---

## 7. Competitive Analysis

| Library | Debug / diagnostics | ol-grid stance |
|---------|---------------------|----------------|
| **AG Grid** | `debug: true` + ValidationModule | Boolean parity + categories |
| **TanStack Table** | None built-in | ol-grid provides first-party tooling |
| **MUI Data Grid** | Limited `logger` prop (MUI X Pro) | MIT debug module for all tiers |
| **Glide Data Grid** | `debug` flag on component | Similar; ol-grid module-scoped |
| **RevoGrid** | DevTools plugin | ol-grid console-first; overlay later |

---

## 8. Tier Assignment

| Capability | Tier |
|------------|------|
| `DebugModule`, `debug: boolean`, categories `keyboard` / `scroll` / `selection` / `pipeline`, no-op tree-shaking, PII policy | T1 |
| Categories `column` / `editing` / `module` / `lifecycle`, `api.setDebug`, `debugVerboseScroll`, pipeline timing | T2 |
| Visual debug overlay plugin, `debugIncludeValues`, column render mismatch detection | T3 / optional |

---

## 9. Acceptance Criteria

### 9.1 Acceptance criteria table

| REQ-ID | Testable criterion |
|--------|-------------------|
| REQ-DBG-01 | `@ol-grid/debug` package exists in monorepo with `DebugModule` export |
| REQ-DBG-02 | Example app registers `DebugModule`; without registration, `debug: true` warns once |
| REQ-DBG-03 | Bundle test: core-only app contains no `[ol-grid:keyboard]` strings |
| REQ-DBG-04 | With `debug: ['keyboard']`, keydown produces `[ol-grid:keyboard]` lines; `scroll` lines absent |
| REQ-DBG-10 | `debug: true` enables all categories; `false` enables none |
| REQ-DBG-16 | `debug: true` without module → single `[ol-grid:module]` warning |
| REQ-DBG-20 | All log lines match `/^\[ol-grid:\w+\]/` prefix pattern |
| REQ-DBG-30 | Arrow key on grid logs event slug `keydown` with `key` and `focused` fields |
| REQ-DBG-34 | `dom-renderer` keyboard logs silent when `debug` off or category excluded |
| REQ-DBG-40 | Scroll until row range changes → one `scroll` log with `firstRow`/`lastRow` |
| REQ-DBG-60 | Start edit → `editing` log with row/col; no `value` key in payload |
| REQ-DBG-70 | Toggle row selection → `selection` log with counts only |
| REQ-DBG-80 | Mutate `rowData` → `pipeline` logs each stage with counts and `durationMs` |
| REQ-DBG-100 | Fuzz test: enable all categories, perform operations → no cell string values in console |
| REQ-DBG-102 | Log object `{ password: 'x' }` → output shows `[REDACTED]` |
| REQ-DBG-111 | `esbuild` analyze: minimal app without `@ol-grid/debug` import → 0 debug package bytes |
| REQ-DBG-112 | BENCH-01 with `debug: ['scroll','keyboard']` → p95 within 5% of baseline |

### 9.2 Tier 1 checklist

- [ ] `DebugModule` registered in vanilla + React examples behind `?debug=1` URL flag or dev-only toggle
- [ ] `debug: true` prints keyboard nav logs with `[ol-grid:keyboard]` prefix
- [ ] `debug: ['scroll']` prints virtualization range changes only
- [ ] No debug output when `DebugModule` not registered
- [ ] Production build (`NODE_ENV=production`) tree-shakes `@ol-grid/debug` when not imported
- [ ] Unit tests: `createDebugLogger` no-op without module; enabled with module + option

### 9.3 Tier 2 checklist

- [ ] `api.setDebug(['pipeline'])` toggles pipeline logs without remount
- [ ] Column flex recalc logs width breakdown
- [ ] Edit start/stop logs present without values
- [ ] `getDebugCategories()` returns active set

---

## 10. Dependencies

| Dependency | Role |
|------------|------|
| `@ol-grid/core` | `GridContext`, `createDebugLogger` stub, `GridOptions.debug` type |
| `@ol-grid/debug` | `DebugModule`, `DebugLogger` implementation |
| [plugin-module-system.md](./plugin-module-system.md) | Module registration, tree-shaking contract |
| [keyboard-navigation.md](./keyboard-navigation.md) | Keyboard event slugs, focus model vocabulary |
| [virtualization.md](./virtualization.md) | Visible range semantics |
| [column-model.md](./column-model.md) | Flex / pin width vocabulary |
| [cell-editing.md](./cell-editing.md) | Edit lifecycle event slugs |
| [selection.md](./selection.md) | Selection change semantics |
| [client-side-row-model.md](./client-side-row-model.md) | Pipeline stage names |
| [performance-and-bundle.md](./performance-and-bundle.md) | Bundle budget REQ-DBG-110, BENCH-01 gate |

---

## 11. Open Questions

| # | Question | Options | Recommendation |
|---|----------|---------|----------------|
| OQ-DBG-01 | Package name `@ol-grid/debug` vs debug built into core | Separate / core | Separate module (`MOD-PKG-01`) |
| OQ-DBG-02 | `console.log` vs `debug` (Node) / custom `logFn` injectable | console only / injectable | `console` default; `debugLogFn` GridOption T2 |
| OQ-DBG-03 | Auto-register `DebugModule` in dev via `createGrid` | Yes / no | No — explicit register only |
| OQ-DBG-04 | URL query `?ol-grid-debug=keyboard,scroll` auto-enable in examples | Yes / no | Examples only T1 |
| OQ-DBG-05 | Integrate with `ValidationModule` when it exists | Shared logger / separate | Shared `DebugLogger` T2 |

---

## 12. References

- [REQUIREMENTS.md §5.1 NFR-D](../REQUIREMENTS.md) — developer experience, serializable state
- [REQUIREMENTS.md §6.6](../REQUIREMENTS.md) — module system
- [ARCHITECTURE.md §3.8](../ARCHITECTURE.md) — `GridModule` contract
- [plugin-module-system.md](./plugin-module-system.md) — `ModuleRegistry`, tree-shaking
- [performance-and-bundle.md](./performance-and-bundle.md) — bundle budgets
- [AG Grid debug GridOption](https://www.ag-grid.com/javascript-data-grid/grid-options/)
- Implementation (interim): `packages/dom-renderer/src/dom-renderer.ts` → `logKeyboard` (to migrate)

---

*Authoritative for debug mode scope.*

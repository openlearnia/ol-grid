# Feature Requirements: Keyboard Navigation

> **Package target:** `@ol-grid/core` (navigation state machine); key handling in `@ol-grid/dom-renderer`  
> **Parent spec:** [REQUIREMENTS.md](../REQUIREMENTS.md) §4.1.4, §5.3  
> **Architecture:** [ARCHITECTURE.md](../ARCHITECTURE.md) §3.5, §7.4  
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

Keyboard navigation is a **core-owned accessibility requirement** (NFR-A-01, G-05). ol-grid implements the [WAI-ARIA grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/) for cell focus, row selection shortcuts, header navigation, and edit triggers. Keyboard handling is centralized in core navigation logic; the DOM renderer dispatches `keydown` events to `GridEngine`.

Navigation MUST work identically across React, Vue, Angular, Svelte, vanilla, and Web Component adapters without per-framework duplication.

### 1.1 Scope

| Area | Tier |
|------|------|
| Cell focus (arrows, Home, End, Page Up/Down) | T1 |
| Edit triggers (Enter, F2, type-to-edit) | T2 |
| Row selection (Space, Shift+click equivalent) | T1/T2 |
| Tab / Shift+Tab cell traversal | T2 |
| Header keyboard navigation | T2 |
| Range extension (Shift+arrow) | T3 |
| Custom navigation callbacks | T2 |

### 1.2 Non-goals

- Vim-style keybindings (j/k)
- Spreadsheet A1 notation jump
- Global grid search (separate feature)

---

## 2. Current Implementation Status

| Capability | Status | Location |
|------------|--------|----------|
| Arrow key cell focus (4 directions) | **Implemented** | `dom-renderer.ts`, `grid-engine.moveFocusedCell` |
| Enter / F2 start edit | **Partial** | Implemented; edit incomplete |
| Escape cancel edit | **Implemented** | |
| Enter commit edit | **Implemented** | |
| Grid host `tabIndex=0` for focus | **Implemented** | `dom-renderer.ts` |
| Home / End | **Not implemented** | |
| Page Up / Page Down | **Not implemented** | |
| Ctrl+Home / Ctrl+End | **Not implemented** | |
| Tab / Shift+Tab between cells | **Partial** | Header→body dual behavior implemented |
| Floating filter Tab order | **Implemented** | Toolbar → floating filters → headers → body |
| Space toggles row selection | **Not implemented** | |
| Shift+arrow range extend | **Not implemented** | |
| `navigateToNextCell` callback | **Not implemented** | |
| `tabToNextCell` callback | **Not implemented** | |
| Header arrow navigation | **Not implemented** | |
| Tab from last header → body | **Implemented** | `focusBodyFromHeader`, `lastBodyFocusedCell` |
| Header Enter / Alt+Enter sort | **Not implemented** | |
| `suppressCellFocus` | **Not implemented** | |
| Screen reader live announcements | **Not implemented** | |
| Pinned column boundary navigation | **Partial** | Arrows move across regions; not tested |
| `ensureIndexVisible` on focus | **Partial** | |

---

## 3. User Stories

### Tier 1

| ID | Story | Priority |
|----|-------|----------|
| US-KB-01 | As a keyboard-only user, I Tab into the grid and see a visible focus ring on a cell | Must |
| US-KB-02 | As a keyboard-only user, I use arrow keys to move between cells | Must |
| US-KB-03 | As a keyboard-only user, I use Page Down to scroll down one viewport | Must |
| US-KB-04 | As a screen reader user, the grid exposes `role="grid"` with `gridcell` children | Must |
| US-KB-05 | As a keyboard-only user, focus does not escape the grid unexpectedly on arrow at edges | Must |

### Tier 2

| ID | Story | Priority |
|----|-------|----------|
| US-KB-06 | As a user, I press Space to toggle row selection on the focused row | Should |
| US-KB-07 | As a user, I use Tab to move to the next editable cell (see cell-editing.md) | Must |
| US-KB-08 | As a user, I use Home/End to jump to first/last column in row | Should |
| US-KB-09 | As a user, I use Ctrl+Home to jump to first cell in grid | Should |
| US-KB-10 | As an app developer, I override navigation with `navigateToNextCell` | Should |
| US-KB-11 | As a user, I navigate column headers with arrows and activate sort with Enter | Should |
| US-KB-12 | As a user with reduced motion, focus transitions respect `prefers-reduced-motion` | Should |

### Tier 3

| ID | Story | Priority |
|----|-------|----------|
| US-KB-13 | As a user, Shift+arrow extends cell selection range | Must |
| US-KB-14 | As a user, Ctrl+A selects all cells when `cellSelection` enabled | Should |
| US-KB-15 | As a user on canvas renderer, keyboard nav works via hidden a11y DOM | Must |

---

## 4. Functional Requirements

### 4.1 Focus management (T1)

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-KB-01 | Grid root MUST be focusable (`tabindex="0"`) or contain a focus sentinel | Must |
| REQ-KB-02 | Clicking a cell MUST move focus to grid and set `focusedCell` | Must |
| REQ-KB-03 | `ArrowUp/Down/Left/Right` MUST move `focusedCell` one cell; MUST `preventDefault` | Must |
| REQ-KB-04 | Navigation MUST NOT move focus outside grid unless Tab exits intentionally | Must |
| REQ-KB-05 | At first/last row, `ArrowUp`/`ArrowDown` MUST not throw; focus clamps or no-op | Must |
| REQ-KB-06 | At first/last column, `ArrowLeft`/`ArrowRight` MUST clamp or move to adjacent pin region | Must |
| REQ-KB-07 | Pinned left → center → right horizontal navigation MUST skip hidden columns | Must |
| REQ-KB-08 | Focused cell MUST scroll into view via `ensureIndexVisible` | Must |
| REQ-KB-09 | Focus ring MUST meet WCAG 2.4.7 contrast via `--ol-grid-focus-ring` token | Must |
| REQ-KB-10 | `suppressCellFocus: true` MUST disable cell focus UI and most key handlers | Should |
| REQ-KB-11 | While editing, arrow keys MAY be captured by editor unless `suppressKeyboardEvent` allows propagation | Should |

### 4.2 Page and home keys (T1/T2)

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-KB-20 | `PageDown` MUST move focus down by visible row count (viewport rows) | Must |
| REQ-KB-21 | `PageUp` MUST move focus up by visible row count | Must |
| REQ-KB-22 | `Home` MUST move to first column of current row | Should |
| REQ-KB-23 | `End` MUST move to last visible column of current row | Should |
| REQ-KB-24 | `Ctrl+Home` / `Cmd+Home` MUST move to first cell (row 0, first col) | Should |
| REQ-KB-25 | `Ctrl+End` / `Cmd+End` MUST move to last cell (last row, last col) | Should |

### 4.3 Selection keys (T1/T2)

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-KB-30 | `Space` on focused row MUST toggle row selection in multi mode | Should |
| REQ-KB-31 | `Space` MUST NOT scroll page when grid focused (`preventDefault`) | Should |
| REQ-KB-32 | `Shift+Space` MAY extend row selection range (T2) | Should |
| REQ-KB-33 | `Ctrl+A` with `cellSelection` MUST select all visible cells (T3) | Should |
| REQ-KB-34 | `Ctrl+A` without cell selection MUST NOT select all rows (match AG Grid) | Should |

### 4.4 Edit keys (T2 — cross-ref cell-editing.md)

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-KB-40 | `Enter` / `F2` on focused editable cell MUST start edit | Must |
| REQ-KB-41 | Printable character (no modifier) MUST start edit and seed character | Should |
| REQ-KB-42 | `Escape` during edit MUST cancel (handled by edit controller) | Must |
| REQ-KB-43 | `Tab` / `Shift+Tab` during edit MUST commit and navigate (edit module) | Must |
| REQ-KB-44 | `Ctrl+Enter` with range selection MUST fill value to range (T3) | Could |

### 4.5 Tab navigation (T2)

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-KB-50 | `Tab` from last grid cell MUST move focus to next focusable element after grid | Must |
| REQ-KB-51 | `Shift+Tab` from first cell MUST move focus before grid | Must |
| REQ-KB-52 | `tabToNextCell` callback MAY override default Tab target | Should |
| REQ-KB-53 | `tabToNextHeader` / `tabToNextGridContainer` MAY customize header Tab exit | Could |
| REQ-KB-54 | `enterNavigatesVertically` option MAY make Enter move down instead of edit | Could |
| REQ-KB-55 | `Tab` from last header MUST focus the **first visible navigable body cell** (top viewport row, first navigable column) when no prior body focus exists for this header visit | Must |
| REQ-KB-56 | `Tab` from last header MUST **restore the prior body cell** (row + colId) when the user moved to headers from a focused body cell; restored cell MUST scroll into view if off-screen | Must |
| REQ-KB-57 | Header→body Tab priority: restore prior body cell when valid; otherwise first visible navigable body cell | Must |

### 4.5.1 Tab from last header → body (decision: both behaviors)

When the user presses `Tab` on the **last column header**, focus enters the body rowgroup. ol-grid supports **two complementary behaviors** with explicit priority:

1. **Restore context (preferred when available):** If the user had a body cell focused immediately before moving to headers, `Tab` restores that cell (`rowIndex` + `colId`), scrolling it into view when needed. The restored row is **not** reset to row 0 or an arbitrary visible row.
2. **Fresh entry / scrolled viewport (fallback):** If there is no valid prior body cell for this header visit (e.g. Tab into grid via host → headers only, or header click without body focus), `Tab` focuses the **first visible navigable body cell** — the top row in the current viewport (`floor(scrollTop / rowHeight)`), first navigable column in tab order (selection/checkbox columns skipped per `getNavigableColumns`).

**Priority:** valid `lastBodyFocusedCell` → restore; else → first visible navigable cell.

### 4.5.2 Floating filter Tab order (T2)

When `showFloatingFilters` is true, focus entry and Tab traversal follow this order:

1. **Toolbar / page focusables** before the grid
2. **Floating filter inputs** — left to right (pinned-left → center → pinned-right); native Tab moves between inputs in this row
3. **Column headers** — roving `tabindex` on `columnheader` cells
4. **Body cells** — roving `tabindex` on focused `gridcell`

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-KB-58 | `Tab` into grid host MUST focus the first floating filter input when floating filters are visible | Must |
| REQ-KB-59 | `Tab` from the last floating filter MUST focus the first column header | Must |
| REQ-KB-67 | `Shift+Tab` from the first column header MUST focus the last floating filter input (when visible) | Must |
| REQ-KB-68 | While focus is in a floating filter or filter popup control, grid `keydown` MUST NOT intercept typing or arrow keys | Must |
| REQ-KB-69 | Clicking a floating filter input MUST focus that input (header click handler MUST NOT steal focus) | Must |

---

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-KB-60 | `ArrowLeft`/`ArrowRight` on focused header MUST move between column headers | Should |
| REQ-KB-61 | `Enter` on header MUST toggle sort (if sortable) | Should |
| REQ-KB-62 | `Alt+Enter` MUST toggle sort without opening menu (AG Grid) | Could |
| REQ-KB-63 | `Alt+Shift+Enter` MUST add multi-sort key (AG Grid) | Could |
| REQ-KB-64 | Header focus MUST use `role="columnheader"` with `aria-sort` | Must |
| REQ-KB-65 | Moving focus from body to header MUST snapshot the body cell for later restore (`lastBodyFocusedCell`) | Must |
| REQ-KB-66 | Moving focus to header without an active body cell MUST clear the restore snapshot (fresh header entry) | Must |

### 4.7 Range keys (T3)

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-KB-70 | `Shift+arrow` MUST extend `CellRange` from `anchorCell` | Must |
| REQ-KB-71 | Plain arrow after range select MUST move focus and clear range unless Ctrl held | Should |
| REQ-KB-72 | `Shift+click` equivalent via keyboard not required v1 | — |

### 4.8 Customization & a11y (T2)

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-KB-80 | `navigateToNextCell(params)` MAY return next `{ rowIndex, colId }` or null | Should |
| REQ-KB-81 | `suppressKeyboardEvent(params)` MAY return true to skip grid handling | Should |
| REQ-KB-82 | Sort/filter/selection changes MUST announce via `aria-live="polite"` region | Should |
| REQ-KB-83 | `localeText` MUST supply aria labels for grid regions | Should |
| REQ-KB-84 | Canvas renderer MUST delegate key events to companion a11y DOM (T3) | Must |

---

## 5. API & Events

### 5.1 Grid options

```typescript
interface GridOptions<TData> {
  suppressCellFocus?: boolean;
  navigateToNextCell?: (params: NavigateToNextCellParams) => CellPosition | null;
  tabToNextCell?: (params: TabToNextCellParams) => CellPosition | null;
  tabToNextHeader?: (params: TabToNextHeaderParams) => string | null;
  suppressKeyboardEvent?: (params: SuppressKeyboardEventParams) => boolean;
  enterNavigatesVertically?: boolean;
  enterNavigatesVerticallyAfterEdit?: boolean;
  onCellFocused?: (event: CellFocusedEvent) => void;
}

interface NavigateToNextCellParams {
  key: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';
  previousCell: CellPosition;
  nextCell: CellPosition | null;  // default proposal
  event: KeyboardEvent;
  api: GridApi;
}
```

### 5.2 GridApi

```typescript
interface GridApi<TData> {
  setFocusedCell(rowIndex: number, colKey: string): void;
  getFocusedCell(): CellPosition | null;
  clearFocusedCell(): void;
  ensureIndexVisible(rowIndex: number, position?: 'top' | 'middle' | 'bottom'): void;
  ensureColumnVisible(colKey: string): void;
}
```

### 5.3 Events

| Event | Payload |
|-------|---------|
| `cellFocused` | `{ rowIndex, colId, rowPinned, api }` |
| `cellKeyDown` | `{ event, rowIndex, colId, api }` |

### 5.4 ARIA structure (DOM renderer)

```html
<div role="grid" aria-rowcount="..." aria-colcount="...">
  <div role="rowgroup">
    <div role="row">
      <div role="columnheader" aria-sort="ascending">Name</div>
    </div>
  </div>
  <div role="rowgroup">
    <div role="row" aria-rowindex="2" aria-selected="false">
      <div role="gridcell" tabindex="-1">Alice</div>
    </div>
  </div>
</div>
```

Only focused cell receives `tabindex="0"`; others `tabindex="-1"` (roving tabindex pattern).

---

## 6. AG Grid Parity

Reference: [AG Grid Keyboard Interaction](https://www.ag-grid.com/javascript-data-grid/keyboard-navigation/)

| AG Grid key / feature | ol-grid tier | Status |
|-----------------------|--------------|--------|
| Arrow keys | T1 | Partial |
| Page Up/Down | T1 | Not impl |
| Home / End / Ctrl+Home / Ctrl+End | T2 | Not impl |
| Enter / F2 edit | T2 | Partial |
| Space row select | T2 | Not impl |
| Tab / Shift+Tab | T2 | Not impl |
| `navigateToNextCell` | T2 | Not impl |
| `tabToNextCell` | T2 | Not impl |
| `suppressKeyboardEvent` | T2 | Not impl |
| Header keyboard shortcuts | T2 | Not impl |
| Shift+arrow range | T3 | Not impl |
| Ctrl+C/V/A/D | T3 | clipboard.md |
| `enableCellTextSelection` changes Ctrl+C | T3 | selection.md |
| `suppressCellFocus` | T2 | Not impl |

---

## 7. Competitive Analysis

| Library | Keyboard/a11y | ol-grid stance |
|---------|---------------|----------------|
| **AG Grid** | Comprehensive docs | Target parity |
| **TanStack Table** | None built-in | ol-grid core differentiator |
| **MUI Data Grid** | Good defaults | Match WCAG AA |
| **Glide** | Custom; limited SR | ol-grid DOM-first a11y |
| **RevoGrid** | Partial | ol-grid must exceed |

---

## 8. Tier Assignment

| Capability | Tier |
|------------|------|
| Arrows, focus ring, ARIA grid, Page Up/Down, ensureVisible | T1 |
| Home/End, Space, Tab nav, callbacks, header keys, live regions | T2 |
| Shift+arrow range, Ctrl+A cells, canvas a11y bridge | T3 |

---

## 9. Acceptance Criteria

### 9.1 Tier 1

- [ ] Tab into grid → focus visible on first cell
- [ ] Arrow keys move focus across 10×10 grid correctly
- [ ] Page Down moves ~one viewport; scroll position updates
- [ ] Focused cell scrolled into view when navigating off-screen
- [ ] axe-core: `role="grid"`, `gridcell`, `columnheader` present
- [ ] Pin boundary: left pin col 3 → right arrow → center col 0
- [ ] Automated test suite: 20+ key scenarios in `keyboard-nav.test.ts`

### 9.2 Tier 2

- [ ] Home/End jump columns; Ctrl+Home/Ctrl+End jump corners
- [ ] Space toggles row selection
- [ ] `navigateToNextCell` can block right arrow at column boundary
- [ ] Header Enter toggles sort; `aria-sort` updates
- [ ] `aria-live` announces "3 rows selected" on selection change
- [ ] **REQ-KB-55:** Tab from last header with scrolled viewport (no prior body focus) → first visible row, not row 0
- [ ] **REQ-KB-56:** Tab from last header after body→header transition → restores prior body cell (row + colId), scrolls into view if needed
- [ ] **REQ-KB-57:** Restore takes priority over first-visible when `lastBodyFocusedCell` is valid

### 9.3 Tier 3

- [ ] Shift+arrow extends range with 4 directions
- [ ] Canvas demo: keyboard nav works identically to DOM

---

## 10. Dependencies

| Dependency | Role |
|------------|------|
| `@ol-grid/core` | `focusedCell`, navigation functions, callbacks |
| `@ol-grid/dom-renderer` | keydown listener, roving tabindex, ARIA |
| `@ol-grid/virtualizer` | Page Up/Down row delta, `ensureIndexVisible` |
| `@ol-grid/selection` | Space, Shift+arrow range |
| `@ol-grid/cell-editing` | Enter, F2, Tab during edit |
| `@ol-grid/i18n` | aria-live message templates |

---

## 11. Open Questions

| # | Question | Options | Recommendation |
|---|----------|---------|----------------|
| OQ-KB-01 | Roving tabindex vs aria-activedescendant | Roving / activedescendant | Roving tabindex (APG grid pattern) |
| OQ-KB-02 | Wrap at last column to next row? | Wrap / clamp | Clamp (AG Grid) |
| OQ-KB-03 | Handle RTL arrow inversion | Swap / mirror | Mirror in RTL mode T2 |
| OQ-KB-04 | Keydown on document vs grid host only | Host only | Grid host when focused |
| OQ-KB-05 | Announce sort on every change? | Yes / debounce | Debounce 500ms |

---

## 12. References

- [REQUIREMENTS.md §4.1.4](../REQUIREMENTS.md) — T1-SEL-03 keyboard
- [REQUIREMENTS.md §5.3](../REQUIREMENTS.md) — NFR-A-* accessibility
- [ARCHITECTURE.md §7.4](../ARCHITECTURE.md) — a11y tests
- [AG Grid Keyboard Interaction](https://www.ag-grid.com/javascript-data-grid/keyboard-navigation/)
- [WAI-ARIA Grid Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/)
- Implementation: `packages/dom-renderer/src/dom-renderer.ts` → `handleKeyDown`

---

*Authoritative for keyboard navigation scope.*

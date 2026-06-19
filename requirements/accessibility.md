# ol-grid — Accessibility Requirements

> Cross-cutting: `@ol-grid/core` (focus/selection state), `@ol-grid/dom-renderer`, `@ol-grid/canvas-renderer`  
> Parent: [REQUIREMENTS.md](../REQUIREMENTS.md) · [internationalization.md](./internationalization.md)  
> **Document version:** 1.0 · **Last updated:** June 2026 · **Status:** Draft

---

## 1. Overview

Accessibility is a **first-class product requirement**, not an adapter afterthought. ol-grid implements the [WAI-ARIA grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/) in the default DOM renderer, with keyboard navigation orchestrated by core state and renderer event wiring. Target: **WCAG 2.1 Level AA** for built-in DOM experience.

### 1.1 Ownership model

| Layer | Owns |
|-------|------|
| **Core** | Focus cell coordinates, selection state, navigable column set, edit state machine |
| **DOM renderer** | ARIA roles, roving tabindex, focus ring CSS, keyboard event dispatch |
| **Canvas renderer** | Companion a11y DOM mirroring focus/selection (see [canvas-renderer.md](./canvas-renderer.md)) |
| **Adapters** | MUST NOT break focus; pass through host; no duplicate keyboard handlers |
| **Consumers** | Custom cell content must maintain cell accessibility when replacing defaults |

### 1.2 Scope

| In scope | Out of scope |
|----------|--------------|
| Keyboard grid navigation | Mobile screen reader gesture tutorials |
| ARIA roles & states | JAWS-specific hacks beyond standards |
| Focus management & visible focus | WCAG AAA everywhere |
| axe-core CI gate | Full VPAT certification process |
| Live region announcements (T2) | Voice control custom grammars |
| `prefers-reduced-motion` | High contrast OS mode (partial via theme) |

---

## 2. AG Grid / Standards Parity

| Standard / AG Grid | ol-grid REQ | Tier | Status |
|--------------------|-------------|------|--------|
| WAI-ARIA grid pattern | A11Y-ARIA-* | T1 | Partial |
| Keyboard navigation | A11Y-KB-* | T1 | Partial |
| `aria-sort` on headers | A11Y-ARIA-10 | T1 | Not done |
| WCAG 2.1 AA | A11Y-WCAG-* | T2 | In progress |
| axe-core clean CI | A11Y-TEST-01 | T2 | Not in CI |
| Canvas parallel DOM | A11Y-CANVAS-* | T3 | Not started |

Parent: G-05, T1-SEL-03, T2-A11Y-01–03, NFR-A-01–07.

---

## 3. ARIA Structure Requirements

### 3.1 Roles

**REQ-A11Y-ARIA-01** — Root host: `role="grid"`; if multi-select rows, `aria-multiselectable="true"`.

**REQ-A11Y-ARIA-02** — Header container: `role="rowgroup"` containing `role="row"` with `role="columnheader"` cells.

**REQ-A11Y-ARIA-03** — Body container: `role="rowgroup"` containing `role="row"` elements.

**REQ-A11Y-ARIA-04** — Data cells: `role="gridcell"`.

**REQ-A11Y-ARIA-05** — Selection checkbox column: `role="gridcell"` containing native `<input type="checkbox">` with accessible name (localized).

**REQ-A11Y-ARIA-06** — Do NOT use `role="table"` for interactive data grid (use grid pattern).

### 3.2 Indices & labels

**REQ-A11Y-ARIA-07** — `aria-rowindex` on rows: 1-based index in **displayed** row set.

**REQ-A11Y-ARIA-08** — `aria-colindex` on cells: 1-based among **visible** columns including selection column.

**REQ-A11Y-ARIA-09** — Column headers: text content or `aria-label` from `headerName`; empty selection header.

**REQ-A11Y-ARIA-10** — Sortable headers: `aria-sort="ascending" | "descending" | "none"`.

**REQ-A11Y-ARIA-11** — Selected rows: `aria-selected="true"` on row or selected cells per APG guidance (document chosen pattern).

**REQ-A11Y-ARIA-12** — `aria-readonly="true"` on non-editable cells when in edit-capable grid — Tier 2.

### 3.3 Live regions

**REQ-A11Y-LIVE-01** — `aria-live="polite"` region for sort/filter/selection count changes — Tier 2.

**REQ-A11Y-LIVE-02** — Announcements debounced; max one per 500ms for rapid key repeat.

**REQ-A11Y-LIVE-03** — Messages localized via [internationalization.md](./internationalization.md).

---

## 4. Keyboard Navigation

### 4.1 Focus model

**REQ-A11Y-KB-01** — Grid host `tabIndex={0}` enters grid; first Tab focus moves to focused cell or first cell.

**REQ-A11Y-KB-02** — Roving `tabIndex`: focused cell `0`, others `-1`.

**REQ-A11Y-KB-03** — Focus MUST NOT escape grid on arrow keys; Tab exits grid to next page control.

**REQ-A11Y-KB-04** — When editing, focus trapped in editor until commit/cancel; Tab moves to next editable cell (T2).

### 4.2 Key bindings (default)

| Key | Action | REQ-ID | Status |
|-----|--------|--------|--------|
| ArrowUp/Down/Left/Right | Move cell focus | A11Y-KB-10 | Implemented |
| Home | First column same row | A11Y-KB-11 | Not done |
| End | Last column same row | A11Y-KB-12 | Not done |
| Ctrl+Home | First cell | A11Y-KB-13 | Not done |
| Ctrl+End | Last cell | A11Y-KB-14 | Not done |
| Page Up/Down | Scroll page + focus | A11Y-KB-15 | Not done |
| Enter / F2 | Start edit | A11Y-KB-16 | Implemented |
| Escape | Cancel edit / clear focus | A11Y-KB-17 | Partial |
| Space | Toggle row select | A11Y-KB-18 | Not done |
| Ctrl+A | Select all (filtered) | A11Y-KB-19 | T2 |
| Shift+Arrow | Extend range (T3) | A11Y-KB-20 | T3 |

**REQ-A11Y-KB-05** — All interactive features MUST be operable without pointer (NFR-A-02).

**REQ-A11Y-KB-06** — Key handlers MUST NOT conflict with browser chrome when focus in editor.

**REQ-A11Y-KB-07** — `GridOptions.suppressKeyboardEvent` callback may veto propagation (AG Grid parity, Tier 2).

---

## 5. Focus Visibility

**REQ-A11Y-FOCUS-01** — Visible focus indicator on focused cell meeting WCAG 2.4.7 (Focus Visible).

**REQ-A11Y-FOCUS-02** — Use `--ol-grid-focus-ring` token; minimum 2px contrast difference.

**REQ-A11Y-FOCUS-03** — Focus ring visible in dark theme.

**REQ-A11Y-FOCUS-04** — Do not remove outline without replacement (`:focus-visible` pattern).

**REQ-A11Y-FOCUS-05** — Scroll focused cell into view on programmatic focus change.

---

## 6. Selection & Checkboxes

**REQ-A11Y-SEL-01** — Checkbox: associated label via `aria-label` from locale (`selectRow`).

**REQ-A11Y-SEL-02** — Header select-all checkbox (T2): `aria-label` from `selectAll`; indeterminate state `aria-checked="mixed"`.

**REQ-A11Y-SEL-03** — Row selection state exposed to AT via `aria-selected` on row.

**REQ-A11Y-SEL-04** — Click-only selection MUST have keyboard equivalent (Space).

---

## 7. Editing Accessibility

**REQ-A11Y-EDIT-01** — Editor input labeled by column header (`aria-labelledby` or `aria-label`).

**REQ-A11Y-EDIT-02** — Validation errors: `aria-invalid="true"` + `aria-describedby` error text (T2).

**REQ-A11Y-EDIT-03** — Announce commit/cancel via live region optional (T2).

**REQ-A11Y-EDIT-04** — Custom editors MUST implement `CellEditor` a11y contract documented in adapter guides.

---

## 8. Custom Cell Renderers

**REQ-A11Y-CELL-01** — Default text rendering is accessible (no click-only disclosure in default).

**REQ-A11Y-CELL-02** — Interactive widgets inside cells (buttons, links) receive Tab stops; arrow keys still move cell focus when cell focused (APG nested widget pattern).

**REQ-A11Y-CELL-03** — Document consumer responsibility for custom renderer a11y in docs.

**REQ-A11Y-CELL-04** — `suppressKeyboardEvent` for embedded buttons — Tier 2.

---

## 9. Color & Contrast

**REQ-A11Y-WCAG-01** — Text vs background ≥4.5:1 normal text in default theme (AA).

**REQ-A11Y-WCAG-02** — Header text, sort indicator, muted text meet contrast or use bolder weight.

**REQ-A11Y-WCAG-03** — Selected row: text contrast on `--ol-grid-row-selected-bg` verified.

**REQ-A11Y-WCAG-04** — Information not conveyed by color alone (sort glyph + aria-sort).

**REQ-A11Y-WCAG-05** — `prefers-reduced-motion`: disable non-essential transitions (T2).

---

## 10. Canvas Renderer Accessibility

**REQ-A11Y-CANVAS-01** — Canvas visually decorative for AT; interactive semantics on companion DOM (NFR-A-06).

**REQ-A11Y-CANVAS-02** — Keyboard parity with DOM demo test suite.

**REQ-A11Y-CANVAS-03** — Focus never lost on scroll repaint.

---

## 11. Testing Requirements

**REQ-A11Y-TEST-01** — axe-core in CI on default React demo: zero **critical** violations (T2 gate).

**REQ-A11Y-TEST-02** — Keyboard integration suite: Playwright/Vitest browser — arrow, edit, escape flows.

**REQ-A11Y-TEST-03** — Manual SR spot check checklist: VoiceOver (macOS), NVDA (Windows) before Tier 2 release.

**REQ-A11Y-TEST-04** — Role verification tests: `getByRole('grid')`, `columnheader`, `gridcell`.

**REQ-A11Y-TEST-05** — Regression test for edit blur race (dom-renderer.edit.test.ts pattern).

---

## 12. Current Implementation Notes

Implemented:

- `role="grid"`, `rowgroup`, `row`, `columnheader`, `gridcell`
- `aria-rowindex`, `aria-colindex`
- Arrow key navigation, Enter/F2 edit, Escape clear focus
- Focus ring CSS class `ol-grid__cell--focused`
- Checkbox `aria-label="Select row"` (hardcoded English)
- Host `tabIndex=0`, roving tabindex on cells

Gaps:

- No `aria-sort`, `aria-multiselectable`, `aria-selected`
- No Home/End/PageUp/Space/Ctrl+A
- No live regions
- No axe CI
- No `suppressKeyboardEvent`
- No localized aria strings

---

## 13. Acceptance Criteria

### Tier 1

- [ ] AC-A11Y-01: Keyboard-only user can navigate all visible cells and toggle sort on header
- [ ] AC-A11Y-02: axe-core: no critical violations on vanilla basic example
- [ ] AC-A11Y-03: Focus ring visible on Tab + arrow navigation
- [ ] AC-A11Y-04: Screen reader announces column header name when entering column

### Tier 2

- [ ] AC-A11Y-05: WCAG 2.1 AA audit on default theme documents known exceptions
- [ ] AC-A11Y-06: `aria-sort` updates on sort toggle
- [ ] AC-A11Y-07: Space toggles row selection; Ctrl+A selects filtered rows
- [ ] AC-A11Y-08: Localized aria-label on selection checkbox
- [ ] AC-A11Y-09: Live region announces sort direction change

### Tier 3

- [ ] AC-A11Y-10: Canvas demo passes shared keyboard + axe suite with a11y DOM

---

## 14. Documentation Requirements

**REQ-A11Y-DOC-01** — Accessibility guide: keyboard shortcuts table, SR behavior, custom renderer checklist.

**REQ-A11Y-DOC-02** — Migration note: AG Grid a11y differences if any.

**REQ-A11Y-DOC-03** — Example: accessible custom cell renderer with button.

---

## 15. Non-Goals

- Certification or VPAT production
- Full mobile TalkBack optimization v1
- Automatic WCAG remediation for consumer-rendered HTML inside cells

---

## 16. Open Questions

| ID | Question | Recommendation |
|----|----------|----------------|
| OQ-A11Y-01 | `aria-selected` on row vs cell | Row-level for row selection mode |
| OQ-A11Y-02 | Grid label `aria-label` on host | Optional `GridOptions.ariaLabel` |
| OQ-A11Y-03 | Announce row index on vertical move | Polite live region Tier 2 |

---

*Authoritative for accessibility. Changes to focus model require [core-engine.md](./core-engine.md) sync.*

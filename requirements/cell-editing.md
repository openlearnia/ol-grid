# Feature Requirements: Cell Editing

> **Package target:** `@ol-grid/core` (EditController); editor UI in `@ol-grid/dom-renderer` + framework adapters  
> **Parent spec:** [REQUIREMENTS.md](../REQUIREMENTS.md) §3.5, §4.2.1  
> **Architecture:** [ARCHITECTURE.md](../ARCHITECTURE.md) §3.6  
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

Cell editing allows users to modify grid data inline. ol-grid follows the **single active editor** model (one cell editing at a time) with a clear state machine: idle → editing → committed | cancelled. The value pipeline on commit is: **editor raw value → `valueParser` → `valueSetter` → `onCellValueChanged`**.

Editing logic resides in core (`EditController`); the renderer provides an `EditorHost` overlay; framework adapters mount custom editor components.

### 1.1 Edit triggers

| Trigger | Tier | Notes |
|---------|------|-------|
| Double-click cell | T2 | |
| Enter / F2 on focused cell | T2 | Partial in T1 renderer |
| Type printable character | T2 | Replaces cell content (Excel-like) |
| `api.startEditingCell()` | T2 | |
| Paste into range | T3 | See clipboard.md |

### 1.2 Non-goals (v1)

- Undo/redo stack (AG Grid Enterprise)
- Formula engine
- Full-row edit panel with Save/Cancel (Tier 3 optional)
- Real-time collaborative editing

---

## 2. Current Implementation Status

| Capability | Status | Location |
|------------|--------|----------|
| `editable` boolean on ColumnDef | **Implemented** | `column.ts`, `is-cell-editable.ts` |
| `editable` callback | **Implemented** | `is-cell-editable.ts` |
| `startEditingCell` API | **Implemented** | `grid-engine.ts`, `api.ts` |
| `stopEditing(cancel?)` API | **Implemented** | `grid-engine.ts` |
| Basic text `<input>` editor in DOM | **Implemented** | `dom-renderer.ts` |
| Enter commits / Escape cancels | **Implemented** | `dom-renderer.ts` |
| `EditingState` in store | **Implemented** | `state.ts` |
| Edit replaces single cell DOM (no nested row) | **Tested** | `dom-renderer.edit.test.ts` |
| `valueSetter` on commit | **Partial** | `set-cell-value.ts` exists; wiring incomplete |
| `valueParser` | **Not implemented** | Type not on ColumnDef |
| `onCellValueChanged` event | **Defined** | Not consistently emitted |
| Provided editors (number, select, date) | **Not implemented** | |
| Custom cell editors (React component) | **Not implemented** | |
| Tab / Shift+Tab next editable cell | **Not implemented** | |
| Double-click to edit | **Not implemented** | |
| Type-to-edit (keydown char) | **Not implemented** | |
| `singleClickEdit` | **Not implemented** | |
| `stopEditingWhenCellsLoseFocus` | **Not implemented** | |
| Validation / reject commit | **Not implemented** | |
| Full-row editing mode | **Not implemented** | |
| `readOnlyEdit` + `cellEditRequest` | **Not implemented** | |

---

## 3. User Stories

### Tier 2 (primary delivery)

| ID | Story | Priority |
|----|-------|----------|
| US-ED-01 | As a user, I double-click a cell to edit its value | Must |
| US-ED-02 | As a user, I press Enter or F2 on a focused cell to start editing | Must |
| US-ED-03 | As a user, I press Escape to cancel and restore the original value | Must |
| US-ED-04 | As a user, I press Enter to commit my edit and close the editor | Must |
| US-ED-05 | As a user, I press Tab to commit and move to the next editable cell | Must |
| US-ED-06 | As an app developer, I use `valueParser` to convert string input to a Date | Must |
| US-ED-07 | As an app developer, I use `valueSetter` returning `false` to reject invalid values | Must |
| US-ED-08 | As an app developer, I register a custom React select editor for a status column | Must |
| US-ED-09 | As an app developer, I listen to `onCellValueChanged` to sync edits to my API | Must |
| US-ED-10 | As an app developer, I set `editable: (params) => params.data.role === 'admin'` per row | Must |

### Tier 2 — polish

| ID | Story | Priority |
|----|-------|----------|
| US-ED-11 | As a user, typing a letter immediately starts edit with that character | Should |
| US-ED-12 | As an app developer, I use provided `number` editor with min/max constraints | Should |
| US-ED-13 | As an app developer, `singleClickEdit: true` starts edit on single click | Could |
| US-ED-14 | As a user, clicking outside the grid commits or cancels per `stopEditingWhenCellsLoseFocus` | Should |

### Tier 3

| ID | Story | Priority |
|----|-------|----------|
| US-ED-15 | As a user, I edit an entire row and press Save to batch-commit | Should |
| US-ED-16 | As an app developer with `readOnlyEdit`, paste fires `cellEditRequest` instead of mutating data | Should |
| US-ED-17 | As a user, Ctrl+Enter fills edited value down a selected range | Could |

---

## 4. Functional Requirements

### 4.1 Edit lifecycle

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-ED-01 | At most one cell MUST be in `editing` state at any time | Must |
| REQ-ED-02 | Starting edit on cell A while B is editing MUST commit or cancel B per `stopEditingWhenGridLosesFocus` policy | Must |
| REQ-ED-03 | `Escape` MUST cancel: discard edit value, restore display, emit no `cellValueChanged` | Must |
| REQ-ED-04 | `Enter` MUST commit if validation passes | Must |
| REQ-ED-05 | `Tab` / `Shift+Tab` MUST commit (if valid) and move focus to next/previous editable cell in row order | Must |
| REQ-ED-06 | Tab at last editable cell MUST wrap to next row's first editable cell (documented) | Should |
| REQ-ED-07 | Non-editable cells MUST be skipped during Tab navigation | Must |
| REQ-ED-08 | `api.stopEditing(cancel?: boolean)` MUST end edit programmatically | Must |
| REQ-ED-09 | `api.startEditingCell({ rowIndex, colKey, key?: string })` MUST open editor; optional `key` seeds initial char | Must |

### 4.2 Value pipeline

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-ED-10 | On commit, raw editor value MUST pass through `valueParser(params)` if defined | Must |
| REQ-ED-11 | Parsed value MUST pass to `valueSetter(params)`; if returns `false`, commit MUST be rejected and editor remain open | Must |
| REQ-ED-12 | If no `valueSetter`, `field` on row data MUST be updated directly | Must |
| REQ-ED-13 | `valueGetter` columns without `field` MUST require `valueSetter` for persistence | Must |
| REQ-ED-14 | `onCellValueChanged` MUST fire after successful commit with `{ oldValue, newValue, data, node, colDef }` | Must |
| REQ-ED-15 | Display MUST refresh via `valueFormatter` after commit without full grid remount | Must |
| REQ-ED-16 | `onCellEditingStarted` / `onCellEditingStopped` MUST fire on lifecycle transitions | Should |

### 4.3 Column configuration

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-ED-20 | `editable: false` (default) MUST prevent all edit triggers on column | Must |
| REQ-ED-21 | `editable: true` or callback MUST gate double-click, Enter, F2, type-to-edit | Must |
| REQ-ED-22 | `cellEditor: 'text' \| 'number' \| 'select' \| 'date' \| string` MUST resolve from editor registry | Must |
| REQ-ED-23 | `cellEditorParams` MUST pass props to provided/custom editors | Must |
| REQ-ED-24 | `cellEditorPopup: true` MUST render editor in popup overlay (for large editors) | Could |
| REQ-ED-25 | `singleClickEdit` grid option MUST start edit on single click when true | Could |
| REQ-ED-26 | `stopEditingWhenCellsLoseFocus` (default true) MUST commit on outside click | Should |

### 4.4 Provided editors

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-ED-30 | **Text editor:** single-line input, selects all on focus | Must |
| REQ-ED-31 | **Number editor:** `input[type=number]`, honors `min`/`max`/`step` from params | Must |
| REQ-ED-32 | **Select editor:** `<select>` or combobox from `values` array | Must |
| REQ-ED-33 | **Date editor:** native date input or text with parse format from params | Should |
| REQ-ED-34 | **Large text editor:** textarea for `cellEditor: 'largeText'` | Could |

### 4.5 Custom editors

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-ED-40 | Custom editor MUST implement `CellEditor` interface with `getValue()`, `isCancelBeforeStart()`, `isCancelAfterEnd()` | Must |
| REQ-ED-41 | Framework editor components MUST mount in `EditorHost` at cell rect | Must |
| REQ-ED-42 | Editor MUST receive `stopEditing()` callback in params to end edit | Must |
| REQ-ED-43 | Editor `isCancelAfterEnd()` returning true MUST revert commit | Should |

### 4.6 Tier 3 — Full row & read-only

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-ED-50 | `editType: 'fullRow'` MUST allow multiple cells in edit state per row | Should |
| REQ-ED-51 | Full row mode MUST commit all cells on Save or cancel all on Escape | Should |
| REQ-ED-52 | `readOnlyEdit: true` MUST fire `cellEditRequest` instead of mutating `rowData` | Should |
| REQ-ED-53 | Clipboard paste with `readOnlyEdit` MUST emit per-cell `cellEditRequest` | Should |

---

## 5. API & Events

### 5.1 Column definition

```typescript
interface ColumnDef<TData, TValue = unknown> {
  editable?: boolean | ((params: EditableCallbackParams<TData>) => boolean);
  valueParser?: (params: ValueParserParams<TData, TValue>) => TValue;
  valueSetter?: (params: ValueSetterParams<TData, TValue>) => boolean;
  cellEditor?: string | CellEditorDef;
  cellEditorParams?: Record<string, unknown>;
  cellEditorPopup?: boolean;
}

interface ValueParserParams<TData, TValue> {
  newValue: unknown;
  oldValue: TValue;
  data: TData;
  colDef: ColumnDef<TData, TValue>;
  node: RowNode<TData>;
  api: GridApi<TData>;
  context: unknown;
}
```

### 5.2 Grid options

```typescript
interface GridOptions<TData> {
  editType?: 'cell' | 'fullRow';
  singleClickEdit?: boolean;
  stopEditingWhenCellsLoseFocus?: boolean;
  readOnlyEdit?: boolean;
  onCellValueChanged?: (event: CellValueChangedEvent<TData>) => void;
  onCellEditingStarted?: (event: CellEditingStartedEvent<TData>) => void;
  onCellEditingStopped?: (event: CellEditingStoppedEvent<TData>) => void;
  onCellEditRequest?: (event: CellEditRequestEvent<TData>) => void;
}
```

### 5.3 CellEditor interface

```typescript
interface CellEditor<TData = unknown> {
  init(params: CellEditorParams<TData>): void;
  getValue(): unknown;
  isCancelBeforeStart?(): boolean;
  isCancelAfterEnd?(): boolean;
  destroy?(): void;
  // Optional GUI focus
  afterGuiAttached?(): void;
}

interface CellEditorParams<TData> {
  value: unknown;
  data: TData;
  rowIndex: number;
  colDef: ColumnDef<TData>;
  node: RowNode<TData>;
  api: GridApi<TData>;
  stopEditing: (cancel?: boolean) => void;
  eventKey: string | null;  // printable key that started edit
  context: unknown;
}
```

### 5.4 GridApi

```typescript
interface GridApi<TData> {
  startEditingCell(params: StartEditingCellParams): boolean;
  stopEditing(cancel?: boolean): void;
  isEditing(): boolean;
  getEditingCell(): CellPosition | null;
}
```

### 5.5 Events

| Event | When |
|-------|------|
| `cellEditingStarted` | Editor mounted and focused |
| `cellEditingStopped` | Editor unmounted (commit or cancel) |
| `cellValueChanged` | Successful commit only |
| `cellEditRequest` | `readOnlyEdit` mode value change request |

---

## 6. AG Grid Parity

Reference: [AG Grid Cell Editing](https://www.ag-grid.com/javascript-data-grid/cell-editing/)

| AG Grid feature | AG Grid tier | ol-grid | Notes |
|-----------------|--------------|---------|-------|
| `editable` column | Community | T2 | |
| Double-click / Enter / F2 | Community | T2 | |
| Type to edit | Community | T2 | |
| `valueParser` / `valueSetter` | Community | T2 | |
| Provided editors (text, number, select, date, etc.) | Community | T2 | |
| Custom cell editors | Community | T2 | |
| Tab navigation between cells | Community | T2 | |
| `singleClickEdit` | Community | T2 | |
| `stopEditingWhenCellsLoseFocus` | Community | T2 | |
| `onCellValueChanged` | Community | T2 | |
| Full row editing | Community | T3 | |
| `readOnlyEdit` + `cellEditRequest` | Community | T3 | |
| Undo/redo | **Enterprise** | N/A v1 | |
| Rich select / popup cell editor | Community | T2 | Custom editor |

---

## 7. Competitive Analysis

| Library | Editing UX | ol-grid stance |
|---------|------------|----------------|
| **AG Grid** | Mature editors, validation | Match Community T2 |
| **TanStack Table** | Meta `updateData` only | ol-grid full inline UX |
| **MUI Data Grid** | Built-in editors | Parity without MUI lock-in |
| **Handsontable** | Spreadsheet-native | ol-grid: data grid, not spreadsheet |
| **Glide Data Grid** | Overlay editors on canvas | Same EditorHost pattern |

---

## 8. Tier Assignment

| Capability | Tier |
|------------|------|
| Enter/F2 edit stub (current) | T1 foundation only |
| Full cell edit lifecycle, parsers, setters, provided editors | T2 |
| Custom framework editors, Tab nav, type-to-edit | T2 |
| Full-row edit, readOnlyEdit | T3 |

---

## 9. Acceptance Criteria

### 9.1 Tier 2 exit

- [ ] Double-click editable cell → input with current value selected
- [ ] Enter commits; Escape cancels; DOM shows original value after cancel
- [ ] `valueParser` converts `"42"` string to number 42 on commit
- [ ] `valueSetter` returns false → editor stays open, no `cellValueChanged`
- [ ] Tab moves through editable columns skipping non-editable
- [ ] Custom React select editor renders and commits selected option
- [ ] `onCellValueChanged` receives correct old/new values
- [ ] `editable` callback disables edit on specific rows
- [ ] Integration test: edit does not create nested row DOM (regression)
- [ ] axe-core: editor receives focus; `aria-readonly` on non-editable cells

### 9.2 Tier 3 exit

- [ ] Full-row mode: edit 3 cells, Save commits all
- [ ] `readOnlyEdit`: paste emits `cellEditRequest` without mutating `rowData`

---

## 10. Dependencies

| Dependency | Role |
|------------|------|
| `@ol-grid/core` | EditController, state machine, value pipeline |
| `@ol-grid/dom-renderer` | EditorHost, default text input |
| Framework adapters | Mount CellEditor components |
| `@ol-grid/keyboard-navigation` | Enter, F2, Tab, type-to-edit routing |
| `@ol-grid/selection` | Focused cell position |
| `@ol-grid/clipboard` | Paste triggers edit (T3) |

---

## 11. Open Questions

| # | Question | Options | Recommendation |
|---|----------|---------|----------------|
| OQ-ED-01 | Commit on row scroll out of view? | Cancel / commit | Commit (AG Grid default) |
| OQ-ED-02 | Default editor when `cellEditor` omitted | Infer from data type / text | Infer type T2; text fallback |
| OQ-ED-03 | Validate on keystroke vs commit only? | Live / on commit | On commit only v1 |
| OQ-ED-04 | Portal editor vs inline cell replacement | Inline (current) / portal | Inline for text; popup for large |
| OQ-ED-05 | Mutate `rowData` in place vs immutable | In place / new object | In place with transaction API T2 |

---

## 12. References

- [REQUIREMENTS.md §4.2.1](../REQUIREMENTS.md) — T2-ED-* IDs
- [ARCHITECTURE.md §3.6](../ARCHITECTURE.md) — EditController
- [AG Grid Cell Editing](https://www.ag-grid.com/javascript-data-grid/cell-editing/)
- [AG Grid Cell Editors](https://www.ag-grid.com/javascript-data-grid/cell-editors/)
- Implementation: `packages/core/src/row/set-cell-value.ts`, `packages/dom-renderer/src/dom-renderer.edit.test.ts`

---

*Authoritative for cell editing scope.*

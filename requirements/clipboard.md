# Feature Requirements: Clipboard

> **Package target:** `@ol-grid/clipboard`  
> **Parent spec:** [REQUIREMENTS.md](../REQUIREMENTS.md) §3.6, §4.3.3  
> **Architecture:** [ARCHITECTURE.md](../ARCHITECTURE.md) §3.7  
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

Clipboard support enables users to copy grid data to the system clipboard and paste values from Excel, Google Sheets, or other grids. ol-grid implements clipboard as an **optional zero-DOM module** (`@ol-grid/clipboard`) that serializes/parses TSV and HTML formats while delegating actual clipboard I/O to the browser Clipboard API.

AG Grid reserves full clipboard (copy/paste ranges, Excel HTML) for **Enterprise**. ol-grid delivers equivalent data clipboard features under **MIT at Tier 3**, with basic single-cell copy at Tier 2.

### 1.1 Copy/paste modes

| Mode | Trigger | Tier |
|------|---------|------|
| Copy focused cell | Ctrl+C, no selection | T2 |
| Copy selected rows | Ctrl+C + `copySelectedRows` | T3 |
| Copy cell range | Ctrl+C + range selection | T3 |
| Paste into cell/range | Ctrl+V | T3 |
| Cut | Ctrl+X | T3 |
| API copy | `copySelectedRangeToClipboard()` | T3 |

### 1.2 Format support

| Format | Use case |
|--------|----------|
| `text/plain` (TSV) | Universal; rows `\n`, cols `\t` |
| `text/html` | Excel paste with table structure |
| Custom via `sendToClipboard` | Non-browser containers |

### 1.3 Security

- Clipboard access requires secure context (HTTPS or localhost)
- Graceful degradation when `navigator.clipboard` unavailable
- No `document.execCommand('copy')` in modern path (deprecated)
- Paste into non-editable cells silently skipped

---

## 2. Current Implementation Status

| Capability | Status | Location |
|------------|--------|----------|
| CSV export (file download) | **Implemented** | `export/csv-export.ts` |
| `exportDataAsCsv` API | **Implemented** | `grid-engine.ts` |
| Ctrl+C copy | **Not implemented** | |
| Ctrl+V paste | **Not implemented** | |
| Ctrl+X cut | **Not implemented** | |
| TSV serialization | **Not implemented** | |
| HTML table serialization | **Not implemented** | |
| `beforeCopy` / `beforePaste` hooks | **Not implemented** | |
| `processCellForClipboard` | **Not implemented** | |
| `copySelectedRows` option | **Not implemented** | |
| `copyHeadersToClipboard` | **Not implemented** | |
| `@ol-grid/clipboard` package | **Not created** | |
| `suppressClipboardPaste` | **Not implemented** | |
| `enableCellTextSelection` conflict | **Not implemented** | |
| Clipboard events (pasteStart/End) | **Not implemented** | |

---

## 3. User Stories

### Tier 2 — Basic copy

| ID | Story | Priority |
|----|-------|----------|
| US-CL-01 | As a user, I Ctrl+C the focused cell value to paste into Excel | Should |
| US-CL-02 | As an app developer, I use `processCellForClipboard` to format dates as ISO strings | Should |

### Tier 3 — Full clipboard

| ID | Story | Priority |
|----|-------|----------|
| US-CL-03 | As a user, I drag-select a range and Ctrl+C to copy TSV to clipboard | Must |
| US-CL-04 | As a user, I paste Excel data into an editable range with Ctrl+V | Must |
| US-CL-05 | As a user, paste into a 3×3 range from a 2×2 copy tiles or truncates per AG Grid rules | Must |
| US-CL-06 | As an app developer, I use `beforePaste` to sanitize pasted values | Must |
| US-CL-07 | As a user, I copy selected rows (not just focused cell) when `copySelectedRows: true` | Must |
| US-CL-08 | As a user, copied data includes column headers when `copyHeadersToClipboard: true` | Should |
| US-CL-09 | As an app developer, I implement `sendToClipboard` for a custom Electron clipboard API | Should |
| US-CL-10 | As a user, Ctrl+X cuts editable cells and clears source after copy | Should |
| US-CL-11 | As an app developer with `readOnlyEdit`, paste fires `cellEditRequest` instead of direct mutation | Should |

---

## 4. Functional Requirements

### 4.1 Tier 2 — Single cell copy

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-CL-01 | Ctrl+C (or Cmd+C) with focused cell and no range MUST copy cell formatted value as plain text | Should |
| REQ-CL-02 | Copied value MUST use `valueFormatter` output unless `processCellForClipboard` overrides | Should |
| REQ-CL-03 | `processCellForClipboard(params)` MUST allow per-cell transform before copy | Should |
| REQ-CL-04 | When `enableCellTextSelection: true`, Ctrl+C MUST copy browser text selection only, not cell value | Should |
| REQ-CL-05 | Copy MUST NOT mutate grid data | Must |
| REQ-CL-06 | Copy failure (permission denied) MUST NOT throw; optional `onClipboardError` | Should |

### 4.2 Tier 3 — Range & row copy

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-CL-10 | With `cellSelection: true`, Ctrl+C MUST copy all cells in `selectedRanges` as TSV | Must |
| REQ-CL-11 | TSV format: rows separated by `\n`, columns by `\t` (Excel compatible) | Must |
| REQ-CL-12 | Multiple ranges MUST stack vertically in clipboard (AG Grid behavior) | Should |
| REQ-CL-13 | `copyHeadersToClipboard: true` MUST prepend header row(s) including group headers | Should |
| REQ-CL-14 | `processHeaderForClipboard` / `processGroupHeaderForClipboard` MUST transform headers | Should |
| REQ-CL-15 | `rowSelection.copySelectedRows: true` MUST copy all selected rows (all columns) on Ctrl+C | Must |
| REQ-CL-16 | `copySelectedRows: false` (default) MUST copy focused cell only even if rows selected | Must |
| REQ-CL-17 | `api.copySelectedRangeToClipboard(params)` MUST copy programmatically | Must |
| REQ-CL-18 | `api.copySelectedRowsToClipboard(params)` MUST copy rows programmatically | Must |
| REQ-CL-19 | HTML MIME type MUST include `<table>` for Excel rich paste | Must |
| REQ-CL-20 | `sendToClipboard({ data })` MUST replace default clipboard write when provided | Should |

### 4.3 Tier 3 — Paste

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-CL-30 | Ctrl+V MUST parse clipboard `text/plain` as TSV | Must |
| REQ-CL-31 | Paste target MUST be focused cell or selected range top-left | Must |
| REQ-CL-32 | Single cell focused: paste grid MAY expand right and down | Must |
| REQ-CL-33 | Range selected: paste fills range; repeat if copied area divides evenly | Must |
| REQ-CL-34 | Non-editable cells in paste path MUST be skipped without error | Must |
| REQ-CL-35 | Paste MUST use `processCellFromClipboard` then `valueParser` then `valueSetter` | Must |
| REQ-CL-36 | `processDataFromClipboard` MAY replace entire paste operation or return modified rows | Must |
| REQ-CL-37 | `beforePaste` hook MUST allow veto (return false cancels) | Must |
| REQ-CL-38 | `suppressClipboardPaste: true` MUST disable all paste | Should |
| REQ-CL-39 | `colDef.suppressPaste` MUST disable paste for column | Should |
| REQ-CL-40 | Paste beyond row count MAY add rows via `processDataFromClipboard` + transaction API | Could |
| REQ-CL-41 | `clipboardDelimiter` grid option MUST override default `\t` | Should |
| REQ-CL-42 | `readOnlyEdit: true` MUST emit `cellEditRequest` per pasted cell instead of mutating | Should |

### 4.4 Tier 3 — Cut

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-CL-50 | Ctrl+X MUST copy then clear editable cells in scope | Should |
| REQ-CL-51 | `suppressCutToClipboard: true` MUST disable cut | Should |
| REQ-CL-52 | Cut MUST emit `cutStart`, `cellValueChanged` (clear), `cutEnd` sequence | Should |

### 4.5 Hooks & events

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-CL-60 | `beforeCopy` MUST allow veto or mutate clipboard data string | Must |
| REQ-CL-61 | `beforePaste` MUST allow veto | Must |
| REQ-CL-62 | `pasteStart` / `pasteEnd` MUST bracket paste for batch UI updates | Should |
| REQ-CL-63 | `cutStart` / `cutEnd` MUST bracket cut operations | Should |
| REQ-CL-64 | No events for copy (no data mutation) per AG Grid | Must |

---

## 5. API & Events

### 5.1 Grid options

```typescript
interface GridOptions<TData> {
  clipboardDelimiter?: string;              // default '\t'
  copyHeadersToClipboard?: boolean;
  suppressClipboardPaste?: boolean;
  suppressCutToClipboard?: boolean;
  sendToClipboard?: (params: SendToClipboardParams) => void;
  processCellForClipboard?: (params: ProcessCellForClipboardParams<TData>) => unknown;
  processHeaderForClipboard?: (params: ProcessHeaderForClipboardParams) => unknown;
  processGroupHeaderForClipboard?: (params: ProcessGroupHeaderForClipboardParams) => unknown;
  processCellFromClipboard?: (params: ProcessCellFromClipboardParams<TData>) => unknown;
  processDataFromClipboard?: (params: ProcessDataFromClipboardParams<TData>) => string[][] | null;
  beforeCopy?: (params: BeforeCopyParams) => boolean;
  beforePaste?: (params: BeforePasteParams) => boolean;
  onPasteStart?: (event: PasteStartEvent) => void;
  onPasteEnd?: (event: PasteEndEvent) => void;
  onCutStart?: (event: CutStartEvent) => void;
  onCutEnd?: (event: CutEndEvent) => void;
}
```

### 5.2 GridApi (`@ol-grid/clipboard` augmentation)

```typescript
interface GridApi<TData> {
  copyToClipboard(includeHeaders?: boolean): void;
  copySelectedRangeToClipboard(params?: CopyParams): void;
  copySelectedRowsToClipboard(params?: CopyParams): void;
  pasteFromClipboard(): Promise<void>;
}

interface CopyParams {
  includeHeaders?: boolean;
  includeGroupHeaders?: boolean;
}
```

### 5.3 Internal service (headless)

```typescript
class ClipboardService {
  serializeRangeToTsv(cells: CellData[][]): string;
  serializeRangeToHtml(cells: CellData[][]): string;
  parseTsv(text: string, delimiter?: string): string[][];
  applyPaste(
    data: string[][],
    start: CellPosition,
    grid: GridContext,
  ): PasteResult;
}
```

### 5.4 Module registration

```typescript
import { ClipboardModule } from '@ol-grid/clipboard';
ModuleRegistry.register(ClipboardModule);
```

Registers keydown handlers (Ctrl+C/V/X), API methods, and hooks into `EditController` for paste commits.

---

## 6. AG Grid Parity

Reference: [AG Grid Clipboard](https://www.ag-grid.com/javascript-data-grid/clipboard/)

| AG Grid feature | AG Grid tier | ol-grid | Notes |
|-----------------|--------------|---------|-------|
| Ctrl+C copy cell | Enterprise* | T2 basic | *Community lacks range copy |
| Copy cell range TSV | **Enterprise** | **T3** | MIT differentiator |
| Copy HTML for Excel | **Enterprise** | **T3** | |
| Ctrl+V paste | **Enterprise** | **T3** | |
| Ctrl+X cut | **Enterprise** | **T3** | |
| `copySelectedRows` | Enterprise | T3 | |
| `copyHeadersToClipboard` | Enterprise | T3 | |
| `processCellForClipboard` | Enterprise | T3 | T2 for single cell |
| `processDataFromClipboard` | Enterprise | T3 | |
| `sendToClipboard` | Enterprise | T3 | |
| `suppressClipboardPaste` | Enterprise | T3 | |
| `clipboardDelimiter` | Enterprise | T3 | |
| `enableCellTextSelection` | Community | T3 | Conflicts with grid copy |
| CSV export | Community | T2 | Already implemented separately |

**Note:** AG Grid Community includes CSV export but not interactive clipboard. ol-grid T2 single-cell copy exceeds Community for basic UX.

---

## 7. Competitive Analysis

| Library | Clipboard | ol-grid opportunity |
|---------|-----------|---------------------|
| **AG Grid Enterprise** | Full featured | MIT parity at T3 |
| **AG Grid Community** | No clipboard | T2 single-cell copy |
| **Handsontable** | Excel-like native | ol-grid for general grid + optional depth |
| **Glide Data Grid** | Built-in TSV | Match; DOM + canvas |
| **TanStack Table** | None | ol-grid value-add |
| **MUI Data Grid Pro** | Copy/paste in Pro tier | MIT T3 |

---

## 8. Tier Assignment

| Capability | Tier |
|------------|------|
| CSV export | T2 (implemented) |
| Single cell Ctrl+C copy | T2 |
| Range copy TSV/HTML, paste, cut, hooks | T3 |
| `copySelectedRows`, API methods | T3 |
| Canvas renderer clipboard | T3 |

---

## 9. Acceptance Criteria

### 9.1 Tier 2

- [ ] Focus cell, Ctrl+C, paste in TextEdit → correct formatted value
- [ ] `processCellForClipboard` prefixes value with `$`
- [ ] `enableCellTextSelection`: partial text copy works; no grid intercept

### 9.2 Tier 3 — Copy

- [ ] Select 3×4 range, Ctrl+C, paste in Excel → 3 cols, 4 rows
- [ ] HTML paste preserves table structure in Excel
- [ ] Two ranges copy stacked vertically
- [ ] `copySelectedRows: true` copies all columns for 5 selected rows
- [ ] `copyHeadersToClipboard` includes header row
- [ ] `beforeCopy` returning false cancels operation
- [ ] `api.copySelectedRangeToClipboard()` works headless in test

### 9.3 Tier 3 — Paste

- [ ] Copy 2×2 from Excel, select cell, Ctrl+V → 4 cells updated
- [ ] Paste into range larger than source tiles correctly
- [ ] Non-editable columns skipped
- [ ] `processDataFromClipboard` can cancel paste (Yellow/Red demo)
- [ ] `pasteStart` / `pasteEnd` fire once around batch
- [ ] `readOnlyEdit`: paste emits `cellEditRequest` events
- [ ] `suppressClipboardPaste`: Ctrl+V no-op

### 9.4 Tier 3 — Cut & integration

- [ ] Ctrl+X clears editable cells after copy
- [ ] Round-trip: copy from ol-grid → paste to Excel → copy → paste back preserves values
- [ ] Unit tests: TSV serialize/parse round-trip, HTML generation
- [ ] Manual QA checklist documented in `docs/clipboard-excel.md`

---

## 10. Dependencies

| Dependency | Role |
|------------|------|
| `@ol-grid/core` | Cell values, `valueParser`/`valueSetter`, events |
| `@ol-grid/selection` | Range and row selection state |
| `@ol-grid/cell-editing` | Paste commits, `readOnlyEdit` |
| `@ol-grid/dom-renderer` | keydown Ctrl+C/V/X when grid focused |
| `@ol-grid/canvas-renderer` | Custom copy/paste UI (T3) |
| Browser Clipboard API | `navigator.clipboard.read/write` |

**Permission note:** Paste requires `clipboard-read` permission in some browsers; document user gesture requirement.

---

## 11. Open Questions

| # | Question | Options | Recommendation |
|---|----------|---------|----------------|
| OQ-CL-01 | T2 single-cell copy without clipboard module? | In core / in module | Thin handler in dom-renderer T2; full module T3 |
| OQ-CL-02 | Fallback when Clipboard API missing | execCommand / prompt | Show toast "Copy not supported" |
| OQ-CL-03 | Paste adds rows by default? | Yes / opt-in callback | Opt-in via `processDataFromClipboard` |
| OQ-CL-04 | Copy group row aggregate values? | Yes / leaf only | Leaf only v1; group T3 with grouping |
| OQ-CL-05 | Include hidden columns in copy? | Config flag | `copyDisplayedColumnsOnly: true` default |

---

## 12. References

- [REQUIREMENTS.md §4.3.3](../REQUIREMENTS.md) — T3-CL-* IDs
- [ARCHITECTURE.md §3.7](../ARCHITECTURE.md) — ClipboardService
- [AG Grid Clipboard](https://www.ag-grid.com/javascript-data-grid/clipboard/)
- [AG Grid CSV Export](https://www.ag-grid.com/javascript-data-grid/csv-export/) (related, implemented)
- [MDN Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API)
- Implementation: `packages/core/src/export/csv-export.ts`

---

*Authoritative for clipboard scope.*

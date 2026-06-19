# Feature Requirements: Export (CSV & Excel)

> **Package target:** `@ol-grid/core` (CSV logic); `@ol-grid/excel` (planned, Tier 3)  
> **Parent spec:** [REQUIREMENTS.md](../REQUIREMENTS.md) §3.6, §4.2.5, §4.3.3  
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

Export features allow users to extract grid data to **CSV** (Tier 2) and **Excel `.xlsx`** (Tier 3) reflecting displayed, filtered, and sorted data. CSV generation lives in core as a pure, testable function; file download is triggered via browser APIs from `GridApi`. Excel export is an optional module due to dependency size and licensing considerations.

AG Grid includes CSV export in **Community**; Excel export with styling is **Enterprise**. ol-grid delivers full CSV at Tier 2 and Excel export under **MIT at Tier 3**.

### 1.1 Export modes

| Mode | Trigger | Tier |
|------|---------|------|
| Download CSV file | `api.exportDataAsCsv()` | T2 |
| CSV string only (no download) | `api.getDataAsCsv()` | T2 |
| Export selected rows only | `onlySelected: true` | T2 |
| Download Excel file | `api.exportDataAsExcel()` | T3 |
| Excel buffer (server-side save) | `api.getDataAsExcel()` | T3 |

### 1.2 Format support

| Format | Use case | Tier |
|--------|----------|------|
| CSV (RFC 4180) | Universal; Excel/LibreOffice import | T2 |
| UTF-8 with BOM | Excel UTF-8 recognition on Windows | T2 |
| `.xlsx` with basic styling | Headers bold, freeze row, number formats | T3 |

### 1.3 Architecture principles

- **`generateCsv()`** — pure function in core: rows + columnDefs → string (SSR-safe)
- **`downloadCsvContent()`** — DOM `<a download>` + Blob; guarded for SSR
- **`GridApi.exportDataAsCsv()`** — orchestrates: resolve rows → generate → download
- Export MUST use the **display pipeline** (`valueGetter` → `valueFormatter`) by default
- Option `exportRawValues: true` exports underlying field values without formatter

### 1.4 Security

- CSV injection: cells starting with `=`, `+`, `-`, `@` MAY be escaped with `'` prefix via `suppressCsvInjection: true`
- No `eval` or formula execution in export path
- Export runs client-side only; no automatic server upload
- Large exports: dev warning if >500k cells synchronous

---

## 2. Current Implementation Status

| Capability | Status | Location |
|------------|--------|----------|
| `generateCsv()` pure function | **Implemented** | `export/csv-export.ts` |
| RFC 4180 field escaping | **Implemented** | `escapeCsvField` |
| Hidden column exclusion | **Implemented** | filters `hide: true` |
| Display value pipeline (getter + formatter) | **Implemented** | `getCellValue`, `formatCellValue` |
| `downloadCsvContent()` via Blob | **Implemented** | `export/csv-export.ts` |
| `exportDataAsCsv` API | **Implemented** | `grid-engine.ts`, `api.ts` |
| Filtered/sorted row scope | **Implemented** | `getAllFilteredNodes()` |
| Default filename `export.csv` | **Implemented** | `grid-engine.ts` |
| `columnSeparator` param | **Implemented** | `CsvExportParams` |
| Unit tests for escaping | **Implemented** | `csv-export.test.ts` |
| `getDataAsCsv()` (no download) | **Not implemented** | |
| `onlySelected` row scope | **Not implemented** | |
| `rowRange` partial export | **Not implemented** | |
| `columnKeys` column filter | **Not implemented** | |
| `allColumns` (include hidden) | **Not implemented** | |
| `utf8WithBom` option | **Not implemented** | |
| `processCellCallback` / `processHeaderCallback` | **Not implemented** | |
| `exportRawValues` flag | **Not implemented** | |
| `onCsvExport` cancel hook | **Not implemented** | |
| `suppressCsvInjection` | **Not implemented** | |
| `@ol-grid/excel` package | **Not created** | |
| `exportDataAsExcel()` | **Not implemented** | |
| Excel styling (bold headers, freeze) | **Not implemented** | |
| SSRM/infinite `fetchAllData` export | **Not implemented** | |
| Group row export options | **Not implemented** | |

---

## 3. User Stories

### Tier 2 — CSV export

| ID | Story | Priority |
|----|-------|----------|
| US-EX-01 | As a user, I click Export and download a CSV matching what I see on screen (sorted, filtered) | Must |
| US-EX-02 | As an app developer, I call `getDataAsCsv()` in a Node test without DOM | Must |
| US-EX-03 | As a user in EU, I export with `;` separator for Excel locale | Should |
| US-EX-04 | As a user, I export only checked rows with `onlySelected: true` | Must |
| US-EX-05 | As an app developer, I use `processCellCallback` to strip PII before export | Should |
| US-EX-06 | As a user on Windows Excel, UTF-8 BOM makes CJK characters display correctly | Should |

### Tier 3 — Excel export

| ID | Story | Priority |
|----|-------|----------|
| US-EX-10 | As a user, I download `.xlsx` with bold header row and frozen top row | Should |
| US-EX-11 | As a user, number columns open as numeric types in Excel | Should |
| US-EX-12 | As an app developer, I get an `ArrayBuffer` via `getDataAsExcel()` for server upload | Should |
| US-EX-13 | As an app developer exporting SSRM data, I provide `fetchAllData` to export beyond loaded rows | Should |
| US-EX-14 | As a user with grouped rows, I choose whether group headers appear in export | Should |

---

## 4. Functional Requirements

### 4.1 Tier 2 — CSV row scope

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-EX-01 | Default row set: all rows after filter + sort (displayed row model), not raw `rowData` if different | Must |
| REQ-EX-02 | `onlySelected: true` exports selected rows only | Must |
| REQ-EX-03 | `rowRange: { start, end }` exports inclusive index range | Should |
| REQ-EX-04 | Hidden columns (`hide: true`) excluded by default; `allColumns: true` includes them | Must |
| REQ-EX-05 | Selection checkbox column never exported | Must |

### 4.2 Tier 2 — CSV column scope

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-EX-06 | Export columns from `columnDefs` leaf columns in display order | Must |
| REQ-EX-07 | `columnKeys: string[]` restricts export to specified `colId`s | Should |
| REQ-EX-08 | `skipHeader: false` default; first row is header names from `headerName` or `colId` | Must |
| REQ-EX-09 | Pinned state irrelevant to export order (display order wins) | Must |

### 4.3 Tier 2 — CSV formatting & escaping

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-EX-10 | RFC 4180-style escaping: quote fields containing separator, quote, newline, CR | Must |
| REQ-EX-11 | Default separator `,`; param `columnSeparator` override (e.g. `;` for EU) | Must |
| REQ-EX-12 | Line ending `\r\n` (Excel friendly) | Must |
| REQ-EX-13 | `utf8WithBom: true` prepends BOM for Excel UTF-8 recognition | Should |
| REQ-EX-14 | `processCellCallback` transform per cell before escape | Should |
| REQ-EX-15 | `processHeaderCallback` custom header text | Should |
| REQ-EX-16 | `exportRawValues: true` skips `valueFormatter` output | Should |
| REQ-EX-17 | `fileName` MUST sanitize path segments (no `/` injection) | Must |

### 4.4 Tier 2 — CSV API & hooks

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-EX-18 | `getDataAsCsv` returns string without side effects (SSR-safe, server use) | Must |
| REQ-EX-19 | `onCsvExport` fired before download with `{ api, fileName }`; return `false` cancels | Should |
| REQ-EX-20 | `suppressCsvInjection: true` prefixes dangerous cell prefixes with `'` | Should |

### 4.5 Tier 2 — CSV non-functional

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-EX-NFR-01 | Export 100k rows × 20 cols completes ≤3s main thread | Must |
| REQ-EX-NFR-02 | No third-party deps for CSV in core | Must |
| REQ-EX-NFR-03 | Unit tests cover escape edge cases (unicode, quotes, newlines) | Must |

### 4.6 Tier 3 — Excel export

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-EX-XLSX-01 | Package `@ol-grid/excel`; optional install | Must |
| REQ-EX-XLSX-02 | Registers via `ModuleRegistry`; augments `GridApi` with `exportDataAsExcel` | Must |
| REQ-EX-XLSX-03 | `exportDataAsExcel(params?)` downloads `.xlsx` | Must |
| REQ-EX-XLSX-04 | Row/column scope mirrors CSV params (`onlySelected`, `columnKeys`, etc.) | Must |
| REQ-EX-XLSX-05 | Sheet name configurable; default `Grid` | Should |
| REQ-EX-XLSX-06 | Header row bold + freeze top row (basic styling) | Should |
| REQ-EX-XLSX-07 | Number/date cell formats from column def or formatter metadata — subset | Should |
| REQ-EX-XLSX-08 | Column width approximate auto-width from header/content | Could |
| REQ-EX-XLSX-09 | `getDataAsExcel(): ArrayBuffer \| Uint8Array` for server-side save | Should |
| REQ-EX-XLSX-10 | `onExcelExport` cancel hook | Should |
| REQ-EX-XLSX-11 | Multiple sheets — out of scope v1 | — |
| REQ-EX-XLSX-12 | Embedded images/charts — out of scope v1 | — |

### 4.7 Row model integration

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-EX-RM-01 | CSRM: export uses filtered/sorted nodes from row model | Must |
| REQ-EX-RM-02 | Infinite/SSRM: exports **loaded** rows only unless `fetchAllData` callback provided | Should |
| REQ-EX-RM-03 | Group rows: option `skipGroupRows` / `exportGroupHeaders` with grouping module | Should |

---

## 5. API & Events

### 5.1 Grid options

```typescript
interface GridOptions<TData> {
  onCsvExport?: (params: CsvExportParams & { api: GridApi<TData> }) => boolean;
  onExcelExport?: (params: ExcelExportParams & { api: GridApi<TData> }) => boolean;
}
```

### 5.2 GridApi (core — CSV)

```typescript
interface CsvExportParams {
  fileName?: string;              // default 'export.csv'
  columnSeparator?: string;       // default ','
  includeHeaders?: boolean;       // default true
  allColumns?: boolean;
  onlySelected?: boolean;
  columnKeys?: string[];
  rowRange?: { start: number; end: number };
  exportRawValues?: boolean;
  utf8WithBom?: boolean;
  suppressCsvInjection?: boolean;
  processCellCallback?: (params: ProcessCellForExportParams) => string;
  processHeaderCallback?: (params: ProcessHeaderForExportParams) => string;
}

interface GridApi<TData> {
  exportDataAsCsv(params?: CsvExportParams): void;
  getDataAsCsv(params?: CsvExportParams): string;
}
```

### 5.3 GridApi (`@ol-grid/excel` augmentation)

```typescript
interface ExcelExportParams extends Omit<CsvExportParams, 'columnSeparator' | 'utf8WithBom'> {
  fileName?: string;           // default 'export.xlsx'
  sheetName?: string;
  exportStyles?: boolean;      // default true
}

interface GridApi<TData> {
  exportDataAsExcel(params?: ExcelExportParams): void;
  getDataAsExcel(params?: ExcelExportParams): ArrayBuffer;
}
```

### 5.4 Internal service (headless)

```typescript
function generateCsv<TData>(
  rows: RowNode<TData>[],
  columnDefs: ColumnDef<TData>[],
  api: GridApi<TData>,
  context: unknown,
  options: CsvExportOptions,
): string;

function downloadCsvContent(csv: string, fileName: string): void;
```

### 5.5 Module registration (Excel)

```typescript
import { ExcelExportModule } from '@ol-grid/excel';
ModuleRegistry.register(ExcelExportModule);
```

---

## 6. AG Grid Parity

Reference: [AG Grid CSV Export](https://www.ag-grid.com/javascript-data-grid/csv-export/) · [Excel Export](https://www.ag-grid.com/javascript-data-grid/excel-export/)

| AG Grid feature | AG Grid tier | ol-grid | Notes |
|-----------------|--------------|---------|-------|
| `exportDataAsCsv()` | Community | T2 | Partial — basic params only |
| `getDataAsCsv()` | Community | T2 | Not implemented |
| Custom CSV params (separator, headers) | Community | T2 | Partial |
| Export selected only | Community | T2 | Not implemented |
| `processCellCallback` | Community | T2 | Not implemented |
| `suppressQuotes` / BOM options | Community | T2 | Not implemented |
| Excel export | **Enterprise** | **T3** | MIT differentiator |
| Excel styling | **Enterprise** | **T3** | Subset v1 |
| Clipboard TSV | Enterprise | T3 | Separate [clipboard.md](./clipboard.md) |

**Note:** AG Grid Community CSV export is the baseline parity target for Tier 2 exit. Excel Enterprise features map to Tier 3 with documented styling subset.

---

## 7. Competitive Analysis

| Library | Export | ol-grid opportunity |
|---------|--------|---------------------|
| **AG Grid Community** | CSV only | Match + `getDataAsCsv` for SSR |
| **AG Grid Enterprise** | CSV + Excel styled | MIT Excel at T3 |
| **Handsontable** | CSV/Excel built-in | ol-grid for general grid + optional depth |
| **MUI Data Grid Pro** | CSV/Excel in Pro tier | MIT T2/T3 |
| **TanStack Table** | None (app-level) | ol-grid value-add |
| **Glide Data Grid** | Copy only | Full file export |

---

## 8. Tier Assignment

| Capability | Tier |
|------------|------|
| Basic CSV download (`exportDataAsCsv`) | T2 (partial) |
| Full CSV params, `getDataAsCsv`, selected export | T2 |
| Excel `.xlsx` with basic styling | T3 |
| SSRM full-dataset export via callback | T3 |
| Group row export options | T3 |

---

## 9. Acceptance Criteria

### 9.1 Tier 2 — CSV

- [ ] `api.exportDataAsCsv()` downloads file matching on-screen sorted/filtered data
- [ ] `columnSeparator: ';'` produces valid EU Excel import
- [ ] `getDataAsCsv()` returns string usable in Node test without DOM
- [ ] `onlySelected: true` export row count matches checkbox selection
- [ ] Unicode cells (emoji, CJK) round-trip UTF-8; BOM option works on Windows Excel
- [ ] Hidden columns excluded; `allColumns: true` includes them
- [ ] `processCellCallback` transforms cell before escape
- [ ] `onCsvExport` returning false cancels download
- [ ] Unit tests: escape commas, quotes, newlines, unicode

### 9.2 Tier 3 — Excel

- [ ] `exportDataAsExcel()` produces valid xlsx opening in Excel and LibreOffice
- [ ] Header row bold + frozen
- [ ] Number column displays numeric type in Excel
- [ ] `getDataAsExcel()` returns buffer for programmatic save
- [ ] Bundle impact documented; license in NOTICE if third-party lib used
- [ ] Manual QA checklist in `docs/export-excel.md`

---

## 10. Dependencies

| Dependency | Role |
|------------|------|
| `@ol-grid/core` | CSV generation, row resolution, display pipeline |
| `@ol-grid/selection` | `onlySelected` row scope |
| `@ol-grid/grouping` | Group header export options (T3) |
| `@ol-grid/infinite-row-model` / `@ol-grid/server-side-row-model` | `fetchAllData` callback (T3) |
| `@ol-grid/context-menu` | Optional export menu items |
| [internationalization.md](./internationalization.md) | `csvExport`, `excelExport` locale keys |
| Third-party xlsx lib (T3) | Optional dep; SheetJS or ExcelJS — see OQ-EX-01 |

---

## 11. Open Questions

| # | Question | Options | Recommendation |
|---|----------|---------|----------------|
| OQ-EX-01 | Excel library | SheetJS / ExcelJS / custom | SheetJS community or ExcelJS MIT |
| OQ-EX-02 | CSV in core vs `@ol-grid/export-csv` | Split / keep in core | Keep in core (small, zero-dep) |
| OQ-EX-03 | Server-side export API | Dedicated endpoint helper | `getDataAsCsv` sufficient v1 |
| OQ-EX-04 | Streaming export for 1M rows | Chunked / Web Worker | Tier 3 optional; progress callback |
| OQ-EX-05 | Export uses formatted or raw values default? | Formatted / raw | Formatted (matches AG Grid); `exportRawValues` override |

---

## 12. References

- [REQUIREMENTS.md §4.2.5](../REQUIREMENTS.md) — T2-EX-01
- [REQUIREMENTS.md §4.3.3](../REQUIREMENTS.md) — T3-EX-01
- [ARCHITECTURE.md §3.7](../ARCHITECTURE.md) — Export pipeline
- [clipboard.md](./clipboard.md) — Interactive clipboard (separate from file export)
- [ag-grid-migration.md](./ag-grid-migration.md) — `CsvExportParams` mapping
- [AG Grid CSV Export](https://www.ag-grid.com/javascript-data-grid/csv-export/)
- [AG Grid Excel Export](https://www.ag-grid.com/javascript-data-grid/excel-export/)
- Implementation: `packages/core/src/export/csv-export.ts`, `packages/core/src/engine/grid-engine.ts`

---

*Authoritative for CSV and Excel file export scope. Interactive clipboard copy/paste is documented in [clipboard.md](./clipboard.md).*

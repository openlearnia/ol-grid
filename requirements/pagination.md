# Pagination — Feature Requirements

> **Package:** `@ol-grid/core` (pagination pipeline stage) + `@ol-grid/dom-renderer` (pagination panel)  
> **Document version:** 1.0  
> **Last updated:** June 2026  
> **Status:** Draft — not yet implemented

Parent documents: [REQUIREMENTS.md](../REQUIREMENTS.md), [ARCHITECTURE.md](../ARCHITECTURE.md)

---

## 1. Overview

### 1.1 Summary

**Pagination** provides an alternative UX to vertical virtual scrolling: the grid displays a **fixed page** of rows (e.g. 25, 50, 100) with a footer panel to change pages and page size. In ol-grid, pagination is implemented as an optional **row-model pipeline stage** on CSRM (and configurable integration with server-side models). **Client pagination** and **virtual scroll are mutually exclusive** for vertical layout — when pagination is on, all rows on the current page render without row virtualization.

### 1.2 Goals

| ID | Goal |
|----|------|
| G-PAGE-01 | AG Grid–familiar `pagination`, `paginationPageSize`, and pagination panel UX |
| G-PAGE-02 | Page changes preserve column state, sort, and filter where possible |
| G-PAGE-03 | Serializable pagination state for controlled mode and persistence |
| G-PAGE-04 | Clear integration story with SSRM server pagination (Tier 3) |
| G-PAGE-05 | Accessible pagination controls (keyboard, ARIA) |

### 1.3 Non-goals

| Item | Rationale |
|------|-----------|
| Infinite scroll block loading | [infinite-row-model.md](./infinite-row-model.md) — default scalable UX |
| Cursor-based server pagination protocol | App-defined in SSRM datasource |
| Mobile infinite-scroll-only UI | Desktop-first; pagination panel is explicit control |
| Paginating columns horizontally | Column virtual handles wide grids |

### 1.4 Current implementation snapshot

| Capability | Status |
|------------|--------|
| Virtual scroll as default UX | **Done** |
| Pagination pipeline stage | **Not started** |
| Pagination panel UI | **Not started** |
| `paginationPageSizeSelector` | **Not started** |

---

## 2. User stories

### US-PAGE-01 — Classic admin table

As an application developer, I enable `pagination: true` with `paginationPageSize: 25` so users see a familiar paged table instead of infinite scroll — matching legacy admin UIs.

### US-PAGE-02 — Page size selector

As an end user, I choose "50" or "100" rows per page from a dropdown so I control how much data I view at once.

### US-PAGE-03 — Filtered pagination

As a developer, when filters reduce the dataset from 1000 to 40 rows, pagination shows 2 pages at size 25 and resets to page 0 if current page is out of range.

### US-PAGE-04 — Server-side pagination

As an enterprise developer using SSRM, I configure the server to return one page per `getRows` request while the pagination panel drives `startRow` / `endRow` — see [server-side-row-model.md](./server-side-row-model.md).

### US-PAGE-05 — Persist page across sessions

As a developer, I save `paginationGetCurrentPage()` and `paginationGetPageSize()` to URL query params and restore on load.

---

## 3. Functional requirements

### 3.1 Client-side pagination (CSRM)

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| REQ-PAGE-01 | `pagination: true` MUST enable pagination mode on CSRM | Must | T2 |
| REQ-PAGE-02 | `paginationPageSize` default MUST be 100; configurable | Must | T2 |
| REQ-PAGE-03 | Pipeline MUST slice displayed rows: `[page * pageSize, (page+1) * pageSize)` after filter/sort | Must | T2 |
| REQ-PAGE-04 | `paginationAutoPageSize` MAY fit page size to viewport height (disables fixed selector) | Could | T2 |
| REQ-PAGE-05 | `getDisplayedRowCount()` MUST return min(pageSize, remaining rows on page) not total | Must | T2 |
| REQ-PAGE-06 | Total pages MUST be `ceil(filteredRowCount / pageSize)` | Must | T2 |

### 3.2 Mutual exclusion with virtualization

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| REQ-PAGE-10 | `pagination: true` MUST set `suppressRowVirtualisation: true` internally | Must | T2 |
| REQ-PAGE-11 | All rows on current page MUST render in DOM (subject to column virtual T3) | Must | T2 |
| REQ-PAGE-12 | Vertical scrollbar on body MUST be hidden or minimal when page fits viewport | Should | T2 |
| REQ-PAGE-13 | See [virtualization.md](./virtualization.md) REQ-VIRT-70–71 | Must | T2 |

### 3.3 Page navigation

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| REQ-PAGE-20 | `paginationGoToPage(page)` MUST clamp to `[0, totalPages-1]` | Must | T2 |
| REQ-PAGE-21 | `paginationGoToFirstPage`, `paginationGoToLastPage`, `paginationGoToNextPage`, `paginationGoToPreviousPage` MUST be on GridApi | Must | T2 |
| REQ-PAGE-22 | Changing sort or filter MUST reset to page 0 by default (`suppressPaginationOnFilter` to opt out) | Should | T2 |
| REQ-PAGE-23 | Page change MUST emit `paginationChanged` once | Must | T2 |
| REQ-PAGE-24 | Focused cell MUST move to valid cell on new page or clear if out of range | Should | T2 |

### 3.4 Page size selector

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| REQ-PAGE-30 | `paginationPageSizeSelector` MUST accept number array e.g. `[25, 50, 100]` | Must | T2 |
| REQ-PAGE-31 | Changing page size MUST reset to page 0 and re-slice | Must | T2 |
| REQ-PAGE-32 | Selector UI MUST be localizable via `localeText` | Must | T2 |
| REQ-PAGE-33 | `paginationSetPageSize(size)` imperative API MUST match selector behavior | Must | T2 |

### 3.5 Pagination panel UI

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| REQ-PAGE-40 | Default panel MUST show: first, prev, page indicator, next, last, page size selector | Must | T2 |
| REQ-PAGE-41 | Panel MUST render below grid body (`role="navigation"`, `aria-label` from locale) | Must | T2 |
| REQ-PAGE-42 | `suppressPaginationPanel: true` MUST hide UI while keeping API pagination | Should | T2 |
| REQ-PAGE-43 | Custom panel via `paginationPanel` renderer slot or framework component | Could | T3 |
| REQ-PAGE-44 | Page indicator MUST show `currentPage + 1` of `totalPages` and total row count when known | Should | T2 |

### 3.6 Server-side pagination (SSRM)

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| REQ-PAGE-50 | SSRM MAY use pagination panel to set `startRow`/`endRow` on datasource requests | Should | T3 |
| REQ-PAGE-51 | Server MUST return `rowCount` (total) for correct page count display | Must | T3 |
| REQ-PAGE-52 | `pagination: true` + SSRM MUST NOT client-slice rows; server owns page content | Must | T3 |
| REQ-PAGE-53 | Page change MUST call `refreshServerSide` or datasource with new range — [server-side-row-model.md](./server-side-row-model.md) | Must | T3 |

### 3.7 Infinite row model interaction

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| REQ-PAGE-60 | `pagination: true` + `rowModelType: 'infinite'` MUST warn and ignore pagination (or throw strict) | Must | T2 |
| REQ-PAGE-61 | Document infinite scroll as recommended for large remote flat data | Must | T2 |

### 3.8 State and controlled mode

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| REQ-PAGE-70 | Pagination state slice: `{ page, pageSize, totalPages, rowCount }` | Must | T2 |
| REQ-PAGE-71 | Controlled props `paginationPage`, `paginationPageSize` MUST sync with store | Should | T2 |
| REQ-PAGE-72 | State MUST be JSON-serializable in grid snapshot | Must | T2 |

---

## 4. API surface

### 4.1 Types

```typescript
interface PaginationState {
  page: number;
  pageSize: number;
  totalPages: number;
  rowCount: number;  // filtered total for CSRM
}

interface PaginationChangedEvent {
  api: GridApi;
  newPage: number;
  newPageSize: number;
  keepRenderedRows?: boolean;
}
```

### 4.2 GridOptions

| Option | Default | Tier |
|--------|---------|------|
| `pagination` | `false` | T2 |
| `paginationPageSize` | `100` | T2 |
| `paginationAutoPageSize` | `false` | T2 |
| `paginationPageSizeSelector` | `[20, 50, 100]` | T2 |
| `suppressPaginationPanel` | `false` | T2 |
| `suppressPaginationOnFilter` | `false` | T2 |
| `paginateChildRows` | `false` | T3 grouping |

### 4.3 GridApi methods

| Method | Description | Tier |
|--------|-------------|------|
| `paginationGetCurrentPage()` | 0-based index | T2 |
| `paginationGetTotalPages()` | | T2 |
| `paginationGetPageSize()` | | T2 |
| `paginationGoToPage(page)` | | T2 |
| `paginationGoToFirstPage()` | | T2 |
| `paginationGoToLastPage()` | | T2 |
| `paginationGoToNextPage()` | | T2 |
| `paginationGoToPreviousPage()` | | T2 |
| `paginationSetPageSize(size)` | | T2 |
| `paginationIsLastPageFound()` | SSRM: total known | T3 |

### 4.4 Events

| Event | Tier |
|-------|------|
| `paginationChanged` | T2 |
| `modelUpdated` | T2 (on page slice change) |

---

## 5. AG Grid parity matrix

| Feature | AG Grid Community | AG Grid Enterprise | ol-grid target |
|---------|-------------------|--------------------|----------------|
| Client pagination | Yes | Yes | **T2** |
| Pagination panel | Yes | Yes | **T2** |
| Page size selector | Yes | Yes | **T2** |
| `paginationAutoPageSize` | Yes | Yes | **T2** optional |
| Server pagination (SSRM) | No | Yes | **T3** |
| Paginate child rows (grouping) | No | Yes | **T3** |
| Cursor pagination | No | No | **N/A** |

---

## 6. Competitive analysis

| Library | Pagination | ol-grid implication |
|---------|------------|---------------------|
| **AG Grid** | Panel + API; works with CSRM | Primary UX reference |
| **TanStack Table** | `getPaginationRowModel()` manual | ol-grid integrates as pipeline stage + UI |
| **MUI Data Grid** | Built-in footer pagination | Similar panel; no MUI coupling |
| **Tabulator** | `pagination: 'local' \| 'remote'` | Map remote to SSRM + PAGE-50 |
| **Ant Design Table** | Opinionated pagination component | ol-grid ships default panel tokens |

---

## 7. Tier and priority

| Phase | Scope | Priority |
|-------|-------|----------|
| **Tier 2** | CSRM pagination, panel UI, API, virtual scroll off | P1 |
| **Tier 3** | SSRM server pagination, `paginateChildRows` with grouping | P2 |

---

## 8. Acceptance criteria

1. **Slice:** 237 filtered rows, pageSize 50, page 4 shows 37 rows (indices 200–236).
2. **Reset on filter:** On page 5, applying filter with 10 results shows page 0 with 10 rows.
3. **No virtual:** Pagination mode DOM row count equals displayed page row count.
4. **API navigation:** `paginationGoToNextPage()` increments page; at last page no-op.
5. **Page size:** Changing 25 → 100 resets to page 0; total pages recalculated.
6. **a11y:** Pagination nav operable via Tab; current page announced in `aria-current`.
7. **Infinite conflict:** `pagination: true` + infinite model logs warning; pagination ignored.
8. **Locale:** French `localeText` shows localized "Page" and "of" strings.

---

## 9. Dependencies

| Feature | Relationship |
|---------|--------------|
| [client-side-row-model.md](./client-side-row-model.md) | Pipeline terminal stage |
| [virtualization.md](./virtualization.md) | Disabled when pagination on |
| [server-side-row-model.md](./server-side-row-model.md) | Server page fetch |
| [infinite-row-model.md](./infinite-row-model.md) | Incompatible UX — document |
| [column-model.md](./column-model.md) | Unaffected by page changes |
| `@ol-grid/filter` | May reset page on change |
| `@ol-grid/dom-renderer` | Pagination panel DOM |

---

## 10. Open questions

| # | Question | Options |
|---|----------|---------|
| OQ-PAGE-1 | Default `paginationPageSize` — 100 AG Grid or 25 common admin? | 100 / 25 |
| OQ-PAGE-2 | `paginationAutoPageSize` in Tier 2 or defer? | T2 / T3 |
| OQ-PAGE-3 | Show total row count in panel always? | always / optional |
| OQ-PAGE-4 | URL sync helper in core or examples only? | examples / `@ol-grid/routing` |
| OQ-PAGE-5 | SSRM: panel drives page vs infinite scroll within route? | panel only |

---

## 11. References

- [AG Grid — Pagination](https://www.ag-grid.com/javascript-data-grid/pagination/)
- [AG Grid — Row Models](https://www.ag-grid.com/javascript-data-grid/row-models/)
- [AG Grid — SSRM Configuration](https://www.ag-grid.com/javascript-data-grid/server-side-model-configuration/)
- [TanStack Table — Pagination Guide](https://tanstack.com/table/latest/docs/guide/pagination)
- [ol-grid REQUIREMENTS.md §4.2.5](../REQUIREMENTS.md)
- [ol-grid ARCHITECTURE.md §3.3 pipeline](../ARCHITECTURE.md)

---

*Pagination requirements — authoritative for paged row display in ol-grid.*

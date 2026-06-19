# ol-grid — Internationalization (i18n) Requirements

> Packages: `@ol-grid/core` (locale keys only), `@ol-grid/locale-*` (planned), renderers (UI strings)  
> Parent: [REQUIREMENTS.md](../REQUIREMENTS.md) · [ARCHITECTURE.md](../REQUIREMENTS.md)  
> **Document version:** 1.0 · **Last updated:** June 2026 · **Status:** Draft

---

## 1. Overview

Internationalization ensures **no hard-coded user-facing strings** in core logic paths and provides overrideable locale bundles for built-in UI (headers, filters, aria labels, pagination, overlays). Date/number formatting in filters and export respects locale configuration.

### 1.1 Principles

| ID | Principle |
|----|-----------|
| I18N-P-01 | Core emits **locale keys + interpolation params**, not English sentences |
| I18N-P-02 | Default English bundled; other locales separate imports (tree-shakeable) |
| I18N-P-03 | `localeText` on `GridOptions` deep-merges with active locale |
| I18N-P-04 | RTL is layout (see [theming.md](./theming.md)), not translation |
| I18N-P-05 | Column `headerName` is consumer-owned — not auto-translated |

### 1.2 Scope

| In scope | Out of scope |
|----------|--------------|
| Built-in UI string catalog | Auto-translation / ICU in core |
| `localeText` override API | Translating consumer `rowData` |
| `locale` + `Intl` formatters | Server-side gettext integration |
| Aria label strings | Locale-specific sort collation (use comparator) |
| Pagination / filter labels | Right-to-left **text** shaping (browser handles) |
| Export CSV encoding (UTF-8 BOM option) | Multi-byte legacy encodings |

---

## 2. AG Grid Parity Reference

| AG Grid | ol-grid REQ | Tier | Status |
|---------|-------------|------|--------|
| `localeText` | I18N-API-* | T2 | Not started |
| Default English locale | I18N-PKG-01 | T2 | Not started |
| Filter locale strings | I18N-FLT-* | T2 | Not started |
| Aria locale | I18N-A11Y-* | T2 | Partial — hardcoded in DOM |
| RTL | I18N-RTL-* | T2 | Not started |

Parent requirements: T2-I18N-01, T2-I18N-02; NFR-I-01 through NFR-I-05.

---

## 3. Locale API

**REQ-I18N-API-01** — `GridOptions.locale` accepts BCP 47 tag string (e.g. `en-US`, `de-DE`). Default: `en-US`.

**REQ-I18N-API-02** — `GridOptions.localeText` accepts partial `LocaleText` object; deep merge over active locale bundle.

**REQ-I18N-API-03** — Merge order: built-in locale → `locale` package import → `localeText` overrides.

**REQ-I18N-API-04** — `getLocaleText(key, params?)` internal helper resolves string with `{placeholder}` interpolation.

**REQ-I18N-API-05** — Changing `locale` or `localeText` at runtime MUST refresh affected UI without destroy.

**REQ-I18N-API-06** — Core MUST NOT import locale JSON directly from feature packages (avoid circular deps); inject via options or context.

---

## 4. LocaleText Catalog (minimum keys)

### 4.1 General

| Key | Default (en-US) | Used by |
|-----|-----------------|---------|
| `noRowsToShow` | No Rows To Show | Overlay |
| `loadingOoo` | Loading... | Overlay |
| `errorLoading` | Error loading rows | Overlay |
| `page` | Page | Pagination |
| `pageSize` | Page Size | Pagination |
| `of` | of | Pagination |
| `to` | to | Pagination |
| `more` | More | Infinite scroll |

### 4.2 Selection

| Key | Default | Used by |
|-----|---------|---------|
| `selectAll` | Select All | Header checkbox |
| `selectRow` | Select Row | Row checkbox aria |
| `deselectAll` | Deselect All | Selection |

### 4.3 Sort & filter

| Key | Default | Used by |
|-----|---------|---------|
| `sortAscending` | Sorted Ascending | aria-sort announcement |
| `sortDescending` | Sorted Descending | aria-sort |
| `sortUnSort` | Unsorted | aria-sort |
| `filterOoo` | Filter... | Filter input placeholder |
| `equals` | Equals | Filter ops |
| `notEqual` | Not equal | Filter ops |
| `contains` | Contains | Text filter |
| `notContains` | Not contains | Text filter |
| `startsWith` | Starts with | Text filter |
| `endsWith` | Ends with | Text filter |
| `lessThan` | Less than | Number filter |
| `greaterThan` | Greater than | Number filter |
| `inRange` | In range | Date/number |
| `applyFilter` | Apply | Filter panel |
| `resetFilter` | Reset | Filter panel |
| `clearFilter` | Clear | Filter |

### 4.4 Editing & clipboard

| Key | Default | Used by |
|-----|---------|---------|
| `cancel` | Cancel | Editor |
| `save` | Save | Full-row edit |
| `copy` | Copy | Context menu |
| `paste` | Paste | Context menu |
| `ctrlC` | Ctrl+C | Tooltip |
| `ctrlV` | Ctrl+V | Tooltip |

### 4.5 Export

| Key | Default | Used by |
|-----|---------|---------|
| `export` | Export | Menu |
| `csvExport` | CSV Export | Menu |
| `excelExport` | Excel Export | Menu |

**REQ-I18N-CAT-01** — Catalog keys MUST match AG Grid `localeText` where semantics align (migration ergonomics).

**REQ-I18N-CAT-02** — New keys require documentation in TypeDoc `LocaleText` interface.

**REQ-I18N-CAT-03** — Unknown keys in `localeText` override SHOULD warn in dev mode only.

---

## 5. Locale Packages

**REQ-I18N-PKG-01** — `@ol-grid/locale-en-US` default embedded or re-exported from `@ol-grid/core` minimal set (Tier 2: separate only).

**REQ-I18N-PKG-02** — Additional packages: `@ol-grid/locale-de`, `@ol-grid/locale-fr`, `@ol-grid/locale-es`, `@ol-grid/locale-ja`, `@ol-grid/locale-zh-CN` (Tier 2 minimum set).

**REQ-I18N-PKG-03** — Each locale package exports `const localeDe: LocaleText` and `export default`.

**REQ-I18N-PKG-04** — Community locales welcome via PR; CI validates key completeness vs English master.

**REQ-I18N-PKG-05** — Locale packages have zero runtime deps; `sideEffects: false`.

---

## 6. Formatting

**REQ-I18N-FMT-01** — `GridOptions.locale` drives `Intl.NumberFormat` and `Intl.DateTimeFormat` for filter inputs and display where applicable.

**REQ-I18N-FMT-02** — `GridOptions.dateFormat` / `numberFormat` optional overrides per column.

**REQ-I18N-FMT-03** — CSV export uses formatted display values by default (`exportDataAsCsv({ useFormattedValues: true })`).

**REQ-I18N-FMT-04** — Excel export (Tier 3) writes locale-aware number/date cell formats when supported.

**REQ-I18N-FMT-05** — Parsing user filter input respects locale decimal separator when `locale` set.

---

## 7. Renderer Responsibilities

**REQ-I18N-REN-01** — DOM renderer resolves all built-in aria-labels via `getLocaleText`.

**REQ-I18N-REN-02** — Hard-coded strings in renderer (e.g. current `"Select row"`) MUST be removed by Tier 2.

**REQ-I18N-REN-03** — Filter floating UI (Tier 2) uses locale keys for buttons and operators.

**REQ-I18N-REN-04** — Pagination panel labels from locale catalog.

**REQ-I18N-REN-05** — Canvas renderer a11y DOM uses same locale resolution as DOM renderer.

---

## 8. Core Responsibilities

**REQ-I18N-CORE-01** — Core MUST NOT contain English UI strings except dev-only error messages.

**REQ-I18N-CORE-02** — Error messages for misconfiguration (e.g. missing module) MAY be English in dev; production builds use codes.

**REQ-I18N-CORE-03** — Event payloads MAY include `localeKey` for adapter announcements.

---

## 9. RTL Interaction

**REQ-I18N-RTL-01** — `GridOptions.enableRtl` independent of `locale` (e.g. Arabic locale may still LTR in tests).

**REQ-I18N-RTL-02** — Document that `he-IL` + `enableRtl: true` is typical pairing.

**REQ-I18N-RTL-03** — Locale strings remain logical; layout mirrors via CSS (see theming).

---

## 10. Accessibility Announcements

**REQ-I18N-A11Y-01** — Live region messages use locale strings: sort changed, filter applied, N rows selected.

**REQ-I18N-A11Y-02** — Message patterns support pluralization via `Intl.PluralRules` or simple `{count}` param.

**REQ-I18N-A11Y-03** — Screen reader language: `lang` attribute on grid host from `locale` (primary subtag).

---

## 11. Export & Encoding

**REQ-I18N-EXP-01** — CSV default UTF-8; optional UTF-8 BOM for Excel compatibility (`utf8WithBom: true`).

**REQ-I18N-EXP-02** — Column separator override independent of locale (e.g. `;` for EU Excel).

**REQ-I18N-EXP-03** — File names from `fileName` param not localized by grid.

---

## 12. TypeScript Surface

```typescript
interface LocaleText {
  noRowsToShow?: string;
  selectRow?: string;
  // ... full catalog
}

interface GridOptions<TData> {
  locale?: string;
  localeText?: Partial<LocaleText>;
}
```

**REQ-I18N-TS-01** — `LocaleText` interface exported from `@ol-grid/core` or `@ol-grid/locale-en-US`.

**REQ-I18N-TS-02** — Strict typing prevents typos in `localeText` keys.

---

## 13. Current Implementation Status

- No `locale` or `localeText` on `GridOptions`
- DOM renderer hardcodes `aria-label="Select row"` on checkbox
- No locale packages in monorepo
- CSV export has no UTF-8 BOM option
- Quick filter is ASCII-oriented (no diacritic normalization — Tier 3 optional)

---

## 14. Acceptance Criteria

### Tier 2

- [ ] AC-I18N-01: `localeText: { selectRow: 'Zeile auswählen' }` updates checkbox aria-label in German
- [ ] AC-I18N-02: `@ol-grid/locale-de` import sets full UI without `localeText`
- [ ] AC-I18N-03: Missing keys fall back to English
- [ ] AC-I18N-04: CI test asserts English catalog completeness vs renderer key usage
- [ ] AC-I18N-05: Date filter displays per `de-DE` format
- [ ] AC-I18N-06: No hard-coded user strings in dom-renderer (grep gate in CI)

### Tier 3

- [ ] AC-I18N-07: Excel export respects number format for `fr-FR`
- [ ] AC-I18N-08: Live region sort announcement localized

---

## 15. Testing

**REQ-I18N-TEST-01** — Unit: merge logic for `localeText` deep override.

**REQ-I18N-TEST-02** — Integration: render grid with `locale-de`, query aria-label.

**REQ-I18N-TEST-03** — Script: diff `LocaleText` keys across locale packages.

---

## 16. Migration from AG Grid

**REQ-I18N-MIG-01** — Document key mapping AG Grid `localeText` → ol-grid `LocaleText` (≥90% key parity for Community UI).

**REQ-I18N-MIG-02** — Provide codemod or table for renamed keys if any.

---

## 17. Open Questions

| ID | Question | Recommendation |
|----|----------|----------------|
| OQ-I18N-01 | Embed English in core vs separate package | Separate for bundle size |
| OQ-I18N-02 | ICU MessageFormat support | Defer; simple `{param}` v1 |
| OQ-I18N-03 | Collation locale for sort | Document use of `comparator` |

---

*Authoritative for i18n. Coordinate with [accessibility.md](./accessibility.md) for aria strings.*

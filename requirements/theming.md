# ol-grid — Theming Requirements

> Packages: `@ol-grid/dom-renderer` (built-in CSS), `@ol-grid/themes` (planned)  
> Parent: [REQUIREMENTS.md](../REQUIREMENTS.md) · [ARCHITECTURE.md](../ARCHITECTURE.md)  
> **Document version:** 1.0 · **Last updated:** June 2026 · **Status:** Draft

---

## 1. Overview

ol-grid theming provides **predictable, token-based styling** without runtime CSS-in-JS. Consumers customize appearance via CSS custom properties, optional theme packages, and BEM class overrides. Canvas and DOM renderers MUST consume the same semantic tokens.

### 1.1 Goals

| ID | Goal |
|----|------|
| TH-G-01 | Ship usable light + dark default without consumer CSS |
| TH-G-02 | AG Grid Alpine migrators recognize familiar visual language |
| TH-G-03 | Design systems override tokens without forking renderer code |
| TH-G-04 | Stable BEM class names across minor versions |
| TH-G-05 | Zero theming logic in `@ol-grid/core` |

### 1.2 Scope

| In scope | Out of scope |
|----------|--------------|
| CSS custom property design tokens | Runtime CSS-in-JS (styled-components, etc.) |
| Default + Alpine-inspired themes | Full AG Grid Quartz param compatibility (OQ-6) |
| Light / dark / system preference | Per-cell inline style API |
| BEM class naming convention | Theme builder GUI |
| Token → canvas `ThemeTokens` map | MUI/Material auto-theme |
| Web Component host variable inheritance | Shadow DOM default (off) |

---

## 2. AG Grid Parity Reference

| AG Grid | ol-grid REQ | Tier | Status |
|---------|-------------|------|--------|
| Alpine theme | TH-PKG-03 | T1 | Not started (default only) |
| Quartz / theme parameters | TH-PKG-05 | T2+ | Out of scope v1 |
| Built-in themes | TH-PKG-* | T1 | Partial — inline in dom-renderer |
| Dark mode | TH-MODE-* | T1 | Partial — CSS vars exist, no dark file |
| `prefers-color-scheme` | TH-MODE-03 | T1 | Not started |
| RTL layout tokens | TH-RTL-* | T2 | Not started |

---

## 3. Design Token Requirements

### 3.1 Core tokens (minimum)

**REQ-TH-TOKEN-01** — The following CSS variables MUST be defined on `.ol-grid` (or documented host):

| Token | Purpose | Default (light) |
|-------|---------|-----------------|
| `--ol-grid-font-family` | Body font | `system-ui, sans-serif` |
| `--ol-grid-font-size` | Base size | `13px` |
| `--ol-grid-row-height` | Row line box | `32px` (synced from engine) |
| `--ol-grid-header-height` | Header row | `32px` |
| `--ol-grid-border-color` | Grid lines | `#e2e8f0` |
| `--ol-grid-header-bg` | Header fill | `#f8fafc` |
| `--ol-grid-row-hover-bg` | Row hover | `#f1f5f9` |
| `--ol-grid-row-selected-bg` | Selection | `#dbeafe` |
| `--ol-grid-cell-padding` | Cell inset | `0 12px` |
| `--ol-grid-focus-ring` | Focus outline | `0 0 0 2px #3b82f6` |
| `--ol-grid-text-color` | Primary text | `#0f172a` |
| `--ol-grid-muted-color` | Secondary text | `#64748b` |
| `--ol-grid-pinned-left-width` | Layout | `0px` (dynamic) |
| `--ol-grid-background` | Grid surface | `#ffffff` |

**REQ-TH-TOKEN-02** — Dark theme MUST override the same keys under `[data-ol-theme="dark"]` or `.ol-grid--dark`.

**REQ-TH-TOKEN-03** — Tokens MUST use semantic names (not `--ol-grid-blue-500`).

**REQ-TH-TOKEN-04** — Engine-driven layout vars (`--ol-grid-row-height`, `--ol-grid-pinned-left-width`) MAY be set inline on host by renderer.

### 3.2 Extended tokens (Tier 2)

**REQ-TH-TOKEN-10** — Additional tokens: `--ol-grid-header-text-color`, `--ol-grid-sort-indicator-color`, `--ol-grid-checkbox-accent`, `--ol-grid-editor-border`, `--ol-grid-overlay-bg`, `--ol-grid-error-color`, `--ol-grid-font-weight-header`.

**REQ-TH-TOKEN-11** — Spacing scale: `--ol-grid-radius-sm`, `--ol-grid-shadow-overlay` for menus/panels.

---

## 4. Class Naming (BEM)

**REQ-TH-BEM-01** — Block: `ol-grid`.

**REQ-TH-BEM-02** — Elements: `ol-grid__{element}` — e.g. `ol-grid__cell`, `ol-grid__header-cell`, `ol-grid__resize-handle`.

**REQ-TH-BEM-03** — Modifiers: `ol-grid__{element}--{modifier}` — e.g. `ol-grid__row--selected`, `ol-grid__cell--focused`, `ol-grid__header-cell--sortable`.

**REQ-TH-BEM-04** — Renderer variant modifier: `ol-grid--canvas` on host when canvas renderer active.

**REQ-TH-BEM-05** — Class names are **public API** for override selectors; breaking changes require major semver.

**REQ-TH-BEM-06** — No hashed/obfuscated class names in distributed CSS.

---

## 5. Theme Modes

**REQ-TH-MODE-01** — Light theme is default when no `data-ol-theme` attribute present.

**REQ-TH-MODE-02** — Dark theme activated by `data-ol-theme="dark"` on grid host or ancestor.

**REQ-TH-MODE-03** — System mode: `data-ol-theme="system"` uses `@media (prefers-color-scheme: dark)` to apply dark token set.

**REQ-TH-MODE-04** — `GridOptions.theme` — `'light' | 'dark' | 'system' | string` sets attribute on host (Tier 1).

**REQ-TH-MODE-05** — Theme change MUST NOT require grid destroy; hot-swap via attribute + CSS.

**REQ-TH-MODE-06** — `prefers-reduced-motion`: disable row transition animations (Tier 2).

---

## 6. Theme Packages

**REQ-TH-PKG-01** — `@ol-grid/themes` package exports CSS entry points only; `sideEffects: ["*.css"]`.

**REQ-TH-PKG-02** — `@ol-grid/themes/default` — base tokens + structural rules (extract from dom-renderer).

**REQ-TH-PKG-03** — `@ol-grid/themes/alpine` — AG Grid Alpine-inspired colors, borders, header weight (Should for T1).

**REQ-TH-PKG-04** — `@ol-grid/themes/material` — Material 3 aligned tokens (Tier 2 optional).

**REQ-TH-PKG-05** — Quartz compatibility layer — deferred (parent OQ-6).

**REQ-TH-PKG-06** — Each theme CSS file documents required token overrides for extension.

---

## 7. Consumption Patterns

### 7.1 DOM renderer

**REQ-TH-DOM-01** — Default: `ensureThemeStyles()` injects bundled CSS once (current behavior).

**REQ-TH-DOM-02** — Opt-out: `GridOptions.injectThemeStyles: false` when consumer imports theme CSS manually.

**REQ-TH-DOM-03** — Consumer override:

```css
.my-app .ol-grid {
  --ol-grid-header-bg: var(--app-surface-elevated);
  --ol-grid-row-selected-bg: var(--app-primary-subtle);
}
```

**REQ-TH-DOM-04** — Class override allowed but tokens preferred:

```css
.ol-grid__header-cell { font-weight: 700; }
```

### 7.2 Canvas renderer

**REQ-TH-CANVAS-01** — `resolveThemeTokens(host: HTMLElement): ThemeTokens` reads computed styles.

**REQ-TH-CANVAS-02** — `ThemeTokens` TypeScript interface mirrors CSS variable keys.

**REQ-TH-CANVAS-03** — Token refresh on `MutationObserver` or theme attribute change.

### 7.3 Web Component

**REQ-TH-WC-01** — Shadow DOM **off** by default; host element inherits document CSS variables.

**REQ-TH-WC-02** — When shadow enabled (opt-in), theme CSS MUST be adopted into shadow root or use `::part()` exposure documented.

---

## 8. RTL Support

**REQ-TH-RTL-01** — `dir="rtl"` on host or `GridOptions.enableRtl: true` sets direction on root.

**REQ-TH-RTL-02** — Logical properties preferred in CSS (`padding-inline`, `border-inline-end`) — Tier 2 refactor.

**REQ-TH-RTL-03** — Pinned column semantics flip: "start" pin vs "end" pin in logical terms.

**REQ-TH-RTL-04** — Sort indicator and resize handle positions mirror in RTL.

---

## 9. Accessibility & Theming

**REQ-TH-A11Y-01** — Focus ring token MUST meet WCAG 2.4.7 contrast against row and header backgrounds.

**REQ-TH-A11Y-02** — Selected row background + text contrast ≥4.5:1 (AA).

**REQ-TH-A11Y-03** — High contrast theme variant — Tier 3 optional `@ol-grid/themes/high-contrast`.

**REQ-TH-A11Y-04** — Never rely on color alone for sort state — indicator glyph required.

---

## 10. Framework Integration

**REQ-TH-FW-01** — React/Vue/Svelte/Angular adapters pass `className` / `class` to host wrapper only; inner `ol-grid` classes owned by renderer.

**REQ-TH-FW-02** — Theme CSS import documented per framework:

```ts
import '@ol-grid/themes/default.css';
```

**REQ-TH-FW-03** — SSR: CSS import on client bundle; no FOUC via static link in HTML shell.

---

## 11. Current Implementation Notes

`packages/dom-renderer/src/theme.css` (~266 lines) implements:

- Full BEM structure for default light theme
- Core tokens listed in §3.1
- Row hover, selection, focus, editor, checkbox styles
- No separate `@ol-grid/themes` package yet
- No dark mode file or `data-ol-theme` selectors
- Alpine theme not started

Host wrapper in React uses `ol-grid-host` class (adapter), inner host gets `ol-grid` from renderer.

---

## 12. Acceptance Criteria

### Tier 1

- [ ] AC-TH-01: Grid renders legibly with zero consumer CSS beyond height on container
- [ ] AC-TH-02: Token override on parent changes header bg without JS
- [ ] AC-TH-03: `data-ol-theme="dark"` produces documented dark palette
- [ ] AC-TH-04: Focus ring visible on keyboard nav in default and dark themes
- [ ] AC-TH-05: BEM classes stable — snapshot test of class list on standard grid

### Tier 2

- [ ] AC-TH-06: Alpine theme visually matches reference screenshot within agreed tolerance
- [ ] AC-TH-07: RTL demo with pinned columns mirrors correctly
- [ ] AC-TH-08: `prefers-reduced-motion` disables hover transitions
- [ ] AC-TH-09: Canvas renderer reads same tokens as DOM for selected row color

---

## 13. Visual Regression

**REQ-TH-VIS-01** — CI screenshots: default light, dark, alpine, pinned columns, selected rows.

**REQ-TH-VIS-02** — Viewport 1280×720; animations disabled; Docker font pinning.

**REQ-TH-VIS-03** — Baseline updates require PR review.

---

## 14. Non-Goals

- CSS-in-JS theme objects as primary API
- Automatic extraction from Tailwind config
- Per-row zebra striping as built-in (consumer via `rowClass` callback — Tier 2)
- AG Grid theme drop-in replacement without token mapping

---

## 15. Open Questions

| ID | Question | Recommendation |
|----|----------|----------------|
| OQ-TH-01 | Extract CSS from dom-renderer now vs later | Extract before Alpine to avoid duplication |
| OQ-TH-02 | `theme` option vs CSS-only | Both; option sets `data-ol-theme` |
| OQ-TH-03 | Alpine fidelity level | Header + borders + blues; not pixel-perfect |

---

*Authoritative for theming across renderers. CSS variable additions are minor semver; class renames are major.*

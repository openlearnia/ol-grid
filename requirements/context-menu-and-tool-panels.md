# Feature: Context Menu & Tool Panels

> **Status:** Draft  
> **Tier:** T3  
> **Package(s):** `@ol-grid/context-menu`, `@ol-grid/tool-panels`  
> **Parent:** [REQUIREMENTS.md](../REQUIREMENTS.md) §3.4, §4.3.4, T3-UI-01–03  
> **Architecture:** [ARCHITECTURE.md](../ARCHITECTURE.md) §3.8 (PluginHost)  
> **Last updated:** 2026-06-18

---

## 1. Summary

Context menus and side-bar tool panels are **Tier 3 UI accessories** that AG Grid reserves for Enterprise. ol-grid delivers them as optional MIT-licensed modules built on `GridPlugin` and `PluginHost`. The context menu module provides right-click (and keyboard-accessible) menus on cells, rows, and headers with built-in defaults plus custom items. The tool panels module provides a collapsible side bar housing column management and filter panels — the primary UX for show/hide columns, reorder, pin, and advanced filtering without enterprise licensing.

## 2. Goals

| ID | Goal |
|----|------|
| G-01 | Provide AG Grid–familiar context menu and sideBar/tool panel UX under MIT |
| G-02 | Allow apps to add, remove, and reorder menu items and panels declaratively and imperatively |
| G-03 | Integrate with column, filter, clipboard, and export modules without tight coupling |
| G-04 | Maintain full keyboard accessibility for menu navigation and panel focus |
| G-05 | Support custom framework components in menu items and panel bodies via adapters |
| G-06 | Keep UI logic in modules/plugins — not in core or framework adapters |

## 3. Non-Goals

| Item | Rationale |
|------|-----------|
| AG Grid Charts context menu integration | Charts out of scope v1 |
| Status bar component | App-level concern per REQUIREMENTS.md |
| Mobile long-press context menus as first-class | Desktop-first v1; touch context menu Should |
| Built-in chart / pivot drop zones beyond grouping panel | Pivot UI covered; charting N/A |

## 4. User Stories

| ID | As a… | I want… | So that… |
|----|-------|---------|----------|
| US-01 | Power user | right-click a cell to copy, export, or filter by value | I work efficiently without toolbar hunting |
| US-02 | Admin app user | a side panel to toggle column visibility | I customize my view without developer help |
| US-03 | Developer | `getContextMenuItems(params)` to customize menu | I add domain actions ("Approve", "Archive") |
| US-04 | Developer | `sideBar: { toolPanels: ['columns', 'filters'] }` | I enable panels declaratively |
| US-05 | a11y user | Shift+F10 or Menu key to open context menu on focused cell | I don't need a mouse |
| US-06 | AG Grid migrator | `sideBar` and `getContextMenuItems` to map directly | migration is straightforward |

## 5. Functional Requirements

### 5.1 Context Menu Module (`@ol-grid/context-menu`)

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| CM-01 | Register as `ContextMenuModule` / `GridPlugin` | Must | T3 |
| CM-02 | Open on `contextmenu` event (right-click) on cell, row, header | Must | T3 |
| CM-03 | Open via keyboard: Menu key or Shift+F10 on focused cell/header | Must | T3 |
| CM-04 | `getContextMenuItems?: (params) => (string \| MenuItemDef)[]` on GridOptions | Must | T3 |
| CM-05 | `api.showContextMenu({ x, y, rowIndex?, colKey?, items? })` imperative API | Should | T3 |
| CM-06 | Built-in items: Copy, Copy with Headers, Paste (if clipboard module), Export CSV, Export Excel (if excel module) | Must | T3 |
| CM-07 | Built-in items: Filter by value, Clear filter (if filter module) | Should | T3 |
| CM-08 | Built-in items: Sort Ascending, Sort Descending, Clear sort (if sort module) | Should | T3 |
| CM-09 | Separator items via `'separator'` string | Must | T3 |
| CM-10 | `MenuItemDef`: `name`, `icon?`, `disabled?`, `shortcut?`, `action`, `subMenu?` | Must | T3 |
| CM-11 | `defaultItems?: boolean \| string[]` to control which built-ins appear | Must | T3 |
| CM-12 | Menu closes on Escape, outside click, scroll, or grid destroy | Must | T3 |
| CM-13 | Only one context menu open per grid instance | Must | T3 |
| CM-14 | Menu positioned within viewport; flip if overflow | Must | T3 |
| CM-15 | `contextMenuVisible` / `onContextMenuVisibleChanged` for controlled mode | Could | T3 |
| CM-16 | `suppressContextMenu: boolean` on GridOptions | Must | T3 |
| CM-17 | `allowContextMenuWithControlKey: boolean` (Mac Ctrl+click) | Should | T3 |

### 5.2 Context Menu — accessibility

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| CM-A11Y-01 | Menu uses `role="menu"`, items use `role="menuitem"` | Must | T3 |
| CM-A11Y-02 | Arrow keys navigate items; Enter activates; Escape closes | Must | T3 |
| CM-A11Y-03 | Focus trap while menu open; restore focus to cell on close | Must | T3 |
| CM-A11Y-04 | Disabled items are focusable but not activatable, with `aria-disabled` | Must | T3 |
| CM-A11Y-05 | Screen reader announces menu context (column name, row index) | Should | T3 |

### 5.3 Tool Panels Module (`@ol-grid/tool-panels`)

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| TP-01 | Register as `ToolPanelsModule` | Must | T3 |
| TP-02 | `sideBar?: boolean \| SideBarDef` on GridOptions | Must | T3 |
| TP-03 | `SideBarDef.toolPanels: (string \| ToolPanelDef)[]` | Must | T3 |
| TP-04 | Built-in panel `columns`: show/hide, reorder (drag), pin left/right/none, group checkbox (if grouping) | Must | T3 |
| TP-05 | Built-in panel `filters`: list columns with active filters, expand filter UI per column | Must | T3 |
| TP-06 | Built-in panel `rowGroups` (if grouping): drag columns to group, reorder group hierarchy | Should | T3 |
| TP-07 | `defaultToolPanel?: string` — panel open on load | Should | T3 |
| TP-08 | `hiddenByDefault?: boolean` — side bar collapsed until toggled | Should | T3 |
| TP-09 | `api.openToolPanel(key)` / `api.closeToolPanel()` / `api.getOpenedToolPanel()` | Must | T3 |
| TP-10 | `api.setSideBarVisible(visible: boolean)` / `api.isSideBarVisible()` | Must | T3 |
| TP-11 | `api.refreshToolPanel(key?)` after external column/filter changes | Should | T3 |
| TP-12 | Custom `ToolPanelDef`: `id`, `label`, `icon`, `component` (framework component) | Must | T3 |
| TP-13 | Side bar position: `sideBar.position: 'left' \| 'right'` (default right, AG Grid parity) | Must | T3 |
| TP-14 | Side bar resizable via drag handle | Should | T3 |
| TP-15 | `sideBar.width` default and min/max constraints | Should | T3 |
| TP-16 | Emit `toolPanelVisibleChanged`, `columnVisibleChanged` (from panel actions) | Must | T3 |

### 5.4 Tool Panels — Columns panel detail

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| TP-COL-01 | List all columns (respecting group hierarchy) with visibility checkbox | Must | T3 |
| TP-COL-02 | Search/filter column list by name | Should | T3 |
| TP-COL-03 | Drag to reorder columns in panel → updates column state | Must | T3 |
| TP-COL-04 | Pin icon or dropdown per column | Must | T3 |
| TP-COL-05 | Select all / deselect all visibility | Should | T3 |
| TP-COL-06 | `lockVisible` columns cannot be hidden (disabled checkbox) | Must | T3 |
| TP-COL-07 | Changes sync with `applyColumnState` and header drag | Must | T3 |

### 5.5 Tool Panels — Filters panel detail

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| TP-FL-01 | List only `filterable` columns | Must | T3 |
| TP-FL-02 | Indicate active filter state per column | Must | T3 |
| TP-FL-03 | Expand row to show embedded filter component (reuse filter module UI) | Must | T3 |
| TP-FL-04 | "Clear all filters" action | Must | T3 |
| TP-FL-05 | Set filter support (if SetFilterModule) in panel | Should | T3 |

### 5.6 Integration with other modules

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| CM-INT-01 | Clipboard items no-op with tooltip if ClipboardModule missing | Must | T3 |
| CM-INT-02 | Export items no-op if export not available | Must | T3 |
| CM-INT-03 | Filter/sort built-ins delegate to FilterModule/SortModule APIs | Must | T3 |
| TP-INT-01 | ToolPanelsModule declares dependency on FilterModule for filters panel | Must | T3 |
| TP-INT-02 | Columns panel works with core ColumnApi only (no extra deps) | Must | T3 |

## 6. API Surface

### 6.1 GridOptions additions

```typescript
interface GridOptions<TData = unknown> {
  // Context menu
  suppressContextMenu?: boolean;
  allowContextMenuWithControlKey?: boolean;
  getContextMenuItems?: (params: GetContextMenuItemsParams<TData>) => (string | MenuItemDef)[];

  // Side bar / tool panels
  sideBar?: boolean | SideBarDef;
}

interface MenuItemDef {
  name: string;
  icon?: string;
  disabled?: boolean;
  shortcut?: string;
  action?: (params: MenuItemParams) => void;
  subMenu?: (string | MenuItemDef)[];
  cssClasses?: string[];
  tooltip?: string;
}

interface GetContextMenuItemsParams<TData = unknown> {
  api: GridApi<TData>;
  column: Column | null;
  colDef: ColDef<TData> | null;
  node: RowNode<TData> | null;
  value: unknown;
  event: MouseEvent | KeyboardEvent;
  defaultItems: string[];
}

interface SideBarDef {
  toolPanels: (string | ToolPanelDef)[];
  defaultToolPanel?: string;
  hiddenByDefault?: boolean;
  position?: 'left' | 'right';
  width?: number;
}

interface ToolPanelDef {
  id: string;
  label: string;
  icon?: string;
  component: string | ComponentDef;
  width?: number;
}
```

### 6.2 GridApi additions (via module augmentation)

```typescript
interface GridApi {
  // Context menu
  showContextMenu(params: ShowContextMenuParams): void;
  hideContextMenu(): void;

  // Tool panels
  openToolPanel(key: string): void;
  closeToolPanel(): void;
  getOpenedToolPanel(): string | null;
  setSideBarVisible(visible: boolean): void;
  isSideBarVisible(): boolean;
  refreshToolPanel(key?: string): void;
}
```

### 6.3 Events

| Event | Payload | When |
|-------|---------|------|
| `contextMenuOpened` | `{ items, position, node, column }` | Menu shown |
| `contextMenuClosed` | `{ reason: 'escape' \| 'click' \| 'action' }` | Menu dismissed |
| `toolPanelVisibleChanged` | `{ visible, toolPanelId }` | Panel toggled |
| `sideBarVisibleChanged` | `{ visible }` | Side bar show/hide |

## 7. Behavior & Edge Cases

| Scenario | Expected behavior |
|----------|-------------------|
| Right-click during cell edit | Menu opens; edit cancelled or committed per `stopEditingWhenCellsLoseFocus` option |
| `getContextMenuItems` returns empty array | No menu shown |
| `getContextMenuItems` returns only custom items, `defaultItems: true` | Prepend or append defaults per `defaultItems` config |
| Side bar open + grid resize | Panel width respects min viewport; side bar can collapse |
| Column hidden via panel while filtered | Filter remains; column hidden from view |
| Destroy grid with menu open | Menu unmounted; no portal leak |
| SSR / no DOM | Modules not loaded; options stored for hydration |
| RTL layout | Side bar `position` mirrors; menu flips horizontally |
| Custom tool panel component | Adapter mounts framework component in panel slot |

## 8. Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-CM-01 | Context menu open latency | ≤ 50 ms from right-click |
| NFR-CM-02 | `@ol-grid/context-menu` gzip | ≤ 12 KB |
| NFR-TP-01 | `@ol-grid/tool-panels` gzip | ≤ 20 KB (excl. filter UI deps) |
| NFR-CM-03 | Menu keyboard navigation | WCAG 2.1 AA |
| NFR-TP-02 | Columns panel with 200 columns | Scroll and search remain responsive (< 100 ms interaction) |
| NFR-CM-04 | z-index stacking | Menu above grid editors; below app modals (configurable `popupParent`) |

## 9. Dependencies

| Dependency | Type | Notes |
|------------|------|-------|
| `@ol-grid/core` | Required | GridApi, ColumnModel, EventBus |
| `@ol-grid/dom-renderer` | Required | Overlay mounting, popup parent |
| `plugin-module-system.md` | Required | GridPlugin / PluginHost |
| `@ol-grid/filter` | Required for filters panel | Soft dep — panel hidden if missing |
| `@ol-grid/sort` | Optional | Sort items in context menu |
| `@ol-grid/clipboard` | Optional | Copy/paste menu items |
| `@ol-grid/grouping` | Optional | Row groups panel |
| Framework adapters | Required | Custom component mounting |

## 10. Acceptance Criteria

- [ ] Right-click cell shows menu with Copy when ClipboardModule registered
- [ ] `getContextMenuItems` can add custom item that calls `api.exportDataAsCsv()`
- [ ] Keyboard Menu key opens context menu on focused cell with full arrow navigation
- [ ] `sideBar: { toolPanels: ['columns', 'filters'] }` renders functional side bar
- [ ] Columns panel toggle visibility updates grid; state persists via `getColumnState()`
- [ ] Filters panel expand shows same filter UI as column header filter
- [ ] `api.openToolPanel('columns')` works imperatively
- [ ] axe-core: zero violations on menu and side bar scenarios
- [ ] Vue and React custom tool panel component mounts and receives `api` prop
- [ ] Bundle: modules tree-shake when not imported

## 11. Test Plan

| Test type | Coverage |
|-----------|----------|
| Unit | Menu item resolution, defaultItems merge, separator handling |
| Unit | SideBarDef normalization, panel registry |
| Integration | Right-click → action → API side effect (copy, sort) |
| Integration | Columns panel drag reorder → column order in grid |
| a11y | Keyboard menu navigation, focus restore, axe-core |
| Visual | Menu positioning at viewport edges, RTL side bar |

## 12. Migration Notes (AG Grid)

| AG Grid API | ol-grid equivalent | Breaking? |
|-------------|-------------------|-----------|
| `getContextMenuItems` | `getContextMenuItems` | No |
| `allowContextMenuWithControlKey` | Same | No |
| `sideBar` | `sideBar` | No |
| `toolPanel` component interface | `ToolPanelDef.component` | Minor props diff |
| `statusBar` | Not implemented | Yes — app-level |
| Enterprise-only menu items (chart range) | N/A | Yes |

## 13. Open Questions

| # | Question | Options | Decision |
|---|----------|---------|----------|
| OQ-1 | `popupParent` option for menu/panel portal target | document.body / grid host | Default grid host |
| OQ-2 | Merge context menu + tool panels into one `@ol-grid/ui` package | Separate / merged | Separate (tree-shaking) |
| OQ-3 | Column menu (header dropdown) vs context menu overlap | Share item builder / separate | Share `MenuItemFactory` internally |

## 14. References

- [REQUIREMENTS.md](../REQUIREMENTS.md) §3.4, §4.3.4 (T3-UI-01–03)
- [ARCHITECTURE.md](../ARCHITECTURE.md) §3.8
- [plugin-module-system.md](./plugin-module-system.md)
- [grid-api-and-events.md](./grid-api-and-events.md)
- [AG Grid Context Menu](https://www.ag-grid.com/javascript-data-grid/context-menu/)
- [AG Grid Side Bar](https://www.ag-grid.com/javascript-data-grid/side-bar/)

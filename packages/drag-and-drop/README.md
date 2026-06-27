# @ol-grid/drag-and-drop

Framework-agnostic drag-and-drop for sortable lists. This package vendors [FormKit drag-and-drop](https://github.com/formkit/drag-and-drop) (MIT) as `@ol-grid/drag-and-drop` for use across the ol-grid monorepo and downstream apps.

## License

FormKit, Inc. — see [LICENSE](./LICENSE). ol-grid modifications are also MIT.

## Install

Workspace package — depend via `workspace:*` in the monorepo:

```json
{
  "dependencies": {
    "@ol-grid/drag-and-drop": "workspace:*"
  }
}
```

## Usage (vanilla)

```ts
import { dragAndDrop } from "@ol-grid/drag-and-drop";

const list = document.querySelector("#list")!;
const items = ["a", "b", "c"];

dragAndDrop({
  parent: list,
  getValues: () => items,
  setValues: (next) => {
    items.length = 0;
    items.push(...next);
    render();
  },
});
```

## Framework entry points

| Import | Peer dependency |
|--------|-----------------|
| `@ol-grid/drag-and-drop/react` | `react` >= 18 |
| `@ol-grid/drag-and-drop/vue` | `vue` >= 3.4 |
| `@ol-grid/drag-and-drop/solid` | `solid-js` >= 1.8 |

```ts
import { useDragAndDrop } from "@ol-grid/drag-and-drop/react";
```

Plugins (`animations`, `insert`, `dropOrSwap`) are re-exported from the core entry — see FormKit docs at https://drag-and-drop.formkit.com.

## ol-grid column reorder integration (planned)

`@ol-grid/dom-renderer` currently implements column header drag with a bespoke mousemove/mouseup flow that calls `engine.moveColumn(colId, toIndex, "uiColumnMoved")`. That keeps column order owned by `@ol-grid/core` (pinned regions, `suppressMovable`, grouped headers).

**Integration point:** A future refactor could use this package for row reordering, external drop targets, or a simplified center-panel column list — but column headers are not a flat parent/child list (pinned left/center/right, group headers), so the existing dom-renderer transport layer remains the right fit for column move until we add a dedicated `columnReorder` plugin or header-row adapter.

Suggested hook when wiring:

1. On `onSort` / `onDragend`, map DOM indices to column-model indices per pinned region.
2. Call `gridApi.moveColumn(fromColId, toIndex)` — never mutate column defs directly from DnD callbacks.
3. Respect `suppressMovable` and `lockPosition` via `draggable` / `dragHandle` config on header cells.

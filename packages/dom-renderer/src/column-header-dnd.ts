import {
  dragAndDrop,
  handleEnd,
  isDragState,
  nodes,
  parents,
  sort,
  state,
  tearDown,
} from "@ol-grid/drag-and-drop";
import type { GridEngine } from "@ol-grid/core";
import type { ColumnPinRegion } from "./column-header-drag.js";
import { COLUMN_DRAGGING_CLASS } from "./column-header-drag.js";

export const COLUMN_HEADER_DRAG_HANDLE = ".ol-grid__header-label";

export interface ColumnHeaderDnDCallbacks {
  onDragFinished?: () => void;
}

export interface ColumnHeaderDnDRefreshParams {
  headerPinnedLeft: HTMLElement;
  headerCenterScroll: HTMLElement;
  headerPinnedRight: HTMLElement;
  headerRowCount: number;
}

export interface ColumnHeaderDnDController {
  isDragActive(): boolean;
  refresh(params: ColumnHeaderDnDRefreshParams): void;
  destroy(): void;
}

function pinRegionForColumn(
  pinned: "left" | "right" | null | undefined,
): ColumnPinRegion {
  if (pinned === "left") return "left";
  if (pinned === "right") return "right";
  return "center";
}

export function getMovableRegionColIds(
  engine: GridEngine,
  region: ColumnPinRegion,
): string[] {
  if (engine.getOptions().suppressColumnMove) return [];

  return engine
    .getColumnModel()
    .getColumns()
    .filter((column) => !column.isSelectionColumn)
    .filter((column) => pinRegionForColumn(column.pinned) === region)
    .filter((column) => !column.def.suppressMovable && !column.def.lockPosition)
    .map((column) => column.colId);
}

function isDraggableHeaderCell(engine: GridEngine, el: HTMLElement): boolean {
  const colId = el.dataset.colId;
  if (!colId || colId === "__selection__") return false;
  if (el.getAttribute("role") !== "columnheader") return false;

  const column = engine.getColumnModel().getByColId(colId);
  if (!column || column.isSelectionColumn) return false;
  if (engine.getOptions().suppressColumnMove) return false;
  if (column.def.suppressMovable || column.def.lockPosition) return false;
  return true;
}

function getLeafHeaderDnDParent(
  container: HTMLElement,
  useGrid: boolean,
): HTMLElement | null {
  if (useGrid) return container;

  const rows = container.querySelectorAll<HTMLElement>(".ol-grid__header-row");
  if (rows.length === 0) return null;
  return rows[rows.length - 1] ?? null;
}

function resolveMovedColId(
  engine: GridEngine,
  region: ColumnPinRegion,
  oldRegionColIds: string[],
  newRegionColIds: string[],
): string | undefined {
  if (isDragState(state) && state.draggedNodes.length > 0) {
    return String(state.draggedNodes[0]!.data.value);
  }

  const oldIndexById = new Map(oldRegionColIds.map((id, index) => [id, index]));
  let maxDistance = 0;
  let movedColId: string | undefined;

  for (let index = 0; index < newRegionColIds.length; index++) {
    const colId = newRegionColIds[index]!;
    const oldIndex = oldIndexById.get(colId);
    if (oldIndex == null) continue;
    const distance = Math.abs(oldIndex - index);
    if (distance > maxDistance) {
      maxDistance = distance;
      movedColId = colId;
    }
  }

  return movedColId;
}

function applyRegionColumnOrder(
  engine: GridEngine,
  region: ColumnPinRegion,
  newRegionColIds: string[],
  finished: boolean,
): void {
  const oldRegionColIds = getMovableRegionColIds(engine, region);
  if (oldRegionColIds.join("\0") === newRegionColIds.join("\0")) return;

  const movedColId = resolveMovedColId(engine, region, oldRegionColIds, newRegionColIds);
  if (!movedColId) return;

  const newIndex = newRegionColIds.indexOf(movedColId);
  if (newIndex < 0) return;

  engine.moveColumn(movedColId, newIndex, "uiColumnMoved", { finished });
}

function dragEventWithCoordinates(
  type: string,
  clientX: number,
  clientY: number,
  dataTransfer?: DataTransfer,
): DragEvent {
  const event = new DragEvent(type, {
    bubbles: true,
    cancelable: true,
    dataTransfer,
  });
  Object.defineProperty(event, "clientX", { configurable: true, value: clientX });
  Object.defineProperty(event, "clientY", { configurable: true, value: clientY });
  return event;
}

export function createColumnHeaderDnDController(
  engine: GridEngine,
  callbacks: ColumnHeaderDnDCallbacks = {},
): ColumnHeaderDnDController {
  const parentsByRegion = new Map<ColumnPinRegion, HTMLElement>();
  let pendingFinalize: { colId: string; toIndex: number } | null = null;

  function setRegionColumnOrder(region: ColumnPinRegion, newIds: string[]): void {
    if (!Array.isArray(newIds)) return;

    const normalized = newIds.filter((id): id is string => typeof id === "string");
    const oldRegionColIds = getMovableRegionColIds(engine, region);
    const finished = !isDragState(state);
    applyRegionColumnOrder(engine, region, normalized, finished);

    if (isDragState(state)) {
      const movedColId = resolveMovedColId(engine, region, oldRegionColIds, normalized);
      if (movedColId) {
        const toIndex = normalized.indexOf(movedColId);
        if (toIndex >= 0) {
          pendingFinalize = { colId: movedColId, toIndex };
        }
      }
    }
  }

  function finalizeDragMove(): void {
    if (!pendingFinalize) return;
    engine.finalizeColumnMove(pendingFinalize.colId, pendingFinalize.toIndex);
    pendingFinalize = null;
  }

  function mountRegion(
    region: ColumnPinRegion,
    container: HTMLElement,
    useGrid: boolean,
  ): void {
    const parent = getLeafHeaderDnDParent(container, useGrid);
    if (!parent) return;

    // Re-mounting during an active drag calls tearDown → resetState and breaks handleEnd.
    if (isDragState(state) && parentsByRegion.get(region) === parent) return;

    const previous = parentsByRegion.get(region);
    if (previous && previous !== parent) {
      tearDown(previous);
    }
    parentsByRegion.set(region, parent);

    dragAndDrop<string>({
      parent,
      getValues: () => getMovableRegionColIds(engine, region),
      setValues: (newIds) => setRegionColumnOrder(region, newIds),
      config: {
        dragHandle: COLUMN_HEADER_DRAG_HANDLE,
        draggingClass: COLUMN_DRAGGING_CLASS,
        disabled: engine.getOptions().suppressColumnMove,
        draggable: (el) => isDraggableHeaderCell(engine, el),
        onDragend: () => {
          finalizeDragMove();
          callbacks.onDragFinished?.();
        },
      },
    });
  }

  return {
    isDragActive() {
      return isDragState(state);
    },
    refresh({
      headerPinnedLeft,
      headerCenterScroll,
      headerPinnedRight,
      headerRowCount,
    }) {
      const useGrid = headerRowCount > 1;
      mountRegion("left", headerPinnedLeft, useGrid);
      mountRegion("center", headerCenterScroll, useGrid);
      mountRegion("right", headerPinnedRight, useGrid);
    },
    destroy() {
      pendingFinalize = null;
      for (const parent of parentsByRegion.values()) {
        tearDown(parent);
      }
      parentsByRegion.clear();
    },
  };
}

/**
 * Test helper — simulates hovering while dragging (performSort) without drop.
 */
export function simulateColumnHeaderDragOver(
  headerCell: HTMLElement,
  options: { fromX: number; fromY: number; toX: number; toY: number },
  targetHeaderCell?: HTMLElement,
): void {
  const label = headerCell.querySelector<HTMLElement>(COLUMN_HEADER_DRAG_HANDLE);
  if (!label) {
    throw new Error("Column header drag handle not found");
  }

  const dropTarget = targetHeaderCell ?? headerCell;
  const parentEl = dropTarget.parentElement;
  if (!parentEl) {
    throw new Error("Column header drag parent not found");
  }

  const parentData = parents.get(parentEl);
  const targetNodeData = nodes.get(dropTarget as never);
  if (!parentData || !targetNodeData) {
    throw new Error("Column header drag nodes are not registered with drag-and-drop");
  }

  const { fromX, fromY, toX, toY } = options;
  const pointerId = 1;
  const dataTransfer = new DataTransfer();

  label.dispatchEvent(
    new PointerEvent("pointerdown", {
      bubbles: true,
      clientX: fromX,
      clientY: fromY,
      pointerId,
      button: 0,
      isPrimary: true,
    }),
  );

  headerCell.draggable = true;

  headerCell.dispatchEvent(
    dragEventWithCoordinates("dragstart", fromX, fromY, dataTransfer),
  );

  if (!isDragState(state)) {
    throw new Error("Column header drag did not start");
  }

  const dragEventData = {
    e: dragEventWithCoordinates("dragover", toX, toY, dataTransfer),
    targetData: {
      node: { el: dropTarget, data: targetNodeData },
      parent: { el: parentEl, data: parentData },
    },
  };

  sort(dragEventData as Parameters<typeof sort>[0], state);
}

/**
 * Test helper — simulates column header drag via the label handle.
 * happy-dom does not populate DragEvent.clientX/clientY, so after dragstart
 * we invoke FormKit sort() with coordinate-patched events.
 */
export function simulateColumnHeaderDrag(
  headerCell: HTMLElement,
  options: { fromX: number; fromY: number; toX: number; toY: number },
  targetHeaderCell?: HTMLElement,
): void {
  simulateColumnHeaderDragOver(headerCell, options, targetHeaderCell);

  const dropTarget = targetHeaderCell ?? headerCell;
  const { toX, toY } = options;
  const dataTransfer = new DataTransfer();

  dropTarget.dispatchEvent(dragEventWithCoordinates("drop", toX, toY, dataTransfer));
  headerCell.dispatchEvent(dragEventWithCoordinates("dragend", toX, toY, dataTransfer));

  if (isDragState(state)) {
    handleEnd(state);
  }
}

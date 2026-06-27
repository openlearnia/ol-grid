import type { GridEngine, RenderFrame } from "@ol-grid/core";
import { getCellValue } from "@ol-grid/core";
import {
  createElement,
  useEffect,
  useState,
  type ComponentType,
  type ReactPortal,
} from "react";
import { createPortal } from "react-dom";

export interface CellEditorPortalEntry {
  key: string;
  portal: ReactPortal;
}

function editorPortalKey(rowIndex: number, colId: string): string {
  return `edit:${rowIndex}:${colId}`;
}

function isReactComponentType(value: unknown): value is ComponentType<Record<string, unknown>> {
  return typeof value === "function";
}

export function useCellEditorPortals<TData>(
  engine: GridEngine<TData>,
  renderer: { getEditorHost(): HTMLElement } | null,
): CellEditorPortalEntry[] {
  const [portals, setPortals] = useState<CellEditorPortalEntry[]>([]);

  useEffect(() => {
    const syncPortals = () => {
      if (!renderer) {
        setPortals([]);
        return;
      }

      const frame = engine.getLastFrame();
      if (!frame) {
        setPortals([]);
        return;
      }

      const next = buildEditorPortalsFromFrame(frame, engine, renderer);
      setPortals(next);
    };

    syncPortals();
    return engine.getStore().subscribe(syncPortals);
  }, [engine, renderer]);

  return portals;
}

export function buildEditorPortalsFromFrame<TData>(
  frame: RenderFrame,
  engine: GridEngine<TData>,
  renderer: { getEditorHost(): HTMLElement },
): CellEditorPortalEntry[] {
  const editing = frame.editing;
  if (!editing) return [];

  const editingCell = frame.rows
    .find((row) => row.rowIndex === editing.activeCell.rowIndex)
    ?.cells.find((cell) => cell.colId === editing.activeCell.colId);

  if (!editingCell?.useFrameworkEditor || !editingCell.frameworkEditor) return [];

  const Component = editingCell.frameworkEditor;
  if (!isReactComponentType(Component)) return [];

  const colDef = engine.getColumnModel().getByColId(editing.activeCell.colId)?.def;
  const node = engine.getRowModel().getRowAt(editing.activeCell.rowIndex);
  if (!colDef || !node) return [];

  const api = engine.getApi();
  const context = engine.getOptions().context ?? null;
  const host = renderer.getEditorHost();
  const key = editorPortalKey(editing.activeCell.rowIndex, editing.activeCell.colId);
  const value = getCellValue(node, colDef, api, context);

  return [
    {
      key,
      portal: createPortal(
        createElement(Component, {
          value,
          data: node.data,
          node,
          colDef,
          api,
          context,
          rowIndex: editing.activeCell.rowIndex,
          stopEditing: (cancel = false) => {
            engine.stopEditing(cancel);
          },
          onValueChange: (nextValue: unknown) => {
            const text =
              nextValue === null || nextValue === undefined ? "" : String(nextValue);
            engine.updateEditValue(text);
          },
          ...(editingCell.cellEditorParams ?? {}),
        }),
        host,
        key,
      ),
    },
  ];
}

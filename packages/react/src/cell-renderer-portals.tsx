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

export interface CellPortalEntry {
  key: string;
  portal: ReactPortal;
}

function cellPortalKey(rowIndex: number, colId: string): string {
  // Virtualized rows reuse DOM — key by data position, not row node id.
  return `${rowIndex}:${colId}`;
}

function isReactComponentType(value: unknown): value is ComponentType<Record<string, unknown>> {
  return typeof value === "function";
}

export function useCellRendererPortals<TData>(
  engine: GridEngine<TData>,
  renderer: { getCellHost(position: { rowIndex: number; colId: string }): HTMLElement } | null,
): CellPortalEntry[] {
  const [portals, setPortals] = useState<CellPortalEntry[]>([]);

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

      const next = buildPortalsFromFrame(frame, engine, renderer);
      setPortals(next);
    };

    syncPortals();
    return engine.getStore().subscribe(syncPortals);
  }, [engine, renderer]);

  return portals;
}

export function buildPortalsFromFrame<TData>(
  frame: RenderFrame,
  engine: GridEngine<TData>,
  renderer: { getCellHost(position: { rowIndex: number; colId: string }): HTMLElement },
): CellPortalEntry[] {
  const api = engine.getApi();
  const context = engine.getOptions().context ?? null;
  const entries: CellPortalEntry[] = [];

  for (const row of frame.rows) {
    for (const cell of row.cells) {
      if (!cell.useFrameworkRenderer || !cell.frameworkRenderer) continue;

      const Component = cell.frameworkRenderer;
      if (!isReactComponentType(Component)) continue;

      const colDef = engine.getColumnModel().getByColId(cell.colId)?.def;
      const node = engine.getRowModel().getRowAt(row.rowIndex);
      if (!colDef || !node) continue;

      const host = renderer.getCellHost({ rowIndex: row.rowIndex, colId: cell.colId });
      const value = getCellValue(node, colDef, api, context);
      const key = cellPortalKey(row.rowIndex, cell.colId);

      entries.push({
        key,
        portal: createPortal(
          createElement(Component, {
            value,
            data: node.data,
            node,
            colDef,
            api,
            context,
            rowIndex: row.rowIndex,
            ...(cell.cellRendererParams ?? {}),
          }),
          host,
          key,
        ),
      });
    }
  }

  return entries;
}
